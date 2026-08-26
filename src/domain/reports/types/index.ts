export type ComplianceStatus = "COMPLIANT" | "WARNING" | "EXPIRED" | "PENDING_VERIFICATION" | "REJECTED" | "MISSING";

export interface DashboardMetrics {
  totalStudents: number;
  fullyCompliantStudents: number;
  efrroExpiring30Days: number;
  efrroExpiring15Days: number;
  efrroExpired: number;
  pendingEfrroVerification: number;
  notificationsSentToday: number;
  failedNotificationsToday: number;
  pendingUploadReviews: number;
}

export interface StudentReportRow {
  studentId: string;
  registrationNumber: string;
  fullName: string;
  nationality: string;
  school: string;
  programme: string;
  academicLevel?: string | null;
  academicLevelLabel?: string | null;
  expectedGraduation: Date | null;
  status: string;
  complianceStatus: ComplianceStatus;
  admissionCategory?: string | null;
  iccrApplicationNumber?: string | null;
  siiApplicationNumber?: string | null;
  nfsuCampus?: string | null;
}

export interface EfrroReportRow {
  studentId: string;
  registrationNumber: string;
  fullName: string;
  efrroNumber: string | null;
  expiryDate: Date | null;
  daysRemaining: number | null;
  complianceStatus: ComplianceStatus;
  reminderRule: string | null;
  reminderSent: boolean;
  lastReminderSentAt: Date | null;
  verificationStatus: "pending" | "verified" | "rejected" | null;
  reviewerName: string | null;
  reviewedAt: Date | null;
}

export interface NotificationReportRow {
  notificationId: string;
  studentName: string;
  registrationNumber: string;
  reminderDate: Date;
  reminderRuleDays: number;
  channel: string;
  status: "queued" | "sending" | "sent" | "failed" | "cancelled";
  retryCount: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  uploadLinkGenerated: boolean;
  documentUploaded: boolean;
  verificationStatus: string | null;
}

export interface AuditReportRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  timestamp: Date;
  resource: string;
  exportType: string | null;
  filtersApplied: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ReportPagination {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportFilters {
  search?: string;
  academicYear?: string;
  school?: string;
  course?: string;
  country?: string;
  gender?: string;
  admissionCategory?: string;
  nfsuCampus?: string;
  complianceStatus?: string;
  efrroStatus?: string;
  expiringWithinDays?: number;
}
