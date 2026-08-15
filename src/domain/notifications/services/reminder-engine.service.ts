import { 
  DocumentReminderGroup, 
  ReminderScheduleItem, 
  StudentReminderScheduleResponse 
} from "../types/reminder.types";

export interface ReminderRuleConfig {
  id: string;
  ruleName: string;
  thresholdDays: number;
  channel: "email" | "whatsapp" | "both";
}

export const STANDARD_REMINDER_RULES: Record<"passport" | "visa" | "efrro", ReminderRuleConfig[]> = {
  passport: [
    { id: "passport-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "email" },
    { id: "passport-60", ruleName: "60-Day Administrative Notice", thresholdDays: 60, channel: "email" },
    { id: "passport-30", ruleName: "30-Day Urgent Renewal Alert", thresholdDays: 30, channel: "both" },
    { id: "passport-15", ruleName: "15-Day Critical Warning", thresholdDays: 15, channel: "both" }
  ],
  visa: [
    { id: "visa-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "email" },
    { id: "visa-60", ruleName: "60-Day Administrative Notice", thresholdDays: 60, channel: "email" },
    { id: "visa-30", ruleName: "30-Day Urgent Renewal Alert", thresholdDays: 30, channel: "both" },
    { id: "visa-15", ruleName: "15-Day Critical Warning", thresholdDays: 15, channel: "both" }
  ],
  efrro: [
    { id: "efrro-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "email" },
    { id: "efrro-60", ruleName: "60-Day Administrative Notice", thresholdDays: 60, channel: "email" },
    { id: "efrro-30", ruleName: "30-Day Urgent Renewal Alert", thresholdDays: 30, channel: "both" },
    { id: "efrro-15", ruleName: "15-Day Critical Warning", thresholdDays: 15, channel: "both" }
  ]
};

export interface RawNotificationRecord {
  id: string;
  student_id: string;
  document_type: "passport" | "visa" | "efrro";
  status: "queued" | "sending" | "processing" | "sent" | "failed" | "cancelled";
  channel: string;
  scheduled_for: string;
  idempotency_key: string;
  notification_context?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  notification_delivery_log?: Array<{
    id: string;
    status: string;
    error_message?: string | null;
    created_at: string;
  }>;
}

import { CalendarDateEngine } from "./calendar-date";
export { CalendarDateEngine };

export class ExpiryReminderEngine {
  /**
   * Calculate reminder schedule for a single document.
   */
  static calculateDocumentReminders(params: {
    documentType: "passport" | "visa" | "efrro";
    documentTitle: string;
    documentNumber: string;
    expiryDate: string | null | undefined;
    isUploaded: boolean;
    verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected";
    existingNotifications: RawNotificationRecord[];
    todayISO?: string;
  }): DocumentReminderGroup {
    const {
      documentType,
      documentTitle,
      documentNumber,
      expiryDate,
      isUploaded,
      verificationStatus,
      existingNotifications,
      todayISO = CalendarDateEngine.getTodayISO()
    } = params;

    const rules = STANDARD_REMINDER_RULES[documentType] || [];
    const cleanExpiry = expiryDate ? expiryDate.split("T")[0].trim() : "";
    const hasValidExpiry = Boolean(cleanExpiry && /^\d{4}-\d{2}-\d{2}$/.test(cleanExpiry));

    if (!hasValidExpiry) {
      const schedule: ReminderScheduleItem[] = rules.map(r => ({
        ruleId: r.id,
        ruleName: r.ruleName,
        thresholdDays: r.thresholdDays,
        channel: r.channel,
        scheduledDate: null,
        scheduledDateISO: null,
        status: "NOT_APPLICABLE",
        statusLabel: "Not Available",
        statusReason: `${documentTitle} expiry date has not been recorded.`
      }));

      return {
        documentType,
        documentTitle,
        documentNumber: documentNumber || "Not Recorded",
        expiryDate: null,
        expiryDateFormatted: "Not Recorded",
        isUploaded,
        verificationStatus,
        daysRemaining: null,
        isExpired: false,
        schedule
      };
    }

    const daysRemaining = CalendarDateEngine.diffCalendarDays(cleanExpiry, todayISO);
    const isExpired = daysRemaining < 0;

    const schedule: ReminderScheduleItem[] = rules.map(rule => {
      const scheduledDateISO = CalendarDateEngine.subtractDays(cleanExpiry, rule.thresholdDays);
      const scheduledDate = CalendarDateEngine.formatDateDisplay(scheduledDateISO);

      // Find matching notification from history for this docType and threshold days
      const matchingNotif = existingNotifications.find(n => {
        if (n.document_type !== documentType) return false;
        
        // Match either by idempotency key structure or context
        const key = n.idempotency_key || "";
        const contextDays = n.notification_context?.days_left ? Number(n.notification_context.days_left) : null;
        
        const matchesThreshold = 
          key.includes(`:${rule.thresholdDays}:`) || 
          key.endsWith(`:${rule.thresholdDays}`) || 
          contextDays === rule.thresholdDays;

        return matchesThreshold;
      });

      if (matchingNotif) {
        if (matchingNotif.status === "sent") {
          const sentDate = matchingNotif.updated_at || matchingNotif.created_at;
          return {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            thresholdDays: rule.thresholdDays,
            channel: rule.channel,
            scheduledDate,
            scheduledDateISO,
            status: "DISPATCHED",
            statusLabel: "Dispatched",
            statusReason: `Dispatched via ${matchingNotif.channel} on ${new Date(sentDate).toLocaleDateString()}`,
            dispatchedAt: sentDate,
            notificationId: matchingNotif.id
          };
        }

        if (matchingNotif.status === "failed") {
          const log = matchingNotif.notification_delivery_log?.[0];
          const reason = log?.error_message || "Gateway delivery attempt failed";
          return {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            thresholdDays: rule.thresholdDays,
            channel: rule.channel,
            scheduledDate,
            scheduledDateISO,
            status: "FAILED",
            statusLabel: "Failed",
            statusReason: reason,
            failureReason: reason,
            notificationId: matchingNotif.id
          };
        }

        if (matchingNotif.status === "queued" || matchingNotif.status === "sending" || matchingNotif.status === "processing") {
          return {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            thresholdDays: rule.thresholdDays,
            channel: rule.channel,
            scheduledDate,
            scheduledDateISO,
            status: "DUE",
            statusLabel: "Due (Queued)",
            statusReason: "Notification is queued in dispatch pipeline",
            notificationId: matchingNotif.id
          };
        }
      }

      // No dispatched/failed notification record found -> evaluate dynamically against calendar date
      if (isExpired) {
        return {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          thresholdDays: rule.thresholdDays,
          channel: rule.channel,
          scheduledDate,
          scheduledDateISO,
          status: "EXPIRED",
          statusLabel: "Expired",
          statusReason: `Document expired ${Math.abs(daysRemaining)} days ago on ${CalendarDateEngine.formatDateDisplay(cleanExpiry)}`
        };
      }

      // Check if scheduled date has arrived (scheduledDateISO <= todayISO)
      const daysUntilScheduled = CalendarDateEngine.diffCalendarDays(scheduledDateISO, todayISO);
      
      if (daysUntilScheduled <= 0) {
        return {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          thresholdDays: rule.thresholdDays,
          channel: rule.channel,
          scheduledDate,
          scheduledDateISO,
          status: "DUE",
          statusLabel: "Due",
          statusReason: `Reminder reached scheduled threshold on ${scheduledDate}`
        };
      }

      // Scheduled date is in the future
      return {
        ruleId: rule.id,
        ruleName: rule.ruleName,
        thresholdDays: rule.thresholdDays,
        channel: rule.channel,
        scheduledDate,
        scheduledDateISO,
        status: "NOT_DUE",
        statusLabel: "Not Due",
        statusReason: `Scheduled for dispatch on ${scheduledDate} (${daysUntilScheduled} days left)`
      };
    });

    return {
      documentType,
      documentTitle,
      documentNumber: documentNumber || "Not Recorded",
      expiryDate: cleanExpiry,
      expiryDateFormatted: CalendarDateEngine.formatDateDisplay(cleanExpiry, true),
      isUploaded,
      verificationStatus,
      daysRemaining,
      isExpired,
      schedule
    };
  }

  /**
   * Calculate complete student reminder schedule across Passport, Visa, and eFRRO.
   */
  static calculateStudentReminders(params: {
    studentId: string;
    passport: { number: string; expiryDate?: string | null; isUploaded: boolean; verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected" };
    visa: { number: string; expiryDate?: string | null; isUploaded: boolean; verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected" };
    efrro?: { number: string; expiryDate?: string | null; isUploaded: boolean; verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected" } | null;
    notifications: RawNotificationRecord[];
    todayISO?: string;
  }): StudentReminderScheduleResponse {
    const today = params.todayISO || CalendarDateEngine.getTodayISO();

    const passportGroup = this.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "Passport Document",
      documentNumber: params.passport.number,
      expiryDate: params.passport.expiryDate,
      isUploaded: params.passport.isUploaded,
      verificationStatus: params.passport.verificationStatus,
      existingNotifications: params.notifications,
      todayISO: today
    });

    const visaGroup = this.calculateDocumentReminders({
      documentType: "visa",
      documentTitle: "Student Visa",
      documentNumber: params.visa.number,
      expiryDate: params.visa.expiryDate,
      isUploaded: params.visa.isUploaded,
      verificationStatus: params.visa.verificationStatus,
      existingNotifications: params.notifications,
      todayISO: today
    });

    const efrroGroup = this.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: params.efrro?.number || "",
      expiryDate: params.efrro?.expiryDate,
      isUploaded: params.efrro?.isUploaded || false,
      verificationStatus: params.efrro?.verificationStatus || "not_uploaded",
      existingNotifications: params.notifications,
      todayISO: today
    });

    const allSchedules = [
      ...passportGroup.schedule,
      ...visaGroup.schedule,
      ...efrroGroup.schedule
    ];

    const summary = {
      totalRules: allSchedules.length,
      dueCount: allSchedules.filter(s => s.status === "DUE").length,
      dispatchedCount: allSchedules.filter(s => s.status === "DISPATCHED").length,
      failedCount: allSchedules.filter(s => s.status === "FAILED").length,
      notDueCount: allSchedules.filter(s => s.status === "NOT_DUE").length,
      notApplicableCount: allSchedules.filter(s => s.status === "NOT_APPLICABLE").length
    };

    return {
      studentId: params.studentId,
      evaluatedAt: new Date().toISOString(),
      documents: {
        passport: passportGroup,
        visa: visaGroup,
        efrro: efrroGroup
      },
      summary
    };
  }

  /**
   * Evaluates and queues due reminders for a student in database with idempotent keys.
   */
  static async evaluateAndQueueStudentDueReminders(studentId: string): Promise<{ queuedCount: number; errors: string[] }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    // 1. Fetch student snapshot & details
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select(`
        id,
        email,
        phone,
        student_personal(full_name, preferred_language),
        student_snapshot(passport_expiry, visa_expiry, efrro_expiry, passport_number, visa_number, efrro_number),
        passport_versions(is_active, expiry_date, verification_status, file_path, deleted_at),
        visa_versions(is_active, expiry_date, verification_status, file_path, deleted_at),
        efrro_versions(is_active, expiry_date, verification_status, file_path, deleted_at)
      `)
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return { queuedCount: 0, errors: [`Failed to load student: ${sErr?.message || "Not found"}`] };
    }

    // 2. Fetch existing notifications
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*, notification_delivery_log(*)")
      .eq("student_id", studentId);

    const notifications: RawNotificationRecord[] = (notifData || []) as RawNotificationRecord[];

    // Extract active versions
    const activePass = (student.passport_versions || []).find((p: { is_active: boolean; deleted_at: string | null }) => p.is_active && !p.deleted_at);
    const activeVisa = (student.visa_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);
    const activeEfrro = (student.efrro_versions || []).find((e: { is_active: boolean; deleted_at: string | null }) => e.is_active && !e.deleted_at);

    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;
    const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;

    const scheduleResponse = this.calculateStudentReminders({
      studentId,
      passport: {
        number: snapshot?.passport_number || "",
        expiryDate: activePass?.expiry_date || snapshot?.passport_expiry,
        isUploaded: Boolean(activePass?.file_path),
        verificationStatus: (activePass?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      visa: {
        number: snapshot?.visa_number || "",
        expiryDate: activeVisa?.expiry_date || snapshot?.visa_expiry,
        isUploaded: Boolean(activeVisa?.file_path),
        verificationStatus: (activeVisa?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      efrro: {
        number: snapshot?.efrro_number || "",
        expiryDate: activeEfrro?.expiry_date || snapshot?.efrro_expiry,
        isUploaded: Boolean(activeEfrro?.file_path),
        verificationStatus: (activeEfrro?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      notifications
    });

    let queuedCount = 0;
    const errors: string[] = [];
    const studentName = personal?.full_name || "Student";
    const studentEmail = student.email || "";
    const studentPhone = student.phone || "";

    // 3. For each DUE reminder, queue notification if not already queued
    const docs = [scheduleResponse.documents.passport, scheduleResponse.documents.visa, scheduleResponse.documents.efrro];
    for (const doc of docs) {
      for (const item of doc.schedule) {
        if (item.status === "DUE" && item.scheduledDateISO && doc.expiryDate) {
          const idempotencyKey = `${studentId}:${doc.documentType}:${item.thresholdDays}:${item.channel}:${doc.expiryDate}`;
          const recipientAddress = item.channel === "email" ? studentEmail : (studentPhone || studentEmail);

          if (!recipientAddress) {
            errors.push(`No valid contact address for ${doc.documentType} ${item.thresholdDays}-day alert.`);
            continue;
          }

          try {
            const { error: insertErr } = await supabase
              .from("notifications")
              .insert({
                student_id: studentId,
                document_type: doc.documentType,
                status: "queued",
                channel: item.channel,
                recipient_address: recipientAddress,
                scheduled_for: new Date().toISOString(),
                trigger_source: "reminder_engine_calc",
                idempotency_key: idempotencyKey,
                notification_context: {
                  student_name: studentName,
                  document_type: doc.documentTitle,
                  days_left: String(item.thresholdDays),
                  expiry_date: doc.expiryDate,
                  scheduled_date: item.scheduledDate
                }
              });

            if (!insertErr) {
              queuedCount++;
            } else if (!insertErr.message.includes("unique") && !insertErr.message.includes("duplicate")) {
              errors.push(`Failed to queue ${doc.documentType} reminder: ${insertErr.message}`);
            }
          } catch (err) {
            errors.push(err instanceof Error ? err.message : "Error queuing reminder");
          }
        }
      }
    }

    return { queuedCount, errors };
  }
}
