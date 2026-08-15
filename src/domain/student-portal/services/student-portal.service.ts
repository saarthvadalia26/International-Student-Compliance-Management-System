import * as crypto from "crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { SupabaseStudentPortalRepository } from "../repositories/student-portal.repository";
import { SupabaseNotificationRepository } from "@/domain/notifications/repositories/notification.repository";
import { StorageProviderFactory } from "@/domain/storage/factory";
import { UploadToken } from "../types";
import { Branding } from "@/config/branding";

export class StudentPortalService {
  private portalRepo = new SupabaseStudentPortalRepository();
  private notifRepo = new SupabaseNotificationRepository();
  private storageProvider = StorageProviderFactory.getProvider();

  /**
   * Generates a secure, 7-day single-use upload/login token
   */
  async generateUploadToken(
    studentId: string, 
    purpose: UploadToken["purpose"] = "UPLOAD", 
    createdBy: string | null = null
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    await this.portalRepo.createUploadToken(studentId, purpose, hash, expiresAt, createdBy);
    return rawToken;
  }

  /**
   * Verifies the token and creates a Supabase Auth magic link to authenticate the student portal session
   */
  async verifyAndGenerateLoginLink(rawToken: string, baseUrl: string): Promise<string> {
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const token = await this.portalRepo.verifyUploadToken(hash);

    if (!token) {
      throw new Error("Invalid or unrecognizable secure token.");
    }
    if (token.usedAt) {
      throw new Error("This secure link has already been used.");
    }
    if (token.expiresAt.getTime() < Date.now()) {
      throw new Error("This secure renewal link has expired.");
    }

    // Load student contact to resolve their email
    const profile = await this.portalRepo.getStudentProfile(token.studentId);
    if (!profile || !profile.email) {
      throw new Error("Student email coordinate not found.");
    }

    const supabase = getAdminSupabase();

    // Self-healing: Check if the user exists in auth.users, and create them if missing
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("[STUDENT_PORTAL_SERVICE_ERROR] Failed to list auth users:", listError.message);
    }
    const existingUser = userList?.users.find(u => u.email?.toLowerCase() === profile.email.toLowerCase());
    
