import { 
  INotificationRepository 
} from "../repositories/notification.repository";
import { 
  IEmailProvider, 
  IWhatsAppProvider 
} from "./provider.service";
import { getAdminSupabase } from "@/lib/supabase";
import { StudentPortalService } from "@/domain/student-portal/services/student-portal.service";

export class NotificationPreferencesService {
  constructor(private repository: INotificationRepository) {}

  async isChannelEnabled(studentId: string, channel: string): Promise<boolean> {
    const prefs = await this.repository.getStudentPreferences(studentId);
    const channelPref = prefs.find(p => p.channel.toLowerCase() === channel.toLowerCase());
    return channelPref ? channelPref.isEnabled : true; // Enabled by default
  }
}

export class ReminderEngine {
  constructor(private repository: INotificationRepository) {}

  async evaluateComplianceAndQueueAlerts(triggerSource: "cron_scheduler" | "event_handler"): Promise<void> {
    console.log(`[REMINDER_ENGINE] Starting compliance scanning evaluations triggered by ${triggerSource}...`);
    
    const rules = await this.repository.getReminderRules();
    const supabase = getAdminSupabase();
    
    // Query active student compliance snapshots
    const { data: snapshots, error } = await supabase
      .from("student_snapshot")
      .select("student_id, passport_status, passport_expiry, visa_status, visa_expiry, efrro_status, efrro_expiry, days_until_expiry");

    if (error || !snapshots) {
      console.error("[REMINDER_ENGINE_ERROR] Failed to load student snapshots:", error?.message);
      return;
    }

    for (const snap of snapshots) {
      const studentId = snap.student_id;
      
      // Load student profile details to resolve contact email/phone references
      const { data: student, error: sError } = await supabase
        .from("student_personal")
        .select("full_name, preferred_language")
        .eq("student_id", studentId)
        .single();
        
      const { data: studentAccount, error: saError } = await supabase
        .from("students")
        .select("email, phone")
        .eq("id", studentId)
        .single();

      if (sError || saError || !student || !studentAccount) continue;

      // Evaluate rules against document status dates
      for (const rule of rules) {
        let expiryDate: string | null = null;
        let documentStatus: string | null = null;
        if (rule.documentType === "passport") {
          expiryDate = snap.passport_expiry;
          documentStatus = snap.passport_status;
        } else if (rule.documentType === "visa") {
          expiryDate = snap.visa_expiry;
          documentStatus = snap.visa_status;
        } else if (rule.documentType === "efrro") {
          expiryDate = snap.efrro_expiry;
          documentStatus = snap.efrro_status;
        }

        if (!expiryDate || documentStatus === "COMPLIANT") continue;

        // Calculate offset difference
        const daysLeft = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        // Match alert rule triggers
        if (daysLeft === rule.alertThresholdDays) {
          const prefLang = student.preferred_language || "en";
          let template = await this.repository.getActiveTemplate("EXPIRY_ALERT", prefLang);
          if (!template && prefLang !== "en") {
            template = await this.repository.getActiveTemplate("EXPIRY_ALERT", "en");
          }
          if (!template) continue;

          // Check communication channel details
          const channel = rule.channel;
          const address = channel === "email" ? studentAccount.email : studentAccount.phone || "N/A";
          
          // Enforce idempotency key mapping to prevent duplicates: studentId:docType:thresholdDays:channel
          const key = `${studentId}:${rule.documentType}:${rule.alertThresholdDays}:${channel}`;

          // Generate secure upload token for eFRRO reminder alerts
          let secureUploadLink = "";
          if (rule.documentType === "efrro") {
            try {
              const portalService = new StudentPortalService();
              const token = await portalService.generateUploadToken(studentId, "UPLOAD");
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
              secureUploadLink = `${baseUrl}/student/upload/${token}`;
            } catch (err) {
              console.error("[REMINDER_ENGINE_ERROR] Failed generating secure upload token:", err);
            }
          }

          try {
            await this.repository.queueNotification({
              studentId,
              templateId: template.id,
              documentType: rule.documentType,
              status: "queued",
              channel,
              recipientAddress: address,
              triggerSource,
              idempotencyKey: key,
              notificationContext: {
                student_name: student.full_name,
                document_type: rule.documentType,
                days_left: String(daysLeft),
                expiry_date: expiryDate,
                secure_upload_link: secureUploadLink
              }
            });
          } catch (e) {
            // In case of duplicate key insert exceptions, catch silently to prevent execution halts
            const msg = e instanceof Error ? e.message : String(e);
            console.log(`[REMINDER_ENGINE_INFO] Duplicate alert rejected by idempotency key: ${key}. Details: ${msg}`);
          }
        }
      }
    }
  }
}

