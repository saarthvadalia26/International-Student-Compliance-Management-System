import { ComplianceDocument, ComplianceDocumentType, StudentSnapshot, ComplianceStatus } from "../types/student-snapshot.types";
import { IComplianceDocumentRepository } from "../repositories/document.repository";
import { IStorageService } from "./storage.service";
import { DocumentUploadSchema } from "../validators/document.validator";
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

  static calculateStatus(expiryDate: Date | null, verificationStatus: "pending" | "verified" | "rejected" | null): ComplianceStatus {
    if (!verificationStatus) return "MISSING";
    if (verificationStatus === "rejected") return "REJECTED";
    if (verificationStatus === "pending") return "PENDING_VERIFICATION";
    
    if (!expiryDate) return "MISSING";
    
    const daysLeft = ExpiryCalculationService.getDaysUntilExpiry(expiryDate);
    if (daysLeft === null) return "MISSING";
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
    private notificationEngine?: any // Dependency injected loosely for now
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

    // Recompute cached snapshot score
    await this.snapshotService.refreshSnapshot(updated.studentId);

    // Dispatch notification
    if (this.notificationEngine) {
      await (this.notificationEngine as { dispatchVerificationEvent: Function }).dispatchVerificationEvent(
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
    private storageService: IStorageService,
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

    const parse = DocumentUploadSchema.safeParse({
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

    // 4. Fetch current active document version to resolve sequence
    const currentActive = await this.repository.getActiveDocument(studentId, type);
    const nextVersion = currentActive ? currentActive.versionNumber + 1 : 1;

    // 3. Upload file to secure isolated storage folder
    const storagePath = await this.storageService.uploadFile(
      studentId,
      type,
      fileBuffer,
      `v${nextVersion}_${fileName}`
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

    // 5. Deactivate old records
    await this.repository.deactivatePreviousVersions(studentId, type, newDoc.id);

    // 6. Refresh score snapshot
    await this.snapshotService.refreshSnapshot(studentId);

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
