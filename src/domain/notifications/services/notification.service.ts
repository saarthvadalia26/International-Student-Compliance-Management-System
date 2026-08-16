import type { 
  INotificationRepository 
} from "../repositories/notification.repository";
import { 
  INotificationProvider,
  ProviderResponse
} from "../types/provider.types";
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
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();
    
    // Query active student compliance snapshots and verified versions
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        student_personal(full_name, preferred_language),
        student_contact(email, phone_home, phone_local),
        student_academic(program_code),
        student_snapshot(passport_expiry, visa_expiry, efrro_expiry),
        passport_versions(version_number, is_active, expiry_date, verification_status, deleted_at),
        visa_versions(version_number, is_active, expiry_date, verification_status, deleted_at),
        efrro_versions(version_number, is_active, expiry_date, verification_status, deleted_at)
      `)
      .is("deleted_at", null);

    if (error || !students) {
      console.error("[REMINDER_ENGINE_ERROR] Failed to load students for reminders:", error?.message);
      return;
    }

    const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME || "Office of International Compliance";

    for (const student of students) {
      const studentId = student.id;
      const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;
      const contact = Array.isArray(student.student_contact) ? student.student_contact[0] : student.student_contact;
      const academic = Array.isArray(student.student_academic) ? student.student_academic[0] : student.student_academic;
      const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;

      const studentName = personal?.full_name || "Student";
      const enrollmentNumber = student.registration_number || "N/A";
      const prefLang = personal?.preferred_language || "en";
      const programName = academic?.program_code || "Academic Program";
      const studentPhone = contact?.phone_local || contact?.phone_home || null;
      const studentEmail = contact?.email || null;

      // Resolve current verified active expiry dates for all 3 document types
      const activePassport = (student.passport_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);
      const activeVisa = (student.visa_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);
      const activeEfrro = (student.efrro_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);

      const expiryDates: Record<"passport" | "visa" | "efrro", string | null> = {
        passport: activePassport?.expiry_date || snapshot?.passport_expiry || null,
        visa: activeVisa?.expiry_date || snapshot?.visa_expiry || null,
        efrro: activeEfrro?.expiry_date || snapshot?.efrro_expiry || null
      };

      const docLabels: Record<"passport" | "visa" | "efrro", string> = {
        passport: "Passport",
        visa: "Student Visa",
        efrro: "eFRRO / Residential Permit"
      };

      // Evaluate rules against document status dates for passport, visa, and efrro
      for (const rule of rules) {
        const docType = rule.documentType;
        const expiryDate = expiryDates[docType];

        if (!expiryDate) {
          // No valid expiry date recorded -> do not fabricate or send false reminders
          continue;
        }

        const cleanExpiry = expiryDate.split("T")[0].trim();
        const today = new Date().toISOString().split("T")[0];
        
        // Calculate offset difference
        const daysLeft = Math.ceil((new Date(cleanExpiry).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        
        // Match alert rule triggers
        if (daysLeft === rule.alertThresholdDays) {
          // Resolve document-specific template or fallback
          const specificCode = `${docType.toUpperCase()}_EXPIRY_ALERT`;
          let template = await this.repository.getActiveTemplate(specificCode, prefLang);
          if (!template && prefLang !== "en") {
            template = await this.repository.getActiveTemplate(specificCode, "en");
          }
          if (!template) {
            template = await this.repository.getActiveTemplate("EXPIRY_ALERT", prefLang);
            if (!template && prefLang !== "en") {
              template = await this.repository.getActiveTemplate("EXPIRY_ALERT", "en");
            }
          }
          if (!template) continue;

          // Email channel is currently disabled - only WhatsApp is operational
          if (rule.channel === "email") {
            continue;
          }

          const channel = "whatsapp";
          const address = studentPhone || studentEmail || "N/A";
          
          // Enforce idempotency key mapping to prevent duplicates: studentId:docType:thresholdDays:channel:expiryDate
          const key = `${studentId}:${docType}:${rule.alertThresholdDays}:${channel}:${cleanExpiry}`;

          try {
            await this.repository.queueNotification({
              studentId,
              templateId: template.id,
              documentType: docType,
              status: "queued",
              channel,
              recipientAddress: address,
              triggerSource,
              idempotencyKey: key,
              notificationContext: {
                student_name: studentName,
                enrollment_number: enrollmentNumber,
                document_type: docLabels[docType],
                days_left: String(daysLeft),
                days_remaining: String(daysLeft),
                expiry_date: cleanExpiry,
                institution_name: institutionName,
                program_name: programName
              }
            });
          } catch (e) {
            // Duplicate key insert exception caught cleanly to prevent duplicate dispatch
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
          const { getAdminSupabase } = await import("@/lib/supabase/admin");
          const supabase = getAdminSupabase();
          const { data: tData } = await supabase
            .from("notification_templates")
            .select("*")
            .eq("id", alert.templateId)
            .single();

          if (tData) {
            const isInactive = tData.status === "INACTIVE" || tData.status === "DRAFT" || tData.status === "ARCHIVED" || tData.is_active === false;
            if (isInactive) {
              throw new Error(`[CONFIGURATION_ERROR] Referenced template '${tData.title}' (${tData.code}) is not ACTIVE.`);
            }

            body = this.interpolateTemplate(tData.body_template, alert.notificationContext);
            subject = tData.subject_template ? this.interpolateTemplate(tData.subject_template, alert.notificationContext) : subject;
          }
        }

        // If active channel is email, cancel without attempting delivery since email is not integrated
        if (activeChannel === "email") {
          console.log(`[QUEUE_PROCESSOR] Email channel is currently disabled. Cancelling notification ${alert.id}.`);
          await this.repository.updateNotificationStatus(alert.id, "cancelled");
          continue;
        }

        // 4. Submit to WhatsApp Gateway adapter
        let result: ProviderResponse = { success: false };
        activeProvider = this.whatsappProvider;
        result = await this.whatsappProvider.sendWhatsApp(alert.recipientAddress, body);

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
    
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();
    
    // Get student details
    const { data: studentContact } = await supabase
      .from("student_contact")
      .select("email, phone_home, phone_local")
      .eq("student_id", studentId)
      .maybeSingle();
      
    const { data: studentPersonal } = await supabase
      .from("student_personal")
      .select("full_name, preferred_language")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!studentPersonal) {
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
    const channels = ["whatsapp"];

    for (const channel of channels) {
      const address = studentContact?.phone_local || studentContact?.phone_home || studentContact?.email;
      if (!address) continue;

      try {
        await this.repository.queueNotification({
          studentId,
          templateId: template.id,
          documentType,
          status: "queued",
          channel: "whatsapp",
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
