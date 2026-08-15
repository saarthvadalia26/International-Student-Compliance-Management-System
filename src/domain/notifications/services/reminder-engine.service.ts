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
  passport: [],
  visa: [],
  efrro: [
    { id: "efrro-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "email" },
    { id: "efrro-60", ruleName: "60-Day Administrative Reminder", thresholdDays: 60, channel: "email" },
    { id: "efrro-30", ruleName: "30-Day Urgent Renewal", thresholdDays: 30, channel: "both" },
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
            statusLabel: "Scheduled",
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
          statusLabel: "Scheduled",
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
        statusLabel: "Scheduled",
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
   * Calculate student automated reminder schedule for active eFRRO expiry.
   * Passport and Visa do NOT generate automated reminder schedules.
   */
  static calculateStudentReminders(params: {
    studentId: string;
    efrro?: { number: string; expiryDate?: string | null; isUploaded: boolean; verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected" } | null;
    notifications: RawNotificationRecord[];
    todayISO?: string;
  }): StudentReminderScheduleResponse {
    const today = params.todayISO || CalendarDateEngine.getTodayISO();

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

    const summary = {
      totalRules: efrroGroup.schedule.length,
      dueCount: efrroGroup.schedule.filter(s => s.status === "DUE").length,
      dispatchedCount: efrroGroup.schedule.filter(s => s.status === "DISPATCHED").length,
      failedCount: efrroGroup.schedule.filter(s => s.status === "FAILED").length,
      notDueCount: efrroGroup.schedule.filter(s => s.status === "NOT_DUE").length,
      notApplicableCount: efrroGroup.schedule.filter(s => s.status === "NOT_APPLICABLE").length
    };

    return {
      studentId: params.studentId,
      evaluatedAt: new Date().toISOString(),
      efrro: efrroGroup,
      summary
    };
  }

  /**
   * Evaluates and queues due eFRRO reminders for a student in database with idempotent keys.
   * Automated expiry reminders are only generated for eFRRO documents.
   */
  static async evaluateAndQueueStudentDueReminders(studentId: string): Promise<{ queuedCount: number; errors: string[] }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    // 1. Fetch student snapshot & eFRRO versions
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select(`
        id,
        email,
        phone,
        student_personal(full_name, preferred_language),
        student_snapshot(efrro_expiry, efrro_number),
        efrro_versions(is_active, expiry_date, verification_status, file_path, deleted_at)
      `)
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return { queuedCount: 0, errors: [`Failed to load student: ${sErr?.message || "Not found"}`] };
    }

    // Extract active approved eFRRO version
    const activeEfrro = (student.efrro_versions || []).find((e: { is_active: boolean; deleted_at: string | null }) => e.is_active && !e.deleted_at);

    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;
    const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;

    const efrroExpiry = activeEfrro?.expiry_date || snapshot?.efrro_expiry;
    if (!efrroExpiry) {
      // Do not create notification records when there is no valid eFRRO expiry date
      return { queuedCount: 0, errors: [] };
    }

    // 2. Fetch existing eFRRO notifications
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*, notification_delivery_log(*)")
      .eq("student_id", studentId)
      .eq("document_type", "efrro");

    const notifications: RawNotificationRecord[] = (notifData || []) as RawNotificationRecord[];

    const scheduleResponse = this.calculateStudentReminders({
      studentId,
      efrro: {
        number: snapshot?.efrro_number || "",
        expiryDate: efrroExpiry,
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

    const doc = scheduleResponse.efrro;
    if (!doc.expiryDate || doc.isExpired) {
      // Do not generate future reminder records for expired documents
      return { queuedCount: 0, errors: [] };
    }

    // 3. For each DUE eFRRO reminder, queue notification if not already queued
    for (const item of doc.schedule) {
      if (item.status === "DUE" && item.scheduledDateISO && doc.expiryDate) {
        const idempotencyKey = `${studentId}:efrro:${item.thresholdDays}:${item.channel}:${doc.expiryDate}`;
        const recipientAddress = item.channel === "email" ? studentEmail : (studentPhone || studentEmail);

        if (!recipientAddress) {
          errors.push(`No valid contact address for eFRRO ${item.thresholdDays}-day alert.`);
          continue;
        }

        try {
          const { error: insertErr } = await supabase
            .from("notifications")
            .insert({
              student_id: studentId,
              document_type: "efrro",
              status: "queued",
              channel: item.channel,
              recipient_address: recipientAddress,
              scheduled_for: new Date().toISOString(),
              trigger_source: "reminder_engine_calc",
              idempotency_key: idempotencyKey,
              notification_context: {
                student_name: studentName,
                document_type: "eFRRO / Residential Permit",
                days_left: String(item.thresholdDays),
                expiry_date: doc.expiryDate,
                scheduled_date: item.scheduledDate
              }
            });

          if (!insertErr) {
            queuedCount++;
          } else if (!insertErr.message.includes("unique") && !insertErr.message.includes("duplicate")) {
            errors.push(`Failed to queue eFRRO reminder: ${insertErr.message}`);
          }
        } catch (err) {
          errors.push(err instanceof Error ? err.message : "Error queuing reminder");
        }
      }
    }

    return { queuedCount, errors };
  }
}
