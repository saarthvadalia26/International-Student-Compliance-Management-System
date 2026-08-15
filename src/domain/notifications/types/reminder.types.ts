export type ReminderStatus = 
  | "NOT_APPLICABLE" 
  | "NOT_DUE" 
  | "DUE" 
  | "DISPATCHED" 
  | "FAILED" 
  | "EXPIRED";

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
  failureReason?: string | null;
  notificationId?: string | null;
}

export interface DocumentReminderGroup {
  documentType: "passport" | "visa" | "efrro";
  documentTitle: string;
  documentNumber: string;
  expiryDate: string | null;
  expiryDateFormatted: string;
  isUploaded: boolean;
  verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected";
  daysRemaining: number | null;
  isExpired: boolean;
  schedule: ReminderScheduleItem[];
}

export interface StudentReminderScheduleResponse {
  studentId: string;
  evaluatedAt: string;
  documents: {
    passport: DocumentReminderGroup;
    visa: DocumentReminderGroup;
    efrro: DocumentReminderGroup;
  };
  summary: {
    totalRules: number;
    dueCount: number;
    dispatchedCount: number;
    failedCount: number;
    notDueCount: number;
    notApplicableCount: number;
  };
}
