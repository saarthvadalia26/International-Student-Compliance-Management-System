import { ComplianceDocument, StudentSnapshot, ComplianceStatus } from "../types/student-snapshot.types";

export interface IDocumentDbRow {
  id: string;
  student_id: string;
  version_number: number;
  is_active: boolean;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  file_path: string;
  verification_status: "pending" | "verified" | "rejected";
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface ISnapshotDbRow {
  student_id: string;
  passport_status: string;
  passport_expiry: string | null;
  visa_status: string;
  visa_expiry: string | null;
  efrro_status: string;
  efrro_expiry: string | null;
  compliance_score: number;
  compliance_status: string;
  days_until_expiry: number | null;
  created_at: string;
  updated_at: string;
}

export class DocumentMapper {
  static toDomain(row: IDocumentDbRow): ComplianceDocument {
    return {
      id: row.student_id, // Let id represent unique document identify link
      studentId: row.student_id,
      versionNumber: row.version_number,
      isActive: row.is_active,
      documentNumber: row.document_number,
      issueDate: new Date(row.issue_date),
      expiryDate: new Date(row.expiry_date),
      filePath: row.file_path,
      verificationStatus: row.verification_status,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
      rejectionReason: row.rejection_reason,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  static toDb(doc: ComplianceDocument): Record<string, unknown> {
    return {
      id: doc.id,
      student_id: doc.studentId,
      version_number: doc.versionNumber,
      is_active: doc.isActive,
      document_number: doc.documentNumber,
      issue_date: doc.issueDate.toISOString().split("T")[0],
      expiry_date: doc.expiryDate.toISOString().split("T")[0],
      file_path: doc.filePath,
      verification_status: doc.verificationStatus,
      verified_by: doc.verifiedBy,
      verified_at: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      rejection_reason: doc.rejectionReason,
      notes: doc.notes,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString(),
      deleted_at: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      created_by: doc.createdBy,
      updated_by: doc.updatedBy
    };
  }

  static toSnapshotDomain(row: ISnapshotDbRow): StudentSnapshot {
    return {
      studentId: row.student_id,
      passportStatus: row.passport_status as ComplianceStatus,
      passportExpiry: row.passport_expiry ? new Date(row.passport_expiry) : null,
      visaStatus: row.visa_status as ComplianceStatus,
      visaExpiry: row.visa_expiry ? new Date(row.visa_expiry) : null,
      efrroStatus: row.efrro_status as ComplianceStatus,
      efrroExpiry: row.efrro_expiry ? new Date(row.efrro_expiry) : null,
      complianceScore: row.compliance_score,
      complianceStatus: row.compliance_status as ComplianceStatus,
      daysUntilExpiry: row.days_until_expiry,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  static toSnapshotDb(snap: StudentSnapshot): Record<string, unknown> {
    return {
      student_id: snap.studentId,
      passport_status: snap.passportStatus,
      passport_expiry: snap.passportExpiry ? snap.passportExpiry.toISOString().split("T")[0] : null,
      visa_status: snap.visaStatus,
      visa_expiry: snap.visaExpiry ? snap.visaExpiry.toISOString().split("T")[0] : null,
      efrro_status: snap.efrroStatus,
      efrro_expiry: snap.efrroExpiry ? snap.efrroExpiry.toISOString().split("T")[0] : null,
      compliance_score: snap.complianceScore,
      compliance_status: snap.complianceStatus,
      days_until_expiry: snap.daysUntilExpiry,
      created_at: snap.createdAt.toISOString(),
      updated_at: snap.updatedAt.toISOString()
    };
  }
}
