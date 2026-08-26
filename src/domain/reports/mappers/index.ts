import { 
  StudentReportRow, 
  EfrroReportRow, 
  NotificationReportRow, 
  AuditReportRow,
  ComplianceStatus
} from "../types";
import { getAcademicLevelLabel } from "@/domain/academic-programs/academic-level";

export class ReportMapper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static toStudentReportRow(row: any): StudentReportRow {
    if (!row) {
      return {
        studentId: "",
        registrationNumber: "",
        fullName: "",
        nationality: "",
        school: "",
        programme: "",
        academicLevel: null,
        academicLevelLabel: "Not Specified",
        expectedGraduation: null,
        status: "",
        complianceStatus: "MISSING",
      };
    }
    return {
      studentId: row.student_id || "",
      registrationNumber: row.registration_number || "",
      fullName: row.full_name || "",
      nationality: row.nationality || "",
      school: row.school || "",
      programme: row.programme || "",
      academicLevel: row.academic_level || null,
      academicLevelLabel: getAcademicLevelLabel(row.academic_level),
      expectedGraduation: row.expected_graduation ? new Date(row.expected_graduation) : null,
      status: row.status || "",
      complianceStatus: (row.compliance_status || "MISSING") as ComplianceStatus,
      admissionCategory: row.admission_category || null,
      iccrApplicationNumber: row.iccr_application_number || null,
      siiApplicationNumber: row.sii_application_number || null,
      nfsuCampus: row.nfsu_campus || null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static toEfrroReportRow(row: any): EfrroReportRow {
    if (!row) {
      return {
        studentId: "",
        registrationNumber: "",
        fullName: "",
        efrroNumber: null,
        expiryDate: null,
        daysRemaining: null,
        complianceStatus: "MISSING",
        reminderRule: null,
        reminderSent: false,
        lastReminderSentAt: null,
        verificationStatus: null,
        reviewerName: null,
        reviewedAt: null,
      };
    }
    return {
      studentId: row.student_id || "",
      registrationNumber: row.registration_number || "",
      fullName: row.full_name || "",
      efrroNumber: row.efrro_number || null,
      expiryDate: row.efrro_expiry ? new Date(row.efrro_expiry) : null,
      daysRemaining: row.days_until_efrro_expiry !== undefined ? row.days_until_efrro_expiry : null,
      complianceStatus: (row.efrro_status || "MISSING") as ComplianceStatus,
      reminderRule: row.reminder_rule || null,
      reminderSent: !!row.reminder_sent,
      lastReminderSentAt: row.last_reminder_sent_at ? new Date(row.last_reminder_sent_at) : null,
      verificationStatus: row.verification_status || null,
      reviewerName: row.reviewer_name || null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static toNotificationReportRow(row: any): NotificationReportRow {
    if (!row) {
      return {
        notificationId: "",
        studentName: "",
        registrationNumber: "",
        reminderDate: new Date(),
        reminderRuleDays: 0,
        channel: "",
        status: "queued",
        retryCount: 0,
        lastAttemptAt: null,
        nextRetryAt: null,
        uploadLinkGenerated: false,
        documentUploaded: false,
        verificationStatus: null,
      };
    }
    return {
      notificationId: row.notification_id || "",
      studentName: row.student_name || "",
      registrationNumber: row.registration_number || "",
      reminderDate: row.reminder_date ? new Date(row.reminder_date) : new Date(),
      reminderRuleDays: row.reminder_rule_days || 0,
      channel: row.channel || "",
      status: row.status || "queued",
      retryCount: row.retry_count || 0,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : null,
      uploadLinkGenerated: !!row.upload_link_generated,
      documentUploaded: !!row.document_uploaded,
      verificationStatus: row.verification_status || null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static toAuditReportRow(row: any): AuditReportRow {
    if (!row) {
      return {
        id: "",
        actorId: null,
        actorEmail: null,
        action: "",
        timestamp: new Date(),
        resource: "",
        exportType: null,
        filtersApplied: {},
        ipAddress: null,
        userAgent: null,
      };
    }
    return {
      id: row.id || "",
      actorId: row.actor_id || null,
      actorEmail: row.actor_email || null,
      action: row.action || "",
      timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
      resource: row.resource || "",
      exportType: row.export_type || null,
      filtersApplied: row.filters_applied || {},
      ipAddress: row.ip_address || null,
      userAgent: row.user_agent || null,
    };
  }
}
