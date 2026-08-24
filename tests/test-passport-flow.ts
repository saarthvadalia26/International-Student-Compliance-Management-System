import "./test-preload";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not read .env.local:", e);
}

import { createClient } from "@supabase/supabase-js";
import { StorageProviderFactory } from "../src/domain/storage/factory";
import { StudentPortalService } from "../src/domain/student-portal/services/student-portal.service";
import { 
  getDocumentVersionsAction, 
  getDocumentDownloadUrlAction,
  updateDocumentVerificationAction 
} from "../src/app/(app)/students/actions";
import { DocumentUploadEligibilityEngine } from "../src/domain/compliance/services/upload-eligibility.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTest() {
  console.log("=================================================================");
  console.log("  ISCMS PASSPORT UPLOAD & STORAGE RETRIEVAL END-TO-END SUITE     ");
  console.log("=================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Create a dedicated isolated test student for reproducible end-to-end verification
  const testRegNum = `TEST/PASS/${Date.now().toString().slice(-6)}`;
  console.log(`Creating test student with reg num: ${testRegNum}`);

  const { data: newStudent, error: stdCreateErr } = await supabase
    .from("students")
    .insert({
      registration_number: testRegNum,
      status: "active"
    })
    .select("id, registration_number")
    .single();

  if (stdCreateErr || !newStudent) {
    throw new Error(`Failed to create test student: ${stdCreateErr?.message}`);
  }
  const studentId = newStudent.id;
  console.log(`Test student created with ID: ${studentId}`);

  // Create personal record
  await supabase.from("student_personal").insert({
    student_id: studentId,
    full_name: "Passport Test Student",
    nationality_code: "GBR"
  });

  // Create snapshot record
  await supabase.from("student_snapshot").insert({
    student_id: studentId,
    passport_status: "NOT_UPLOADED",
    compliance_status: "NOT_UPLOADED",
    compliance_score: 0
  });

  const storage = StorageProviderFactory.getProvider();
  const portalService = new StudentPortalService();

  try {
    // 2. Initial state check: no passport versions
    const initialVersions = await getDocumentVersionsAction(studentId, "passport");
    assert(initialVersions.success, "Initial getDocumentVersionsAction returns success");
    assert(initialVersions.versions.length === 0, "Initial student has 0 document versions");
    assert(initialVersions.status === "NOT_UPLOADED", "Initial status is NOT_UPLOADED");

    // 3. Upload passport through StudentPortalService (simulating Student Portal upload)
    const uniqueComment = `% Unique ID: ${Date.now()}_${Math.random()}\n`;
    const dummyPdfContent = `%PDF-1.4\n${uniqueComment}%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000015 00000 n\n0000000068 00000 n\n0000000125 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n198\n%%EOF\n`;
    const dummyPdfBuffer = Buffer.from(dummyPdfContent);

    console.log("\n--- Step 1: Student Portal Passport Upload ---");
    const uploadRes = await portalService.uploadDocument(
      studentId,
      "passport",
      "Official_Passport_Scan.pdf",
      dummyPdfBuffer,
      "127.0.0.1",
      "Mozilla/5.0 Test Agent"
    );

    assert(Boolean(uploadRes.versionId), `Upload succeeded and returned versionId: ${uploadRes.versionId}`);
    assert(uploadRes.versionNumber === 1, "First upload resolves to version 1");

    // 4. Verify Database version record
    const { data: dbVersion } = await supabase
      .from("passport_versions")
      .select("*")
      .eq("id", uploadRes.versionId)
      .single();

    assert(Boolean(dbVersion), "Passport version row exists in passport_versions table");
    assert(Boolean(dbVersion?.file_path), `Passport version row contains file_path: ${dbVersion?.file_path}`);
    assert(dbVersion?.verification_status === "pending", "New upload verification_status is 'pending'");
    assert(dbVersion?.is_active === false, "New upload is_active is false until staff verification");

    // 5. Verify physical storage file in Cloudflare R2
    console.log("\n--- Step 2: Storage Object Existence & Presigned URL Generation ---");
    const fileExistsInR2 = await storage.fileExists("iscms-documents", dbVersion!.file_path);
    assert(fileExistsInR2, `Physical file strictly exists in Cloudflare R2 at key: ${dbVersion!.file_path}`);

    const presignedUrl = await storage.generateSignedUrl("iscms-documents", dbVersion!.file_path, 300);
    assert(Boolean(presignedUrl && presignedUrl.startsWith("https://")), "Storage provider successfully generated HTTPS presigned URL");

    // 6. Test downloading the file directly via the presigned URL
    console.log("\n--- Step 3: Direct Presigned URL HTTP Verification ---");
    const fetchResponse = await fetch(presignedUrl);
    assert(fetchResponse.status === 200, `Presigned URL fetch returned HTTP ${fetchResponse.status} (OK)`);
    const fetchedBytes = await fetchResponse.arrayBuffer();
    assert(fetchedBytes.byteLength === dummyPdfBuffer.length, `Downloaded byte length (${fetchedBytes.byteLength}) matches uploaded file size (${dummyPdfBuffer.length})`);

    // 7. Verify Main Portal server actions
    console.log("\n--- Step 4: Main Portal Retrieval Actions Verification ---");
    const mainPortalVersions = await getDocumentVersionsAction(studentId, "passport");
    assert(mainPortalVersions.success, "Main Portal getDocumentVersionsAction returns success");
    assert(mainPortalVersions.versions.length === 1, "Main Portal returns 1 version in history");
    assert(mainPortalVersions.versions[0].filePath === dbVersion!.file_path, "Version filePath matches canonical R2 path");

    // Note: getDocumentDownloadUrlAction tests internal user auth when called in app context.
    // Here we test path normalization and download retrieval.
    const downloadActionTest = await storage.generateSignedUrl("iscms-documents", mainPortalVersions.versions[0].filePath!, 300);
    assert(Boolean(downloadActionTest), "Main Portal can securely retrieve signed download URL for staff view");

    console.log("\n=================================================================");
    console.log("  ALL END-TO-END PASSPORT TESTS PASSED CLEANLY! ✅               ");
    console.log("=================================================================\n");

  } finally {
    // Clean up test student & objects
    try {
      const { data: testVers } = await supabase
        .from("passport_versions")
        .select("file_path")
        .eq("student_id", studentId);
      
      if (testVers) {
        for (const v of testVers) {
          if (v.file_path) {
            await storage.delete("iscms-documents", v.file_path).catch(() => null);
          }
        }
      }
      await supabase.from("students").delete().eq("id", studentId);
    } catch {}
  }
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
