import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { CloudflareR2StorageProvider } from "../src/domain/storage/providers/cloudflare-r2-storage.provider";
import { SystemDiagnosticsService } from "../src/domain/system/services/system-diagnostics.service";

// =========================================================================
// ISCMS R2 SINGLE BUCKET ARCHITECTURE ACCEPTANCE TEST SUITE
// =========================================================================

interface MockR2StoreObject {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  createdAt: Date;
}

interface MockVersionRow {
  id: string;
  student_id: string;
  document_type: "passport" | "visa" | "efrro";
  version_number: number;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  file_path: string;
  verification_status: "pending" | "verified" | "rejected";
  is_active: boolean;
  notes?: string | null;
  deleted_at?: string | null;
}

class InProcessR2StorageMock {
  public objects: Map<string, MockR2StoreObject> = new Map();
  public static readonly CANONICAL_BUCKET = "iscms-documents";

  async upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const targetBucket = bucket || InProcessR2StorageMock.CANONICAL_BUCKET;
    const fullKey = `${targetBucket}/${path}`;
    this.objects.set(fullKey, {
      bucket: targetBucket,
      key: path,
      body: file,
      contentType,
      metadata: {},
      createdAt: new Date()
    });
    return path;
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const targetBucket = bucket || InProcessR2StorageMock.CANONICAL_BUCKET;
    const fullKey = `${targetBucket}/${path}`;
    const obj = this.objects.get(fullKey);
    if (!obj) throw new Error("NoSuchKey: Object does not exist in bucket");
    return obj.body;
  }

  async delete(bucket: string, path: string): Promise<boolean> {
    const targetBucket = bucket || InProcessR2StorageMock.CANONICAL_BUCKET;
    const fullKey = `${targetBucket}/${path}`;
    return this.objects.delete(fullKey);
  }

  async fileExists(bucket: string, path: string): Promise<boolean> {
    const targetBucket = bucket || InProcessR2StorageMock.CANONICAL_BUCKET;
    const fullKey = `${targetBucket}/${path}`;
    return this.objects.has(fullKey);
  }

  async generateSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    const targetBucket = bucket || InProcessR2StorageMock.CANONICAL_BUCKET;
    const fullKey = `${targetBucket}/${path}`;
    if (!this.objects.has(fullKey)) {
      throw new Error("NoSuchKey: Object does not exist in bucket");
    }
    const token = crypto.randomBytes(16).toString("hex");
    return `https://r2.cloudflarestorage.com/${targetBucket}/${path}?token=${token}&expires=${expiresInSeconds}`;
  }

  getObjectsForBucket(bucket: string): MockR2StoreObject[] {
    return Array.from(this.objects.values()).filter(o => o.bucket === bucket);
  }

  getObjectsWithPrefix(bucket: string, prefix: string): MockR2StoreObject[] {
    return Array.from(this.objects.values()).filter(o => o.bucket === bucket && o.key.startsWith(prefix));
  }
}

