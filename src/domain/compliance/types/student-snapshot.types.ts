export type ComplianceDocumentType = "passport" | "visa" | "efrro";
export type ComplianceStatus = "COMPLIANT" | "WARNING" | "EXPIRED" | "PENDING_VERIFICATION" | "REJECTED" | "MISSING";

export interface ComplianceDocument {
  id: string;
  studentId: string;
  versionNumber: number;
  isActive: boolean;
  documentNumber: string;
  issueDate: Date;
  expiryDate: Date;
  filePath: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  
  // Storage Lifecycle
  deletionReason?: string | null;
  deletedBySystem?: boolean;
  storageProvider?: string;
  storageObjectKey?: string | null;
  storageStatus?: "ACTIVE" | "REJECTED_PENDING_DELETE" | "APPROVED_PENDING_RETENTION" | "DELETED";
}

export interface StudentSnapshot {
  studentId: string;
  passportStatus: ComplianceStatus;
  passportExpiry: Date | null;
  passportNumber?: string | null;
  visaStatus: ComplianceStatus;
  visaExpiry: Date | null;
  visaNumber?: string | null;
  efrroStatus: ComplianceStatus;
  efrroExpiry: Date | null;
  efrroNumber?: string | null;
  complianceScore: number;
  complianceStatus: ComplianceStatus;
  daysUntilExpiry: number | null;
  daysUntilEfrroExpiry?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
