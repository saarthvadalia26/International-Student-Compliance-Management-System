export interface StudentPortalProfile {
  studentId: string;
  fullName: string;
  registrationNumber: string;
  programme: string;
  school: string;
  nationality: string;
  email: string;
  phoneHome: string;
  phoneLocal: string;
  efrroStatus: string;
  efrroExpiry: string | null;
  daysRemaining: number | null;
  lastUploadDate: string | null;
}

export interface UploadToken {
  id: string;
  studentId: string;
  purpose: "UPLOAD" | "LOGIN" | "PASSWORDLESS_LOGIN";
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface StudentActivityLog {
  id: string;
  studentId: string;
  action: string;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
}

export interface UploadAuditLog {
  id: string;
  studentId: string;
  filename: string;
  fileSize: number;
  checksum: string;
  status: "success" | "failed_size" | "failed_type" | "failed_virus" | "failed_duplicate";
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface StudentHistoryRow {
  versionId: string;
  filename: string;
  uploadDate: string;
  verificationStatus: string;
  reviewerComments: string | null;
  reviewedAt: string | null;
}

export interface StudentReminderHistoryRow {
  id: string;
  channel: string;
  sentAt: string;
  triggerSource: string;
  status: string;
}