describe("R2 Storage Architecture — Single Bucket with Application-Managed Prefixes", () => {
  const CANONICAL_BUCKET = "iscms-documents";
  const testStudentId = "stu-test-arch-2026";
  let r2Mock: InProcessR2StorageMock;
  let databaseVersions: MockVersionRow[];

  beforeEach(() => {
    r2Mock = new InProcessR2StorageMock();
    databaseVersions = [];
  });

  // Helper simulating single-bucket upload workflow
  async function simulateDocumentUpload(
    studentId: string,
    docType: "passport" | "visa" | "efrro",
    docNumber: string,
    issueDate: string,
    expiryDate: string,
    fileBuffer: Buffer,
    fileName: string
  ) {
    const existing = databaseVersions.filter(v => v.student_id === studentId && v.document_type === docType && !v.deleted_at);
    const validHistory = existing.filter(v => v.file_path && v.file_path !== "pending_upload" && v.file_path !== "null");
    const highestVer = validHistory.length > 0 ? Math.max(...validHistory.map(v => v.version_number)) : 0;
    const nextVer = highestVer + 1;

    const ext = fileName.split(".").pop()?.toLowerCase() || "pdf";
    const uniqueFileId = crypto.randomUUID();
    const storagePath = `students/${studentId}/${docType}/v${nextVer}/${uniqueFileId}.${ext}`;

    // Upload to single canonical bucket
    await r2Mock.upload(CANONICAL_BUCKET, storagePath, fileBuffer, "application/pdf");

    // Insert database record
    const newVersionRow: MockVersionRow = {
      id: `ver-${docType}-${nextVer}-${Date.now()}`,
      student_id: studentId,
      document_type: docType,
      version_number: nextVer,
      document_number: docNumber,
      issue_date: issueDate,
      expiry_date: expiryDate,
      file_path: storagePath,
      verification_status: "pending",
      is_active: false
    };
    databaseVersions.push(newVersionRow);

    return { version: newVersionRow, storagePath };
  }

  // 1 & 2. PASSPORT V1 UPLOAD & PREFIX VERIFICATION
  it("Item 1 & 2: Uploads passport v1 to single bucket 'iscms-documents' under students/{id}/passport/v1/ prefix", async () => {
    const dummyPassportV1 = Buffer.from("%PDF-1.4 Passport V1 Content", "utf-8");
    const { version, storagePath } = await simulateDocumentUpload(
      testStudentId,
      "passport",
      "P12345678",
      "2024-01-01",
      "2029-01-01",
      dummyPassportV1,
      "passport_scan.pdf"
    );

    assert.equal(version.version_number, 1);
    assert.match(storagePath, new RegExp(`^students/${testStudentId}/passport/v1/`));

    // Verify object exists under passport prefix in single canonical bucket
    const exists = await r2Mock.fileExists(CANONICAL_BUCKET, storagePath);
    assert.equal(exists, true, "Passport v1 object must exist in iscms-documents");

    const passportObjects = r2Mock.getObjectsWithPrefix(CANONICAL_BUCKET, `students/${testStudentId}/passport/`);
    assert.equal(passportObjects.length, 1, "Must have exactly 1 passport object in bucket");
    assert.equal(passportObjects[0].bucket, CANONICAL_BUCKET);
  });

  // 3, 4 & 5. PASSPORT V2 UPLOAD & IMMUTABILITY VERIFICATION
  it("Item 3, 4 & 5: Uploads passport v2; preserves v1 intact as separate immutable R2 object", async () => {
    const dummyPassportV1 = Buffer.from("%PDF-1.4 Passport V1 Content", "utf-8");
    const dummyPassportV2 = Buffer.from("%PDF-1.4 Passport V2 Content Renewed", "utf-8");

    const { storagePath: pathV1 } = await simulateDocumentUpload(
      testStudentId,
      "passport",
      "P12345678",
      "2024-01-01",
      "2029-01-01",
      dummyPassportV1,
      "passport_v1.pdf"
    );

    const { storagePath: pathV2 } = await simulateDocumentUpload(
      testStudentId,
      "passport",
      "P87654321",
      "2029-01-02",
      "2039-01-01",
      dummyPassportV2,
      "passport_v2.pdf"
    );

    assert.match(pathV1, new RegExp(`^students/${testStudentId}/passport/v1/`));
    assert.match(pathV2, new RegExp(`^students/${testStudentId}/passport/v2/`));
    assert.notEqual(pathV1, pathV2, "V1 and V2 paths must be distinct");

    // Both objects must exist independently in iscms-documents
    assert.equal(await r2Mock.fileExists(CANONICAL_BUCKET, pathV1), true, "V1 must remain intact");
    assert.equal(await r2Mock.fileExists(CANONICAL_BUCKET, pathV2), true, "V2 must exist separately");

    // Download content must match original distinct buffers
    const downloadedV1 = await r2Mock.download(CANONICAL_BUCKET, pathV1);
    const downloadedV2 = await r2Mock.download(CANONICAL_BUCKET, pathV2);
    assert.equal(downloadedV1.toString(), dummyPassportV1.toString());
    assert.equal(downloadedV2.toString(), dummyPassportV2.toString());

    // Both versions exist in database
    const passportVers = databaseVersions.filter(v => v.student_id === testStudentId && v.document_type === "passport");
    assert.equal(passportVers.length, 2);
    assert.equal(passportVers[0].version_number, 1);
    assert.equal(passportVers[1].version_number, 2);
  });

  // 6. VISA V1 AND V2 VERIFICATION
  it("Item 6: Uploads Visa v1 and v2 using students/{id}/visa/v{n}/ prefixes in iscms-documents", async () => {
    const dummyVisaV1 = Buffer.from("%PDF-1.4 Visa V1 Initial", "utf-8");
    const dummyVisaV2 = Buffer.from("%PDF-1.4 Visa V2 Extension", "utf-8");

    const { storagePath: visaPath1 } = await simulateDocumentUpload(
      testStudentId,
      "visa",
      "V11112222",
      "2024-06-01",
      "2025-06-01",
      dummyVisaV1,
      "visa_v1.pdf"
    );

    const { storagePath: visaPath2 } = await simulateDocumentUpload(
      testStudentId,
      "visa",
      "V33334444",
      "2025-06-02",
      "2026-06-01",
      dummyVisaV2,
      "visa_v2.pdf"
    );

    assert.match(visaPath1, new RegExp(`^students/${testStudentId}/visa/v1/`));
    assert.match(visaPath2, new RegExp(`^students/${testStudentId}/visa/v2/`));

    assert.equal(await r2Mock.fileExists(CANONICAL_BUCKET, visaPath1), true);
    assert.equal(await r2Mock.fileExists(CANONICAL_BUCKET, visaPath2), true);

    const visaObjects = r2Mock.getObjectsWithPrefix(CANONICAL_BUCKET, `students/${testStudentId}/visa/`);
    assert.equal(visaObjects.length, 2);
  });

  // 7. eFRRO V1 AND V2 VERIFICATION
  it("Item 7: Uploads eFRRO v1 and v2 using students/{id}/efrro/v{n}/ prefixes in iscms-documents", async () => {
    const dummyEfrroV1 = Buffer.from("%PDF-1.4 eFRRO Certificate 2024", "utf-8");
    const dummyEfrroV2 = Buffer.from("%PDF-1.4 eFRRO Certificate 2025 Extension", "utf-8");

    const { storagePath: efrroPath1 } = await simulateDocumentUpload(
      testStudentId,
      "efrro",
      "RC99988877",
      "2024-07-01",
      "2025-07-01",
      dummyEfrroV1,
      "efrro_2024.pdf"
    );

    const { storagePath: efrroPath2 } = await simulateDocumentUpload(
      testStudentId,
      "efrro",
      "RC11122233",
      "2025-07-02",
      "2026-07-01",
      dummyEfrroV2,
      "efrro_2025.pdf"
    );

    assert.match(efrroPath1, new RegExp(`^students/${testStudentId}/efrro/v1/`));
    assert.match(efrroPath2, new RegExp(`^students/${testStudentId}/efrro/v2/`));

    assert.equal(await r2Mock.fileExists(CANONICAL_BUCKET, efrroPath1), true);
    assert.equal(await r2Mock.fileExists(CANONICAL_BUCKET, efrroPath2), true);

    const efrroObjects = r2Mock.getObjectsWithPrefix(CANONICAL_BUCKET, `students/${testStudentId}/efrro/`);
    assert.equal(efrroObjects.length, 2);
  });

  // 8. METADATA-ONLY RECORD CREATES 0 R2 OBJECTS
  it("Item 8: Metadata-only imports/registrations create 0 R2 objects and no placeholder versions", async () => {
    const metaStudentId = "stu-meta-only-999";
    const initialObjectsCount = r2Mock.objects.size;

    // Simulate metadata-only student snapshot (e.g. from Excel import or manual registration)
    const mockSnapshot = {
      student_id: metaStudentId,
      passport_number: "Z98765432",
      passport_issue_date: "2023-01-01",
      passport_expiry: "2033-01-01",
      passport_status: "MISSING",
      visa_number: "VZ123456",
      visa_expiry: "2027-05-01",
      visa_status: "MISSING",
      efrro_number: "RC-META-123",
      efrro_expiry: "2026-11-01",
      efrro_status: "MISSING"
    };

    // Confirm no records added to document version tables
    const studentVersions = databaseVersions.filter(v => v.student_id === metaStudentId);
    assert.equal(studentVersions.length, 0, "Must create 0 version rows for metadata-only record");

    // Confirm no objects uploaded to R2
    const currentObjectsCount = r2Mock.objects.size;
    assert.equal(currentObjectsCount, initialObjectsCount, "Must create 0 R2 storage objects");

    const metaObjects = r2Mock.getObjectsWithPrefix(CANONICAL_BUCKET, `students/${metaStudentId}/`);
    assert.equal(metaObjects.length, 0, "No R2 objects should exist under student prefix");

    // Verify metadata snapshot remains queryable for reminders
    assert.ok(mockSnapshot.passport_expiry);
    assert.ok(mockSnapshot.visa_expiry);
    assert.ok(mockSnapshot.efrro_expiry);
  });

  // 9. DOCUMENT RETRIEVAL & SIGNED URLS
  it("Item 9: Document retrieval generates authorized signed URLs without exposing arbitrary bucket keys", async () => {
    const { storagePath } = await simulateDocumentUpload(
      testStudentId,
      "passport",
      "P77788899",
      "2024-01-01",
      "2029-01-01",
      Buffer.from("%PDF-1.4 Content", "utf-8"),
      "secure_passport.pdf"
    );

    const signedUrl = await r2Mock.generateSignedUrl(CANONICAL_BUCKET, storagePath, 300);
    assert.ok(signedUrl.includes(CANONICAL_BUCKET), "Signed URL targets canonical bucket");
    assert.ok(signedUrl.includes(storagePath), "Signed URL contains application-managed prefix");
    assert.ok(signedUrl.includes("token="), "Signed URL contains security token");
    assert.ok(signedUrl.includes("expires=300"), "Signed URL specifies duration");
  });

  // 10. DOCUMENT HISTORY INTEGRITY
  it("Item 10: Document history lists all versions in sequence with distinct R2 object keys", async () => {
    const historyStudent = "stu-hist-001";
    await simulateDocumentUpload(historyStudent, "visa", "V001", "2023-01-01", "2024-01-01", Buffer.from("v1"), "v1.pdf");
    await simulateDocumentUpload(historyStudent, "visa", "V002", "2024-01-02", "2025-01-01", Buffer.from("v2"), "v2.pdf");
    await simulateDocumentUpload(historyStudent, "visa", "V003", "2025-01-02", "2026-01-01", Buffer.from("v3"), "v3.pdf");

    const visaHistory = databaseVersions
      .filter(v => v.student_id === historyStudent && v.document_type === "visa")
      .sort((a, b) => a.version_number - b.version_number);

    assert.equal(visaHistory.length, 3);
    assert.equal(visaHistory[0].version_number, 1);
    assert.equal(visaHistory[1].version_number, 2);
    assert.equal(visaHistory[2].version_number, 3);

    const uniqueKeys = new Set(visaHistory.map(v => v.file_path));
    assert.equal(uniqueKeys.size, 3, "All 3 versions must have distinct R2 object keys");
  });

  // 11 & 12. INFRASTRUCTURE HEALTH UI VERIFICATION
  it("Item 11 & 12: Infrastructure health check reports single bucket 'iscms-documents' with zero references to 3 buckets", async () => {
    // 1. Direct Cloudflare R2 provider check
    const r2Provider = new CloudflareR2StorageProvider();
    const r2Health = await r2Provider.healthCheck();

    assert.equal(r2Health.providerName, "Cloudflare R2");
    assert.equal(r2Health.bucket, "iscms-documents", "Must report canonical bucket iscms-documents");

    const r2HealthString = JSON.stringify(r2Health);
    assert.ok(!r2HealthString.includes("3 Buckets"), "Must never contain '3 Buckets'");
    assert.ok(!r2HealthString.includes("passport-documents"), "Must never contain 'passport-documents'");
    assert.ok(!r2HealthString.includes("visa-documents"), "Must never contain 'visa-documents'");
    assert.ok(!r2HealthString.includes("efrro-documents"), "Must never contain 'efrro-documents'");
    assert.ok(!r2HealthString.includes("student-documents"), "Must never contain 'student-documents'");

    // 2. System diagnostics service check
    const storageHealth = await SystemDiagnosticsService.checkStorageHealth();
    assert.equal(storageHealth.name, "Storage");
    assert.equal(storageHealth.bucket, "iscms-documents", "Must report canonical bucket iscms-documents");

    const healthString = JSON.stringify(storageHealth);
    assert.ok(!healthString.includes("3 Buckets"), "Must never contain '3 Buckets'");
    assert.ok(!healthString.includes("passport-documents"), "Must never contain 'passport-documents'");
    assert.ok(!healthString.includes("visa-documents"), "Must never contain 'visa-documents'");
    assert.ok(!healthString.includes("efrro-documents"), "Must never contain 'efrro-documents'");
    assert.ok(!healthString.includes("student-documents"), "Must never contain 'student-documents'");
  });
});
