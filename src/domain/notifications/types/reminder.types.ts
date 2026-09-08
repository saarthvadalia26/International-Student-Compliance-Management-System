export type ReminderStatus = 
  | "NOT_APPLICABLE" 
  | "NOT_DUE" 
  | "DUE" 
  | "DISPATCHED" 
  | "FAILED" 
  | "EXPIRED"
  | "CANCELLED";

export interface ReminderScheduleItem {
  ruleId: string;
  ruleName: string;
  thresholdDays: number;
  channel: "email" | "whatsapp" | "both";
  scheduledDate: string | null;
  scheduledDateISO: string | null;
  status: ReminderStatus;
  statusLabel: string;
  statusReason?: string;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  deliveryStatus?: string | null;
  failureReason?: string | null;
  notificationId?: string | null;
}

export interface DocumentReminderGroup {
  documentType: "passport" | "visa" | "efrro";
  documentTitle: string;
  documentNumber: string;
  expiryDate: string | null;
  expiryDateFormatted: string;
  isUploaded?: boolean;
  verificationStatus?: "not_recorded" | "pending" | "verified" | "rejected" | "not_uploaded";
  daysRemaining: number | null;
  isExpired: boolean;
  isAfterGraduation: boolean;
  graduationDate: string | null;
  graduationDateFormatted?: string | null;
  graduationBoundaryStatus: "WITHIN_BOUNDARY" | "AFTER_GRADUATION" | "MISSING_GRADUATION_DATE";
  graduationBoundaryReason?: string | null;
  schedule: ReminderScheduleItem[];
}

export interface StudentReminderScheduleResponse {
  studentId: string;
  evaluatedAt: string;
  graduationDate: string | null;
  graduationDateFormatted?: string | null;
  passport: DocumentReminderGroup;
  visa: DocumentReminderGroup;
  efrro: DocumentReminderGroup;
  documents: Record<"passport" | "visa" | "efrro", DocumentReminderGroup>;
  summary: {
    totalRules: number;
    dueCount: number;
    dispatchedCount: number;
    failedCount: number;
    notDueCount: number;
    notApplicableCount: number;
    byDocument: Record<"passport" | "visa" | "efrro", {
      totalRules: number;
      dueCount: number;
      dispatchedCount: number;
      failedCount: number;
      notDueCount: number;
      notApplicableCount: number;
    }>;
  };
}
