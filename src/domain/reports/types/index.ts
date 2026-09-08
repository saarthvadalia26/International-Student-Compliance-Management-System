export type ComplianceStatus = "COMPLIANT" | "WARNING" | "EXPIRED" | "PENDING_VERIFICATION" | "REJECTED" | "MISSING";

export type ComplianceDocumentType = "passport" | "visa" | "efrro";

export interface DashboardMetrics {
  totalStudents: number;
  fullyCompliantStudents: number;
  expiringIn30Days: number;
  criticalIn15Days: number;
  expiredDocuments: number;
  renewalsRecorded: number;
  notificationsSentToday: number;
  failedNotifications: number;
  failedNotificationsToday?: number;

  // Detailed breakdown metadata
  documentCounts?: {
    expiringIn30DaysDocs: number;
    criticalIn15DaysDocs: number;
    expiredDocs: number;
  };
  notificationsByChannel?: {
    email: number;
    whatsapp: number;
  };
  renewalsByDocType?: {
    passport: number;
    visa: number;
    efrro: number;
  };
  expiringByDocType?: {
    passport: { critical15: number; expiring30: number; expired: number; valid: number };
    visa: { critical15: number; expiring30: number; expired: number; valid: number };
    efrro: { critical15: number; expiring30: number; expired: number; valid: number };
  };
}

export type ComplianceDrilldownCategory =
  | "total_students"
  | "compliant"
  | "expiring_30"
  | "critical_15"
  | "expired"
  | "renewals"
  | "notifications_today"
  | "failed_notifications";

export interface ComplianceDrilldownItem {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  documentType?: "passport" | "visa" | "efrro";
  documentNumber?: string | null;
  expiryDate?: string | null;
  issueDate?: string | null;
  daysRemaining?: number | null;
  daysExpired?: number | null;
  status?: string;
  complianceStatus?: string;
  nationality?: string | null;
  nationalityCode?: string | null;
  nationalityDemonym?: string | null;
  missingDocuments?: string[];
  academicProgram?: string | null;
  passportExpiry?: string | null;
  visaExpiry?: string | null;
  efrroExpiry?: string | null;
  versionLabel?: string;
  recordedAt?: string;
  channel?: "email" | "whatsapp" | string;
  failureReason?: string | null;
  retryCount?: number;
  timestamp?: string;
}

export interface ComplianceDrilldownResponse {
  category: ComplianceDrilldownCategory;
  title: string;
  totalCount: number;
  items: ComplianceDrilldownItem[];
  byDocType?: {
    passport: number;
    visa: number;
    efrro: number;
  };
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

export * from "./dimensional-reports";

