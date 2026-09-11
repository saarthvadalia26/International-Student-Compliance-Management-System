import { 
  DocumentReminderGroup, 
  ReminderScheduleItem, 
  StudentReminderScheduleResponse 
} from "../types/reminder.types";
import { formatDate } from "@/lib/utils/date";
import { isEfrroApplicable } from "@/domain/compliance/utils/efrro-applicability";
import { isVisaApplicable } from "@/domain/compliance/utils/visa-applicability";

export interface ReminderRuleConfig {
  id: string;
  ruleName: string;
  thresholdDays: number;
  channel: "email" | "whatsapp" | "both";
}

export const STANDARD_REMINDER_RULES: Record<"passport" | "visa" | "efrro", ReminderRuleConfig[]> = {
  passport: [
    { id: "passport-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "whatsapp" },
    { id: "passport-60", ruleName: "60-Day Administrative Reminder", thresholdDays: 60, channel: "whatsapp" },
    { id: "passport-30", ruleName: "30-Day Urgent Renewal", thresholdDays: 30, channel: "whatsapp" },
    { id: "passport-15", ruleName: "15-Day Critical Alert", thresholdDays: 15, channel: "whatsapp" },
    { id: "passport-7", ruleName: "7-Day Final Warning", thresholdDays: 7, channel: "whatsapp" }
  ],
  visa: [
    { id: "visa-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "whatsapp" },
    { id: "visa-60", ruleName: "60-Day Administrative Reminder", thresholdDays: 60, channel: "whatsapp" },
    { id: "visa-30", ruleName: "30-Day Urgent Renewal", thresholdDays: 30, channel: "whatsapp" },
    { id: "visa-15", ruleName: "15-Day Critical Alert", thresholdDays: 15, channel: "whatsapp" },
    { id: "visa-7", ruleName: "7-Day Final Warning", thresholdDays: 7, channel: "whatsapp" }
  ],
  efrro: [
    { id: "efrro-90", ruleName: "90-Day Early Warning", thresholdDays: 90, channel: "whatsapp" },
    { id: "efrro-60", ruleName: "60-Day Administrative Reminder", thresholdDays: 60, channel: "whatsapp" },
    { id: "efrro-30", ruleName: "30-Day Urgent Renewal", thresholdDays: 30, channel: "whatsapp" },
    { id: "efrro-15", ruleName: "15-Day Critical Alert", thresholdDays: 15, channel: "whatsapp" },
    { id: "efrro-7", ruleName: "7-Day Final Warning", thresholdDays: 7, channel: "whatsapp" }
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
  issueDate?: string | null;
  expiryDate?: string | null;
  isUploaded?: boolean;
  verificationStatus?: "not_recorded" | "pending" | "verified" | "rejected" | "not_uploaded" | "not_applicable";
}

import { CalendarDateEngine } from "./calendar-date";
export { CalendarDateEngine };

export class ExpiryReminderEngine {
  /**
   * Calculate reminder schedule for a single document.
   * Enforces graduation boundary: document_expiry_date <= student_graduation_date
   */
  static calculateDocumentReminders(params: {
    documentType: "passport" | "visa" | "efrro";
    documentTitle: string;
    documentNumber: string;
    expiryDate: string | null | undefined;
    expectedGraduationDate?: string | null | undefined;
    isUploaded?: boolean;
    verificationStatus?: "not_recorded" | "pending" | "verified" | "rejected" | "not_uploaded" | "not_applicable";
    existingNotifications: RawNotificationRecord[];
    customRules?: ReminderRuleConfig[];
    todayISO?: string;
  }): DocumentReminderGroup {
    const {
      documentType,
      documentTitle,
      documentNumber,
      expiryDate,
      expectedGraduationDate,
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

    const cleanGraduation = expectedGraduationDate ? expectedGraduationDate.split("T")[0].trim() : "";
    const hasValidGraduation = Boolean(cleanGraduation && /^\d{4}-\d{2}-\d{2}$/.test(cleanGraduation));
    const graduationDateFormatted = hasValidGraduation 
      ? CalendarDateEngine.formatDateDisplay(cleanGraduation, true) 
      : null;

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
        isAfterGraduation: false,
        graduationDate: hasValidGraduation ? cleanGraduation : null,
        graduationDateFormatted,
        graduationBoundaryStatus: hasValidGraduation ? "WITHIN_BOUNDARY" : "MISSING_GRADUATION_DATE",
        graduationBoundaryReason: `${documentTitle} expiry date has not been recorded.`,
        schedule
      };
    }

    const daysRemaining = CalendarDateEngine.diffCalendarDays(cleanExpiry, todayISO);
    const isExpired = daysRemaining < 0;

    // Evaluate Graduation Date Boundary:
    // If document expires strictly after graduation date (cleanExpiry > cleanGraduation),
    // the document is NOT REMINDER ELIGIBLE.
    const isAfterGraduation = hasValidGraduation && cleanExpiry > cleanGraduation;

    let graduationBoundaryStatus: "WITHIN_BOUNDARY" | "AFTER_GRADUATION" | "MISSING_GRADUATION_DATE" = "WITHIN_BOUNDARY";
    let graduationBoundaryReason: string | null = null;

    if (isAfterGraduation) {
      graduationBoundaryStatus = "AFTER_GRADUATION";
      graduationBoundaryReason = "Document expires after expected graduation. No expiry reminders are required for this document.";
    } else if (!hasValidGraduation) {
      graduationBoundaryStatus = "MISSING_GRADUATION_DATE";
      graduationBoundaryReason = "Student graduation date has not been recorded. Boundary evaluation cannot be computed.";
    }

    // If document expires after graduation, mark all reminder schedule items as inactive / NOT_APPLICABLE
    if (isAfterGraduation) {
      const schedule: ReminderScheduleItem[] = rules.map(rule => {
        const scheduledDateISO = CalendarDateEngine.subtractDays(cleanExpiry, rule.thresholdDays);
        const scheduledDate = CalendarDateEngine.formatDateDisplay(scheduledDateISO);

        return {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          thresholdDays: rule.thresholdDays,
          channel: rule.channel,
          scheduledDate,
          scheduledDateISO,
          status: "NOT_APPLICABLE",
          statusLabel: "Inactive",
          statusReason: "Document expires after expected graduation. No expiry reminders are required for this document."
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
        isAfterGraduation: true,
        graduationDate: cleanGraduation,
        graduationDateFormatted,
        graduationBoundaryStatus,
        graduationBoundaryReason,
        schedule
      };
    }

    // Identify the active due threshold among rules that have already reached their scheduled date
    const arrivedThresholds = rules
      .filter(r => CalendarDateEngine.diffCalendarDays(CalendarDateEngine.subtractDays(cleanExpiry, r.thresholdDays), todayISO) <= 0)
      .map(r => r.thresholdDays);
    const activeDueThreshold = arrivedThresholds.length > 0 ? Math.min(...arrivedThresholds) : null;

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
        const log = matchingNotif.notification_delivery_log?.[0];
        const isDelivered = log?.status === "delivered";

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
            statusLabel: isDelivered ? "Delivered" : "Dispatched",
            statusReason: isDelivered
              ? `Delivered via ${matchingNotif.channel} on ${formatDate(log?.created_at || sentDate)}`
              : `Dispatched via ${matchingNotif.channel} on ${formatDate(sentDate)}`,
            dispatchedAt: sentDate,
            deliveredAt: isDelivered ? (log?.created_at || sentDate) : null,
            deliveryStatus: log?.status || matchingNotif.status,
            notificationId: matchingNotif.id
          };
        }

        if (matchingNotif.status === "failed") {
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
            deliveryStatus: "failed",
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
            statusLabel: "Queued",
            statusReason: "Notification is queued in dispatch pipeline",
            deliveryStatus: "queued",
            notificationId: matchingNotif.id
          };
        }

        if (matchingNotif.status === "cancelled") {
          return {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            thresholdDays: rule.thresholdDays,
            channel: rule.channel,
            scheduledDate,
            scheduledDateISO,
            status: "CANCELLED",
            statusLabel: "Cancelled",
            statusReason: "Reminder event was cancelled or superseded",
            deliveryStatus: "cancelled",
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
        const isExactToday = daysUntilScheduled === 0;
        const isPastMilestone = activeDueThreshold !== null && rule.thresholdDays > activeDueThreshold;

        return {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          thresholdDays: rule.thresholdDays,
          channel: rule.channel,
          scheduledDate,
          scheduledDateISO,
          status: "DUE",
          statusLabel: isPastMilestone ? "Passed" : (isExactToday ? "Due Today" : "Due Now"),
          statusReason: isPastMilestone
            ? `Reminder milestone date passed (${Math.abs(daysUntilScheduled)} days ago on ${scheduledDate})`
            : (isExactToday
              ? `Reminder reached scheduled threshold today on ${scheduledDate}`
              : `Reminder threshold passed (${Math.abs(daysUntilScheduled)} days ago on ${scheduledDate}) - Due immediately`)
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
      isAfterGraduation: false,
      graduationDate: hasValidGraduation ? cleanGraduation : null,
      graduationDateFormatted,
      graduationBoundaryStatus,
      graduationBoundaryReason,
      schedule
    };
  }

  /**
   * Calculate student automated reminder schedules for Passport, Visa, and eFRRO.
   * Evaluates graduation boundary independently for each document.
   */
  static calculateStudentReminders(params: {
    studentId: string;
    expectedGraduationDate?: string | null;
    nationality?: string | null;
    admissionCategory?: string | null;
    admissionTrack?: string | null;
    admissionCategoryOther?: string | null;
    passport?: DocumentInfoParam | null;
    visa?: DocumentInfoParam | null;
    efrro?: DocumentInfoParam | null;
    notifications: RawNotificationRecord[];
    customRules?: Record<"passport" | "visa" | "efrro", ReminderRuleConfig[]>;
    todayISO?: string;
  }): StudentReminderScheduleResponse {
    const today = params.todayISO || CalendarDateEngine.getTodayISO();
    const gradDate = params.expectedGraduationDate || null;
    const cleanGrad = gradDate ? gradDate.split("T")[0].trim() : null;
    const gradFormatted = cleanGrad && /^\d{4}-\d{2}-\d{2}$/.test(cleanGrad)
      ? CalendarDateEngine.formatDateDisplay(cleanGrad, true)
      : null;

    const passportGroup = this.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: params.passport?.number || "",
      expiryDate: params.passport?.expiryDate,
      expectedGraduationDate: gradDate,
      isUploaded: params.passport?.isUploaded || false,
      verificationStatus: params.passport?.verificationStatus || "not_recorded",
      existingNotifications: params.notifications,
      customRules: params.customRules?.passport,
      todayISO: today
    });

    const isVisaApp = isVisaApplicable({
      nationality: params.nationality,
      admissionCategory: params.admissionCategory,
      admissionTrack: params.admissionTrack || params.admissionCategoryOther,
      admissionCategoryOther: params.admissionCategoryOther || params.admissionTrack
    });
    const visaRules = (params.customRules?.visa && params.customRules.visa.length > 0)
      ? params.customRules.visa
      : (STANDARD_REMINDER_RULES.visa || []);

    const visaGroup: DocumentReminderGroup = isVisaApp
      ? this.calculateDocumentReminders({
          documentType: "visa",
          documentTitle: "Student Visa",
          documentNumber: params.visa?.number || "",
          expiryDate: params.visa?.expiryDate,
          expectedGraduationDate: gradDate,
          isUploaded: params.visa?.isUploaded || false,
          verificationStatus: params.visa?.verificationStatus || "not_recorded",
          existingNotifications: params.notifications,
          customRules: params.customRules?.visa,
          todayISO: today
        })
      : {
          documentType: "visa",
          documentTitle: "Student Visa",
          documentNumber: "Not Applicable",
          expiryDate: null,
          expiryDateFormatted: "Not Applicable",
          isUploaded: false,
          verificationStatus: "not_applicable",
          daysRemaining: null,
          isExpired: false,
          isAfterGraduation: false,
          graduationDate: null,
          graduationDateFormatted: null,
          graduationBoundaryStatus: "WITHIN_BOUNDARY",
          graduationBoundaryReason: "Student Visa is not applicable for Indian CIWGC students",
          schedule: visaRules.map(r => ({
            ruleId: r.id,
            ruleName: r.ruleName,
            thresholdDays: r.thresholdDays,
            channel: r.channel,
            scheduledDate: null,
            scheduledDateISO: null,
            status: "NOT_APPLICABLE",
            statusLabel: "Not Applicable",
            statusReason: "Student Visa is not applicable for Indian CIWGC students"
          }))
        };

    const isEfrroApp = isEfrroApplicable(params.nationality);
    const efrroRules = (params.customRules?.efrro && params.customRules.efrro.length > 0)
      ? params.customRules.efrro
      : (STANDARD_REMINDER_RULES.efrro || []);

    const efrroGroup: DocumentReminderGroup = isEfrroApp
      ? this.calculateDocumentReminders({
          documentType: "efrro",
          documentTitle: "eFRRO / Residential Permit",
          documentNumber: params.efrro?.number || "",
          expiryDate: params.efrro?.expiryDate,
          expectedGraduationDate: gradDate,
          isUploaded: params.efrro?.isUploaded || false,
          verificationStatus: params.efrro?.verificationStatus || "not_recorded",
          existingNotifications: params.notifications,
          customRules: params.customRules?.efrro,
          todayISO: today
        })
      : {
          documentType: "efrro",
          documentTitle: "eFRRO / Residential Permit",
          documentNumber: "Not Applicable",
          expiryDate: null,
          expiryDateFormatted: "Not Applicable",
          isUploaded: false,
          verificationStatus: "not_recorded",
          daysRemaining: null,
          isExpired: false,
          isAfterGraduation: false,
          graduationDate: null,
          graduationDateFormatted: null,
          graduationBoundaryStatus: "WITHIN_BOUNDARY",
          graduationBoundaryReason: "eFRRO registration is not applicable for Indian nationals",
          schedule: efrroRules.map(r => ({
            ruleId: r.id,
            ruleName: r.ruleName,
            thresholdDays: r.thresholdDays,
            channel: r.channel,
            scheduledDate: null,
            scheduledDateISO: null,
            status: "NOT_APPLICABLE",
            statusLabel: "Not Applicable",
            statusReason: "eFRRO registration is not applicable for Indian nationals"
          }))
        };

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
      graduationDate: cleanGrad,
      graduationDateFormatted: gradFormatted,
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
}