    if (!existingUser) {
      console.log(`[STUDENT_PORTAL_SERVICE] Bootstrap student auth user: ${profile.email}`);
      const { error: createError } = await supabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
        user_metadata: {
          role: "student",
          student_id: token.studentId,
          username: profile.fullName
        }
      });
      if (createError) {
        throw new Error(`[AUTH_BOOTSTRAP_FAILED] ${createError.message}`);
      }
    }

    // Generate standard passwordless magiclink using Supabase Auth admin API
    const targetRedirect = token.purpose === "UPLOAD" ? `${baseUrl}/student/efrro` : `${baseUrl}/student/dashboard`;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
      options: {
        redirectTo: targetRedirect
      }
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(`[SUPABASE_LINK_GENERATION_FAILED] ${linkError?.message || "Link blank"}`);
    }

    // Invalidate the single-use token
    await this.portalRepo.markTokenUsed(token.id);

    // Log the successful verification activity
    await this.portalRepo.logActivity(
      token.studentId,
      `VERIFIED_TOKEN_${token.purpose}`,
      null,
      null,
      { tokenId: token.id }
    );

    return linkData.properties.action_link;
  }

  /**
   * Safe document renewal upload workflow with strict eligibility validation and R2 storage protection
   */
  async uploadDocument(
    studentId: string,
    documentType: "passport" | "visa" | "efrro",
    filename: string,
    fileBuffer: Buffer,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<{ versionId: string; versionNumber: number }> {
    console.log(`[STUDENT_PORTAL_SERVICE] Initiating upload pipeline for student: ${studentId}, type: ${documentType}`);

    const { DocumentUploadEligibilityEngine } = await import("@/domain/compliance/services/upload-eligibility.service");

    // 1. CRITICAL: Evaluate upload eligibility BEFORE touching storage or creating files
    const eligibility = await DocumentUploadEligibilityEngine.evaluateEligibility(studentId, documentType);
    if (!eligibility.canUpload) {
      console.warn(`[STUDENT_PORTAL_SECURITY] Blocked unauthorized upload attempt for student ${studentId}, type ${documentType}. Reason: ${eligibility.reasonCode}`);
      throw new Error(eligibility.userMessage || "Document upload is currently unavailable. Your current document is still valid.");
    }

    // 2. File Type Check (PDF, JPG, PNG)
    const lowerName = filename.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf");
    const isJpg = lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg");
    const isPng = lowerName.endsWith(".png");

    if (!isPdf && !isJpg && !isPng) {
      await this.portalRepo.logUploadAudit({
        studentId,
        filename,
        fileSize: fileBuffer.length,
        checksum: "N/A",
        status: "failed_type",
        ipAddress,
        userAgent
      });
      throw new Error("Allowed file types: PDF, JPG, and PNG.");
    }

    // 3. File Size Validation (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      await this.portalRepo.logUploadAudit({
        studentId,
        filename,
        fileSize: fileBuffer.length,
        checksum: "N/A",
        status: "failed_size",
        ipAddress,
        userAgent
      });
      throw new Error("Maximum file size exceeded (limit: 5MB).");
    }

    // 4. Duplicate Checksum Verification (SHA-256)
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const isDuplicate = await this.portalRepo.checkDuplicateChecksum(checksum);
    if (isDuplicate) {
      await this.portalRepo.logUploadAudit({
        studentId,
        filename,
        fileSize: fileBuffer.length,
        checksum,
        status: "failed_duplicate",
        ipAddress,
        userAgent
      });
      throw new Error("This document has already been uploaded previously.");
    }

    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const ext = isPdf ? "pdf" : isPng ? "png" : "jpg";
    const mimeType = isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg";
    const bucketName = `${documentType}-documents`;
    const year = new Date().getFullYear();
    const versionUuid = crypto.randomUUID();
    const storagePath = `${documentType}/${studentId}/${year}/${versionUuid}.${ext}`;

    // 5. Upload file buffer to Storage Provider (R2 / Supabase Storage)
    try {
      await this.storageProvider.upload(
        bucketName,
        storagePath,
        fileBuffer,
        mimeType
      );
    } catch (error: unknown) {
      const storageError = error as Error;
      console.error("[STORAGE_UPLOAD_ERROR] Storage write failed:", storageError.message);
      throw new Error(`[STORAGE_WRITE_FAILED] ${storageError.message}`);
    }

    try {
      // 6. Query existing genuine versions to resolve sequence number
      const tableName = documentType === "passport" 
        ? "passport_versions" 
        : documentType === "visa" 
        ? "visa_versions" 
        : "efrro_versions";

      const { data: existingVersions } = await supabase
        .from(tableName)
        .select("version_number, is_active, file_path")
        .eq("student_id", studentId)
        .is("deleted_at", null)
        .order("version_number", { ascending: false });

      const validExisting = existingVersions?.filter(v => v.file_path && v.file_path !== "pending_upload" && v.file_path !== "null") || [];
      const highestVer = validExisting.length > 0 ? Math.max(...validExisting.map(v => v.version_number || 0)) : 0;
      const nextVersion = highestVer + 1;

      // Cancel future notifications scheduled for old eFRRO if this is an eFRRO upload
      if (documentType === "efrro") {
        await this.notifRepo.cancelScheduledNotifications(studentId, "efrro");
      }

      // 7. Write version record (pending verification, preserving active v1 if exists)
      const nowStr = new Date().toISOString().split("T")[0];
      const { data: insertedVer, error: verError } = await supabase
        .from(tableName)
        .insert({
          student_id: studentId,
          version_number: nextVersion,
          document_number: "PENDING_VERIFICATION",
          issue_date: nowStr,
          expiry_date: nowStr,
          file_path: storagePath,
          verification_status: "pending",
          is_active: false,
          notes: "Student uploaded document renewal copy via Portal"
        })
        .select("id, version_number")
        .single();

      if (verError || !insertedVer) {
        throw new Error(`[DB_INSERT_FAILED] Failed to record ${documentType} version: ${verError?.message}`);
      }

      // 8. If an early upload authorization was used or replacement request was active, complete & consume it
      await DocumentUploadEligibilityEngine.consumeActiveAuthorization(
        studentId,
        documentType,
        insertedVer.id
      );

      // 9. Log upload audit
      await this.portalRepo.logUploadAudit({
        studentId,
        filename,
        fileSize: fileBuffer.length,
        checksum,
        status: "success",
        ipAddress,
        userAgent
      });

      // 10. Update student snapshot status to PENDING_VERIFICATION
      const snapshotUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      if (documentType === "efrro") {
        snapshotUpdate.efrro_status = "PENDING_VERIFICATION";
      }

      await supabase
        .from("student_snapshot")
        .update(snapshotUpdate)
        .eq("student_id", studentId);

      // 11. Log student activity
      await this.portalRepo.logActivity(
        studentId,
        `UPLOADED_${documentType.toUpperCase()}_RENEWAL`,
        ipAddress,
        userAgent,
        { versionId: insertedVer.id, versionNumber: nextVersion, filename }
      );

      // 12. Notify compliance staff for review
      const profile = await this.portalRepo.getStudentProfile(studentId);
      if (profile) {
        const adminEmail = Branding.supportEmail;
        const reviewLink = documentType === "efrro" ? `/reports/efrro` : `/students/${studentId}`;
        
        await this.notifRepo.queueNotification({
          studentId,
          documentType,
          status: "queued",
          channel: "email",
          recipientAddress: adminEmail,
          triggerSource: "portal_upload_event",
          idempotencyKey: `staff_alert:${studentId}:${documentType}:${insertedVer.id}`,
          notificationContext: {
            student_name: profile.fullName,
            registration_number: profile.registrationNumber,
            country: profile.nationality,
            upload_time: new Date().toLocaleTimeString(),
            secure_upload_link: reviewLink
          }
        });
      }

      return {
        versionId: insertedVer.id,
        versionNumber: nextVersion
      };

    } catch (dbErr) {
      // Roll back storage file if database operations fail
      console.error("[PORTAL_UPLOAD_ROLLBACK] Database write failed. Rolling back storage file path:", storagePath);
      await this.storageProvider.delete(bucketName, storagePath);
      throw dbErr;
    }
  }

  /**
   * Compatibility wrapper for eFRRO renewal uploads
   */
  async uploadEfrroDocument(
    studentId: string,
    filename: string,
    fileBuffer: Buffer,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<void> {
    await this.uploadDocument(studentId, "efrro", filename, fileBuffer, ipAddress, userAgent);
  }
}
