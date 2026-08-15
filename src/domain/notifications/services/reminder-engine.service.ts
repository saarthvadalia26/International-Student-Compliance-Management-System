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
    { id: "passport-60", ruleName: "60-Day Administrative Reminder", thresholdDays: 60, channel: "email" },
    { id: "passport-30", ruleName: "30-Day Urgent Renewal", thresholdDays: 30, channel: "both" },
    { id: "passport-15", ruleName: "15-Day Critical Alert", thresholdDays: 15, channel: "both" },
    { id: "passport-7", ruleName: "7-Day Final Warning", thresholdDays: 7, channel: "both" }
  ],
  visa: [
    { id: "visa-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "email" },
    { id: "visa-60", ruleName: "60-Day Administrative Reminder", thresholdDays: 60, channel: "email" },
    { id: "visa-30", ruleName: "30-Day Urgent Renewal", thresholdDays: 30, channel: "both" },
    { id: "visa-15", ruleName: "15-Day Critical Alert", thresholdDays: 15, channel: "both" },
    { id: "visa-7", ruleName: "7-Day Final Warning", thresholdDays: 7, channel: "both" }
  ],
  efrro: [
    { id: "efrro-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "email" },
    { id: "efrro-60", ruleName: "60-Day Administrative Reminder", thresholdDays: 60, channel: "email" },
    { id: "efrro-30", ruleName: "30-Day Urgent Renewal", thresholdDays: 30, channel: "both" },
    { id: "efrro-15", ruleName: "15-Day Critical Alert", thresholdDays: 15, channel: "both" },
    { id: "efrro-7", ruleName: "7-Day Final Warning", thresholdDays: 7, channel: "both" }
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

export interface DocumentInfoParam {
  number?: string | null;
  expiryDate?: string | null;
  isUploaded?: boolean;
  verificationStatus?: "not_uploaded" | "pending" | "verified" | "rejected";
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
    customRules?: ReminderRuleConfig[];
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
      customRules,
      todayISO = CalendarDateEngine.getTodayISO()
    } = params;

    const rules = (customRules && customRules.length > 0)
      ? customRules
      : (STANDARD_REMINDER_RULES[documentType] || []);

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
        const contextDays = n.notification_context?.days_left 
          ? Number(n.notification_context.days_left) 
          : (n.notification_context?.days_remaining ? Number(n.notification_context.days_remaining) : null);
        
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
      if (isExpired && rule.thresholdDays > 0) {
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
   * Calculate student automated reminder schedules for Passport, Visa, and eFRRO.
   */
  static calculateStudentReminders(params: {
    studentId: string;
    passport?: DocumentInfoParam | null;
    visa?: DocumentInfoParam | null;
    efrro?: DocumentInfoParam | null;
    notifications: RawNotificationRecord[];
    customRules?: Record<"passport" | "visa" | "efrro", ReminderRuleConfig[]>;
    todayISO?: string;
  }): StudentReminderScheduleResponse {
    const today = params.todayISO || CalendarDateEngine.getTodayISO();

    const passportGroup = this.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: params.passport?.number || "",
      expiryDate: params.passport?.expiryDate,
      isUploaded: params.passport?.isUploaded || false,
      verificationStatus: params.passport?.verificationStatus || "not_uploaded",
      existingNotifications: params.notifications,
      customRules: params.customRules?.passport,
      todayISO: today
    });

    const visaGroup = this.calculateDocumentReminders({
      documentType: "visa",
      documentTitle: "Student Visa",
      documentNumber: params.visa?.number || "",
      expiryDate: params.visa?.expiryDate,
      isUploaded: params.visa?.isUploaded || false,
      verificationStatus: params.visa?.verificationStatus || "not_uploaded",
      existingNotifications: params.notifications,
      customRules: params.customRules?.visa,
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
      customRules: params.customRules?.efrro,
      todayISO: today
    });

    const allSchedules = [
      ...passportGroup.schedule,
      ...visaGroup.schedule,
      ...efrroGroup.schedule
    ];

    const getGroupCounts = (group: DocumentReminderGroup) => ({
      totalRules: group.schedule.length,
      dueCount: group.schedule.filter(s => s.status === "DUE").length,
      dispatchedCount: group.schedule.filter(s => s.status === "DISPATCHED").length,
      failedCount: group.schedule.filter(s => s.status === "FAILED").length,
      notDueCount: group.schedule.filter(s => s.status === "NOT_DUE").length,
      notApplicableCount: group.schedule.filter(s => s.status === "NOT_APPLICABLE").length
    });

    const summary = {
      totalRules: allSchedules.length,
      dueCount: allSchedules.filter(s => s.status === "DUE").length,
      dispatchedCount: allSchedules.filter(s => s.status === "DISPATCHED").length,
      failedCount: allSchedules.filter(s => s.status === "FAILED").length,
      notDueCount: allSchedules.filter(s => s.status === "NOT_DUE").length,
      notApplicableCount: allSchedules.filter(s => s.status === "NOT_APPLICABLE").length,
      byDocument: {
        passport: getGroupCounts(passportGroup),
        visa: getGroupCounts(visaGroup),
        efrro: getGroupCounts(efrroGroup)
      }
    };

    return {
      studentId: params.studentId,
      evaluatedAt: new Date().toISOString(),
      passport: passportGroup,
      visa: visaGroup,
      efrro: efrroGroup,
      documents: {
        passport: passportGroup,
        visa: visaGroup,
        efrro: efrroGroup
      },
      summary
    };
  }

  /**
   * Evaluates and queues due reminders for all configured document types for a student.
   */
  static async evaluateAndQueueStudentDueReminders(studentId: string): Promise<{ queuedCount: number; errors: string[] }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    // 1. Fetch student details, snapshot, and active document versions across all 3 document types
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select(`
        id,
        email,
        phone,
        registration_number,
        student_personal(full_name, preferred_language),
        student_academic(program_code),
        student_snapshot(
          passport_expiry, passport_number,
          visa_expiry, visa_number,
          efrro_expiry, efrro_number
        ),
        passport_versions(id, version_number, is_active, expiry_date, verification_status, file_path, deleted_at),
        visa_versions(id, version_number, is_active, expiry_date, verification_status, file_path, deleted_at),
        efrro_versions(id, version_number, is_active, expiry_date, verification_status, file_path, deleted_at)
      `)
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return { queuedCount: 0, errors: [`Failed to load student: ${sErr?.message || "Not found"}`] };
    }

    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;
    const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;
    const academic = Array.isArray(student.student_academic) ? student.student_academic[0] : student.student_academic;

    // Extract active approved document versions
    const activePassport = (student.passport_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);
    const activeVisa = (student.visa_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);
    const activeEfrro = (student.efrro_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);

    const passportExpiry = activePassport?.expiry_date || snapshot?.passport_expiry || null;
    const visaExpiry = activeVisa?.expiry_date || snapshot?.visa_expiry || null;
    const efrroExpiry = activeEfrro?.expiry_date || snapshot?.efrro_expiry || null;

    // 2. Fetch existing notification history for this student
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*, notification_delivery_log(*)")
      .eq("student_id", studentId);

    const notifications: RawNotificationRecord[] = (notifData || []) as RawNotificationRecord[];

    // 3. Fetch active reminder rules from database
    const { data: dbRules } = await supabase
      .from("reminder_rules")
      .select("id, document_type, alert_threshold_days, channel, is_active, rule_name, template_id")
      .eq("is_active", true);

    const customRules: Record<"passport" | "visa" | "efrro", ReminderRuleConfig[]> = {
      passport: [],
      visa: [],
      efrro: []
    };

    if (dbRules && dbRules.length > 0) {
      for (const r of dbRules) {
        const dType = r.document_type as "passport" | "visa" | "efrro";
        if (customRules[dType]) {
          customRules[dType].push({
            id: r.id,
            ruleName: r.rule_name || `${r.alert_threshold_days}-Day Reminder`,
            thresholdDays: r.alert_threshold_days,
            channel: r.channel as "email" | "whatsapp" | "both"
          });
        }
      }
    }

    const scheduleResponse = this.calculateStudentReminders({
      studentId,
      passport: {
        number: snapshot?.passport_number || "",
        expiryDate: passportExpiry,
        isUploaded: Boolean(activePassport?.file_path),
        verificationStatus: (activePassport?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      visa: {
        number: snapshot?.visa_number || "",
        expiryDate: visaExpiry,
        isUploaded: Boolean(activeVisa?.file_path),
        verificationStatus: (activeVisa?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      efrro: {
        number: snapshot?.efrro_number || "",
        expiryDate: efrroExpiry,
        isUploaded: Boolean(activeEfrro?.file_path),
        verificationStatus: (activeEfrro?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      notifications,
      customRules: dbRules && dbRules.length > 0 ? customRules : undefined
    });

    let queuedCount = 0;
    const errors: string[] = [];
    const studentName = personal?.full_name || "Student";
    const enrollmentNumber = student.registration_number || "Pending Registration";
    const studentEmail = student.email || "";
    const studentPhone = student.phone || "";
    const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME || "Office of International Student Affairs";
    const programName = academic?.program_code || "Academic Program";

    const docGroups: DocumentReminderGroup[] = [
      scheduleResponse.passport,
      scheduleResponse.visa,
      scheduleResponse.efrro
    ];

    // 4. Iterate over each document type and queue DUE reminders
    for (const doc of docGroups) {
      if (!doc.expiryDate || doc.isExpired) {
        continue;
      }

      for (const item of doc.schedule) {
        if (item.status === "DUE" && item.scheduledDateISO && doc.expiryDate) {
          // Idempotency key accounts for student, docType, thresholdDays, channel, and expiryDate
          const idempotencyKey = `${studentId}:${doc.documentType}:${item.thresholdDays}:${item.channel}:${doc.expiryDate}`;
          const recipientAddress = item.channel === "email" ? studentEmail : (studentPhone || studentEmail);

          if (!recipientAddress) {
            errors.push(`No valid contact address for ${doc.documentType.toUpperCase()} ${item.thresholdDays}-day alert.`);
            continue;
          }

          const docTitle = doc.documentTitle;
          const daysLeft = String(item.thresholdDays);

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
                  enrollment_number: enrollmentNumber,
                  document_type: docTitle,
                  days_left: daysLeft,
                  days_remaining: daysLeft,
                  expiry_date: doc.expiryDate,
                  scheduled_date: item.scheduledDate,
                  institution_name: institutionName,
                  program_name: programName
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