export class QueueProcessor {
  private prefsService: NotificationPreferencesService;

  constructor(
    private repository: INotificationRepository,
    private emailProvider: IEmailProvider,
    private whatsappProvider: IWhatsAppProvider
  ) {
    this.prefsService = new NotificationPreferencesService(repository);
  }

  private interpolateTemplate(template: string, vars: Record<string, unknown>): string {
    let result = template;
    for (const key in vars) {
      result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), String(vars[key]));
    }
    return result;
  }

  async processPendingQueue(batchSize: number): Promise<{ processed: number; failures: number }> {
    console.log(`[QUEUE_PROCESSOR] Initiating queue batch processing execution (limit: ${batchSize})...`);
    
    // Fetch pending notifications
    const pending = await this.repository.getPendingNotifications(batchSize);
    let processed = 0;
    let failures = 0;

    for (const alert of pending) {
      try {
        // 1. Verify Preferences
        const enabled = await this.prefsService.isChannelEnabled(alert.studentId, alert.channel);
        if (!enabled) {
          console.log(`[QUEUE_PROCESSOR] Skipping notification ${alert.id} - Channel ${alert.channel} disabled in preferences.`);
          await this.repository.updateNotificationStatus(alert.id, "cancelled");
          continue;
        }

        // 2. Lock notification state to sending
        await this.repository.updateNotificationStatus(alert.id, "sending");

        // 3. Resolve active templates
        let body = alert.idempotencyKey;
        let subject = "ISCMS Compliance Reminder Alert";
        
        if (alert.templateId) {
          // Mock resolve template from cache or DB repository
          const supabase = getAdminSupabase();
          const { data: tData } = await supabase
            .from("notification_templates")
            .select("*")
            .eq("id", alert.templateId)
            .single();

          if (tData) {
            body = this.interpolateTemplate(tData.body_template, alert.notificationContext);
            subject = tData.subject_template ? this.interpolateTemplate(tData.subject_template, alert.notificationContext) : subject;
          }
        }

        // 4. Submit to Gateway adapters
        let result: { success: boolean; gatewayId?: string; error?: string } = { success: false };
        
        if (alert.channel.toLowerCase() === "email" || alert.channel.toLowerCase() === "both") {
          result = await this.emailProvider.sendEmail(alert.recipientAddress, subject, body);
        } else {
          result = await this.whatsappProvider.sendWhatsApp(alert.recipientAddress, body);
        }

        // 5. Update outcome log
        if (result.success) {
          await this.repository.updateNotificationStatus(alert.id, "sent");
          await this.repository.logDeliveryAttempt({
            notificationId: alert.id,
            attemptNumber: alert.retryCount + 1,
            status: "sent",
            gatewayResponse: { gateway_id: result.gatewayId || "mock-gate-id" },
            errorMessage: null
          });
          processed++;
        } else {
          throw new Error(result.error || "Gateway connection failed");
        }

      } catch (error) {
        failures++;
        const nextAttempt = alert.retryCount + 1;
        const errMsg = error instanceof Error ? error.message : String(error);
        
        console.error(`[QUEUE_PROCESSOR_ERROR] Failed sending notification ${alert.id}: ${errMsg}`);
        
        await this.repository.logDeliveryAttempt({
          notificationId: alert.id,
          attemptNumber: nextAttempt,
          status: "failed",
          gatewayResponse: {},
          errorMessage: errMsg
        });

        if (nextAttempt >= alert.maxRetries) {
          await this.repository.updateNotificationStatus(alert.id, "failed", nextAttempt, null);
        } else {
          // Exponential backoff retry timer
          const backoff = new Date(Date.now() + 5 * 60 * 1000 * Math.pow(2, alert.retryCount));
          await this.repository.updateNotificationStatus(alert.id, "queued", nextAttempt, backoff);
        }
      }
    }

    return { processed, failures };
  }
}
