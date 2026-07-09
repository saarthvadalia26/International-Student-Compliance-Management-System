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
}

export interface StudentSnapshot {
  studentId: string;
  passportStatus: ComplianceStatus;
  passportExpiry: Date | null;
  visaStatus: ComplianceStatus;
  visaExpiry: Date | null;
  efrroStatus: ComplianceStatus;
  efrroExpiry: Date | null;
  complianceScore: number;
  complianceStatus: ComplianceStatus;
  daysUntilExpiry: number | null;
  createdAt: Date;
  updatedAt: Date;
}
