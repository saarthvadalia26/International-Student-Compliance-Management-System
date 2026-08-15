import { 
  INotificationRepository 
} from "../repositories/notification.repository";
import { 
  INotificationProvider,
  ProviderResponse
} from "../types/provider.types";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { StudentPortalService } from "@/domain/student-portal/services/student-portal.service";
import crypto from "crypto";

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

      // Evaluate rules against document status dates - automated expiry reminders are only generated for eFRRO
      for (const rule of rules) {
        if (rule.documentType !== "efrro") continue;

        const expiryDate: string | null = snap.efrro_expiry;
        const documentStatus: string | null = snap.efrro_status;

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
    private emailProvider: INotificationProvider,
    private whatsappProvider: INotificationProvider
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
      const correlationId = crypto.randomUUID();
      const startTime = Date.now();
      let activeProvider: INotificationProvider | null = null;
      const activeChannel = alert.channel.toLowerCase();

      try {
        // 1. Verify Preferences
        const enabled = await this.prefsService.isChannelEnabled(alert.studentId, alert.channel);
        if (!enabled) {
          console.log(`[QUEUE_PROCESSOR] Skipping notification ${alert.id} - Channel ${alert.channel} disabled in preferences.`);
          await this.repository.updateNotificationStatus(alert.id, "cancelled");
          continue;
        }

        // 2. Lock notification state to processing
        await this.repository.updateNotificationStatus(alert.id, "processing");

        // 3. Resolve active templates
        let body = alert.idempotencyKey;
        let subject = "ISCMS Compliance Reminder Alert";
        
        if (alert.templateId) {
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
        let result: ProviderResponse = { success: false };
        
        if (activeChannel === "email" || activeChannel === "both") {
          activeProvider = this.emailProvider;
          result = await this.emailProvider.sendEmail(alert.recipientAddress, subject, body);
        } else {
          activeProvider = this.whatsappProvider;
          result = await this.whatsappProvider.sendWhatsApp(alert.recipientAddress, body);
        }

        const latencyMs = result.latencyMs || (Date.now() - startTime);

        // 5. Update outcome log
        if (result.success) {
          await this.repository.updateNotificationStatus(alert.id, "sent");
          await this.repository.logDeliveryAttempt({
            notificationId: alert.id,
            attemptNumber: alert.retryCount + 1,
            status: "sent",
            gatewayResponse: (result.rawResponse as Record<string, unknown>) || { gateway_id: result.gatewayId || "unknown-gateway-id" },
            errorMessage: null,
            latencyMs,
            providerName: activeProvider?.name || "unknown",
            correlationId
          });
          processed++;
        } else {
          throw new Error(result.error || "Gateway connection failed");
        }

      } catch (error) {
        failures++;
        const nextAttempt = alert.retryCount + 1;
        const errMsg = error instanceof Error ? error.message : String(error);
        const latencyMs = Date.now() - startTime;
        
        console.error(`[QUEUE_PROCESSOR_ERROR] Failed sending notification ${alert.id}: ${errMsg}`);
        
        await this.repository.logDeliveryAttempt({
          notificationId: alert.id,
          attemptNumber: nextAttempt,
          status: "failed",
          gatewayResponse: { error_details: errMsg },
          errorMessage: errMsg,
          latencyMs,
          providerName: activeProvider?.name || "unknown",
          correlationId
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

export class NotificationEngine {
  constructor(private repository: INotificationRepository) {}

  async dispatchVerificationEvent(
    studentId: string, 
    documentType: "passport" | "visa" | "efrro", 
    status: "verified" | "rejected", 
    reason?: string
  ): Promise<void> {
    console.log(`[NOTIFICATION_ENGINE] Dispatching ${status} event for ${documentType} (student: ${studentId})`);
    
    const supabase = getAdminSupabase();
    
    // Get student details
    const { data: studentAccount } = await supabase
      .from("students")
      .select("email, phone")
      .eq("id", studentId)
      .single();
      
    const { data: studentPersonal } = await supabase
      .from("student_personal")
      .select("full_name, preferred_language")
      .eq("student_id", studentId)
      .single();

    if (!studentAccount || !studentPersonal) {
      console.error("[NOTIFICATION_ENGINE] Could not load student details for notification dispatch.");
      return;
    }

    const templateType = status === "verified" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED";
    const prefLang = studentPersonal.preferred_language || "en";
    
    let template = await this.repository.getActiveTemplate(templateType, prefLang);
    if (!template && prefLang !== "en") {
      template = await this.repository.getActiveTemplate(templateType, "en");
    }

    if (!template) {
      console.warn(`[NOTIFICATION_ENGINE] No active template found for ${templateType}. Notifications skipped.`);
      return;
    }

    const key = `${studentId}:${documentType}:${status}:${Date.now()}`;
    const channels = ["email", "whatsapp"];

    for (const channel of channels) {
      const address = channel === "email" ? studentAccount.email : studentAccount.phone;
      if (!address) continue;

      try {
        await this.repository.queueNotification({
          studentId,
          templateId: template.id,
          documentType,
          status: "queued",
          channel: channel as "email" | "whatsapp" | "both",
          recipientAddress: address,
          triggerSource: "event_handler",
          idempotencyKey: `${key}:${channel}`,
          notificationContext: {
            student_name: studentPersonal.full_name,
            document_type: documentType,
            status,
            rejection_reason: reason || "N/A"
          }
        });
      } catch (e) {
        console.error(`[NOTIFICATION_ENGINE_ERROR] Failed to queue ${channel} notification:`, e);
      }
    }
  }
}
