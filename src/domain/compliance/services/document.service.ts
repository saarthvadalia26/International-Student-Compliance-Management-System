import { ComplianceDocument, ComplianceDocumentType, StudentSnapshot, ComplianceStatus } from "../types/student-snapshot.types";
import { IComplianceDocumentRepository } from "../repositories/document.repository";
import { IStorageProvider } from "../../storage/providers/storage.provider";
import { 
  DocumentNotFoundError, 
  VerificationFailedError, 
  ValidationFailedError 
} from "../utils/document-errors";

export class ExpiryCalculationService {
  static getDaysUntilExpiry(expiryDate: Date | null): number | null {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export class ComplianceStatusService {
  private static warningThresholdDays = 60;

  static calculateStatus(expiryDate: Date | null, verificationStatus: "pending" | "verified" | "rejected" | null, hasUploadedDocument?: boolean): ComplianceStatus {
    if (!hasUploadedDocument && hasUploadedDocument !== undefined) return "NOT_UPLOADED";
    if (!verificationStatus) return "NOT_UPLOADED";
    if (verificationStatus === "rejected") return "REJECTED";
    if (verificationStatus === "pending") return "PENDING_VERIFICATION";
    
    if (!expiryDate) return "NOT_UPLOADED";
    
    const daysLeft = ExpiryCalculationService.getDaysUntilExpiry(expiryDate);
    if (daysLeft === null) return "NOT_UPLOADED";
    if (daysLeft <= 0) return "EXPIRED";
    if (daysLeft < this.warningThresholdDays) return "WARNING";
    
    return "COMPLIANT";
  }

  static calculateScoreAndStatus(snap: Partial<StudentSnapshot>): { score: number, status: ComplianceStatus, daysLeft: number | null } {
    const statuses: ComplianceStatus[] = [
      snap.passportStatus || "MISSING",
      snap.visaStatus || "MISSING",
      snap.efrroStatus || "MISSING"
    ];

    let verifiedCount = 0;
    let expiredOrRejected = false;
 
    statuses.forEach(status => {
      if (status === "COMPLIANT" || status === "WARNING") {
        verifiedCount++;
      } else if (status === "EXPIRED" || status === "REJECTED") {
        expiredOrRejected = true;
      }
    });

    // Score calculations: verified and warning count holds values
    let score = 0;
    if (!expiredOrRejected) {
      if (verifiedCount === 3) score = 100;
      else if (verifiedCount === 2) score = 70;
      else if (verifiedCount === 1) score = 40;
    } else {
      score = 10;
    }

    // Determine global status
    let globalStatus: ComplianceStatus = "COMPLIANT";
    if (statuses.includes("EXPIRED")) globalStatus = "EXPIRED";
    else if (statuses.includes("REJECTED")) globalStatus = "REJECTED";
    else if (statuses.includes("MISSING")) globalStatus = "MISSING";
    else if (statuses.includes("PENDING_VERIFICATION")) globalStatus = "PENDING_VERIFICATION";
    else if (statuses.includes("WARNING")) globalStatus = "WARNING";

    // Calc min days left values
    const daysList = [
      ExpiryCalculationService.getDaysUntilExpiry(snap.passportExpiry || null),
      ExpiryCalculationService.getDaysUntilExpiry(snap.visaExpiry || null),
      ExpiryCalculationService.getDaysUntilExpiry(snap.efrroExpiry || null)
    ].filter((d): d is number => d !== null);

    const minDays = daysList.length > 0 ? Math.min(...daysList) : null;

    return { score, status: globalStatus, daysLeft: minDays };
  }
}

export class SnapshotService {
  constructor(private repository: IComplianceDocumentRepository) {}

  async refreshSnapshot(studentId: string): Promise<StudentSnapshot> {
    console.log(`[SNAPSHOT_SERVICE] Refreshing compliance snapshot metric metrics for: ${studentId}`);
    
    // Fetch active items
    const [passport, visa, efrro] = await Promise.all([
      this.repository.getActiveDocument(studentId, "passport"),
      this.repository.getActiveDocument(studentId, "visa"),
      this.repository.getActiveDocument(studentId, "efrro")
    ]);

    const pStatus = ComplianceStatusService.calculateStatus(passport ? passport.expiryDate : null, passport ? passport.verificationStatus : null);
    const vStatus = ComplianceStatusService.calculateStatus(visa ? visa.expiryDate : null, visa ? visa.verificationStatus : null);
    const eStatus = ComplianceStatusService.calculateStatus(efrro ? efrro.expiryDate : null, efrro ? efrro.verificationStatus : null);

    const partialSnap: Partial<StudentSnapshot> = {
      passportStatus: pStatus,
      passportExpiry: passport ? passport.expiryDate : null,
      passportNumber: passport ? passport.documentNumber : null,
      visaStatus: vStatus,
      visaExpiry: visa ? visa.expiryDate : null,
      visaNumber: visa ? visa.documentNumber : null,
      efrroStatus: eStatus,
      efrroExpiry: efrro ? efrro.expiryDate : null,
      efrroNumber: efrro ? efrro.documentNumber : null
    };

    const calculated = ComplianceStatusService.calculateScoreAndStatus(partialSnap);
    const efrroDaysLeft = ExpiryCalculationService.getDaysUntilExpiry(efrro ? efrro.expiryDate : null);

    const newSnapshot: StudentSnapshot = {
      studentId,
      passportStatus: pStatus,
      passportExpiry: passport ? passport.expiryDate : null,
      passportNumber: passport ? passport.documentNumber : null,
      visaStatus: vStatus,
      visaExpiry: visa ? visa.expiryDate : null,
      visaNumber: visa ? visa.documentNumber : null,
      efrroStatus: eStatus,
      efrroExpiry: efrro ? efrro.expiryDate : null,
      efrroNumber: efrro ? efrro.documentNumber : null,
      complianceScore: calculated.score,
      complianceStatus: calculated.status,
      daysUntilExpiry: calculated.daysLeft,
      daysUntilEfrroExpiry: efrroDaysLeft,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.repository.upsertSnapshot(newSnapshot);
  }
}

export class VersionHistoryService {
  constructor(private repository: IComplianceDocumentRepository) {}

  async getHistory(studentId: string, type: ComplianceDocumentType): Promise<ComplianceDocument[]> {
    return this.repository.getVersionHistory(studentId, type);
  }
}

export class VerificationService {
  constructor(
    private repository: IComplianceDocumentRepository,
    private snapshotService: SnapshotService,
    private storageProvider: IStorageProvider,
    private notificationEngine?: unknown
  ) {}

  async verifyDocument(id: string, type: ComplianceDocumentType, status: "verified" | "rejected", actorId: string | null, reason?: string, notes?: string): Promise<ComplianceDocument> {
    console.log(`[VERIFICATION_SERVICE] Executing verify workflow on: ${type} (ID: ${id}) status: ${status}`);
    
    if (status === "rejected" && (!reason || !reason.trim())) {
      throw new VerificationFailedError("Rejection reason is required when rejecting documents.");
    }

    const updated = await this.repository.updateVerificationStatus(
      id,
      type,
      status,
      actorId,
      reason,
      notes
    );

    // Storage Lifecycle Hooks
    if (status === "rejected") {
      try {
        await this.repository.updateStorageLifecycle(id, type, "REJECTED", reason || "Staff Rejected", false);
        await this.repository.logStorageAudit(updated.studentId, updated.id, type, "Rejection", actorId || "System", undefined, { reason });
      } catch (err) {
        console.error("[STORAGE_LIFECYCLE_ERROR] Failed to record rejection storage lifecycle:", err);
      }
    } else if (status === "verified") {
      await this.repository.updateStorageLifecycle(id, type, "ACTIVE");
      await this.repository.logStorageAudit(updated.studentId, updated.id, type, "Approval", actorId || "System");
    }

    // Recompute cached snapshot score
    await this.snapshotService.refreshSnapshot(updated.studentId);

    // Dispatch notification
    if (this.notificationEngine) {
      await (this.notificationEngine as { dispatchVerificationEvent: (s: string, t: string, st: string, r?: string) => Promise<void> }).dispatchVerificationEvent(
        updated.studentId,
        type,
        status,
        reason
      ).catch((err: unknown) => console.error("[VERIFICATION_SERVICE_ERROR] Notification dispatch failed:", err));
    }

    return updated;
  }
}

import { FileSignatureValidator } from "../validators/magic-number.validator";
import { StubAntivirusScanner } from "./antivirus.service";

export class ComplianceDocumentService {
  constructor(
    private repository: IComplianceDocumentRepository,
    private storageProvider: IStorageProvider,
    private snapshotService: SnapshotService
  ) {}

  async uploadDocument(
    studentId: string,
    type: ComplianceDocumentType,
    fileBuffer: Buffer,
    fileName: string,
    docNumber: string,
    issueDate: Date,
    expiryDate: Date,
    actorId: string | null
  ): Promise<ComplianceDocument> {
    console.log(`[DOCUMENT_SERVICE] Received upload request for student ${studentId} type: ${type}`);

    // 1. Run Zod Validation checks (File Size, Extension)
    const fileType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                     fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const { systemConfigService } = await import("@/lib/system-config");
    const maxUploadSizeBytes = await systemConfigService.getMaxUploadSizeBytes();
    const { createDocumentUploadSchema } = await import("../validators/document.validator");
    const uploadSchema = createDocumentUploadSchema(maxUploadSizeBytes);

    const parse = uploadSchema.safeParse({
      studentId,
      documentNumber: docNumber,
      issueDate: issueDate.toISOString().split("T")[0],
      expiryDate: expiryDate.toISOString().split("T")[0],
      fileSize: fileBuffer.length,
      fileType
    });

    if (!parse.success) {
      throw new ValidationFailedError(`Validation error: ${parse.error.issues[0]?.message || "Invalid payload"}`);
    }

    // 2. Validate Magic Number Signature
    if (!FileSignatureValidator.isValidSignature(fileBuffer, fileType as 'application/pdf' | 'image/jpeg' | 'image/png')) {
      throw new ValidationFailedError("File signature mismatch. The file content does not match its extension.");
    }

    // 3. Antivirus Scan
    const avScanner = new StubAntivirusScanner();
    const isSafe = await avScanner.scanBuffer(fileBuffer, fileName);
    if (!isSafe) {
      throw new ValidationFailedError("Security violation: Malware detected in uploaded document.");
    }

    // 4. Fetch existing genuine uploaded versions to resolve sequence
    const currentActive = await this.repository.getActiveDocument(studentId, type);
    const history = await this.repository.getVersionHistory(studentId, type);
    const validHistory = history.filter(v => v.filePath && v.filePath !== "pending_upload" && v.filePath !== "null");
    const highestVersion = validHistory.length > 0 ? Math.max(...validHistory.map(v => v.versionNumber || 0)) : 0;
    const nextVersion = highestVersion + 1;

    // 5. Upload file to secure isolated storage folder
    const ext = fileType === "application/pdf" ? "pdf" : fileType === "image/png" ? "png" : "jpg";
    const uniqueFileId = crypto.randomUUID();
    const storagePath = await this.storageProvider.upload(
      "iscms-documents",
      `students/${studentId}/${type}/v${nextVersion}/${uniqueFileId}.${ext}`,
      fileBuffer,
      fileType
    );

    // 4. Save metadata records in database
    const newDoc = await this.repository.createDocumentVersion({
      studentId,
      versionNumber: nextVersion,
      isActive: true,
      documentNumber: docNumber,
      issueDate,
      expiryDate,
      filePath: storagePath,
      verificationStatus: "pending",
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      notes: null,
      createdBy: actorId,
      updatedBy: actorId
    }, type);

    // 5. Deactivate old records & mark superseded version
    if (currentActive) {
      await this.repository.deactivatePreviousVersions(studentId, type, newDoc.id);
      
      const newStatus = currentActive.verificationStatus === "verified" ? "ARCHIVED_SUPERSEDED" : "REJECTED_SUPERSEDED";
      await this.repository.updateStorageLifecycle(currentActive.id, type, newStatus, "Superseded by newer version", true);
      await this.repository.logStorageAudit(studentId, currentActive.id, type, "Superseded", "System", undefined, { reason: "Superseded" });
    }

    // 6. Refresh score snapshot
    await this.snapshotService.refreshSnapshot(studentId);

    // 7. Log Upload Audit
    await this.repository.logStorageAudit(studentId, newDoc.id, type, "Upload", actorId || "System", undefined, { fileName, fileSize: fileBuffer.length });

    return newDoc;
  }

  async replaceDocument(
    studentId: string,
    type: ComplianceDocumentType,
    fileBuffer: Buffer,
    docNumber: string,
    issueDate: Date,
    expiryDate: Date,
    actorId: string | null
  ): Promise<ComplianceDocument> {
    console.log(`[DOCUMENT_SERVICE] Executing file replacement trigger for ${type} of student ${studentId}`);
    
    const active = await this.repository.getActiveDocument(studentId, type);
    if (!active) {
      throw new DocumentNotFoundError("No active document version found to replace.");
    }

    // Treat replacement as a new upload with incremented version history sequence for audit compliance
    return this.uploadDocument(
      studentId,
      type,
      fileBuffer,
      `replaced_document.pdf`,
      docNumber,
      issueDate,
      expiryDate,
      actorId
    );
  }

  async softDeleteDocument(id: string, type: ComplianceDocumentType, actorId: string | null): Promise<boolean> {
    console.log(`[DOCUMENT_SERVICE] Archiving/Soft deleting document version record: ${id} of type ${type} by actor ${actorId}`);
    // Soft deletion logic would update target deleted_at variables in the database and recompute snapshot stats
    return true;
  }
}
