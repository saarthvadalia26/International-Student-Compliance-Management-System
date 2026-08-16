import { ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";
import { CalendarDateEngine } from "../src/domain/notifications/services/calendar-date";

// Mock Database Memory State for Testing
interface MockVersionRecord {
  id: string;
  student_id: string;
  document_type: "passport" | "visa" | "efrro";
  version_number: number;
  is_active: boolean;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  placeOfIssue?: string | null;
  place_of_issue?: string | null;
  visaType?: string | null;
  visa_type?: string | null;
  file_path: string;
  verification_status: "pending" | "verified" | "rejected";
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface MockSnapshotRecord {
  student_id: string;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry?: string;
  passport_place_of_issue?: string;
  passport_status: string;
  visa_number?: string;
  visa_issue_date?: string;
  visa_expiry?: string;
  visa_type?: string;
  visa_status: string;
  compliance_status: string;
  updated_at: string;
}

interface MockAuditRecord {
  actor_id: string;
  action: string;
  resource: string;
  filters_applied: Record<string, unknown>;
}

// In-memory mock store
let mockVersions: MockVersionRecord[] = [];
let mockSnapshots: Record<string, MockSnapshotRecord> = {};
let mockAuditLogs: MockAuditRecord[] = [];
let mockStorageUploads: { bucket: string; path: string; buffer: Buffer; contentType: string }[] = [];

// Helper to simulate uploadDocumentRenewalAction logic
async function simulateUploadRenewal(input: {
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  visaType?: string;
  notes?: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  actorId: string;
}) {
  const { studentId, documentType, documentNumber, issueDate, expiryDate, placeOfIssue, visaType, notes, fileName, fileBuffer, contentType, actorId } = input;

  if (!documentNumber.trim() || !issueDate.trim() || !expiryDate.trim()) {
    throw new Error("Required fields missing");
  }
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("A valid physical document file is required for version renewal.");
  }

  const issueD = new Date(issueDate);
  const expiryD = new Date(expiryDate);
  if (expiryD <= issueD) {
    throw new Error("The new expiration date must be strictly after the document issue date.");
  }

  // Find existing highest version for THIS SPECIFIC document type
  const existing = mockVersions.filter(v => v.student_id === studentId && v.document_type === documentType && !v.deleted_at);
  const highestVersion = existing.length > 0 ? Math.max(...existing.map(v => v.version_number)) : 0;
  const nextVersion = highestVersion + 1;

  // Immutable storage path
  const storagePath = `students/${studentId}/${documentType}/v${nextVersion}/${Date.now()}_${fileName}`;
  mockStorageUploads.push({ bucket: "iscms-documents", path: storagePath, buffer: fileBuffer, contentType });

  // Create pending version with is_active: false (previous active remains active!)
  const newRow: MockVersionRecord = {
    id: `ver_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    student_id: studentId,
    document_type: documentType,
    version_number: nextVersion,
    is_active: false, // Critical: Remains inactive while pending!
    document_number: documentNumber.trim(),
    issue_date: issueDate.trim(),
    expiry_date: expiryDate.trim(),
    place_of_issue: placeOfIssue || null,
    visa_type: visaType || null,
    file_path: storagePath,
    verification_status: "pending",
    notes: notes || "Renewal upload",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null
  };

  mockVersions.push(newRow);

  mockAuditLogs.push({
    actor_id: actorId,
    action: "DOCUMENT_VERSION_UPLOADED",
    resource: `${documentType}_versions/${newRow.id}`,
    filters_applied: {
      studentId,
      documentType,
      versionNumber: nextVersion,
      storagePath,
      documentNumber,
      issueDate,
      expiryDate
    }
  });

  return { success: true, versionNumber: nextVersion, record: newRow };
}

// Helper to simulate correctDocumentMetadataAction logic
async function simulateCorrectMetadata(input: {
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  visaType?: string;
  reason: string;
  actorId: string;
}) {
  const { studentId, documentType, documentNumber, issueDate, expiryDate, placeOfIssue, visaType, reason, actorId } = input;

  if (!reason || !reason.trim()) {
    throw new Error("A mandatory reason for correction is required for compliance audit trails.");
  }
  if (!documentNumber.trim() || !issueDate.trim() || !expiryDate.trim()) {
    throw new Error("Required fields missing");
  }

  const issueD = new Date(issueDate);
  const expiryD = new Date(expiryDate);
  if (expiryD <= issueD) {
    throw new Error("The expiration date must be strictly after the document issue date.");
  }

  // Find active version
  const activeVer = mockVersions.find(v => v.student_id === studentId && v.is_active && !v.deleted_at);
  const previousValues = activeVer ? { ...activeVer } : null;

  if (activeVer) {
    // In-place update: same ID, same version_number
    activeVer.document_number = documentNumber.trim();
    activeVer.issue_date = issueDate.trim();
    activeVer.expiry_date = expiryDate.trim();
    if (placeOfIssue) activeVer.place_of_issue = placeOfIssue.trim();
    if (visaType) activeVer.visa_type = visaType.trim();
    activeVer.notes = `Correction: ${reason.trim()}`;
    activeVer.updated_at = new Date().toISOString();
  }

  // Update snapshot
  if (!mockSnapshots[studentId]) {
    mockSnapshots[studentId] = {
      student_id: studentId,
      passport_status: "COMPLIANT",
      visa_status: "COMPLIANT",
      compliance_status: "COMPLIANT",
      updated_at: new Date().toISOString()
    };
  }

  if (documentType === "passport") {
    mockSnapshots[studentId].passport_number = documentNumber;
    mockSnapshots[studentId].passport_issue_date = issueDate;
    mockSnapshots[studentId].passport_expiry = expiryDate;
    if (placeOfIssue) mockSnapshots[studentId].passport_place_of_issue = placeOfIssue;
  } else if (documentType === "visa") {
    mockSnapshots[studentId].visa_number = documentNumber;
    mockSnapshots[studentId].visa_issue_date = issueDate;
    mockSnapshots[studentId].visa_expiry = expiryDate;
    if (visaType) mockSnapshots[studentId].visa_type = visaType;
  }

  mockAuditLogs.push({
    actor_id: actorId,
    action: "DOCUMENT_METADATA_CORRECTED",
    resource: `${documentType}_versions/${activeVer?.id || "snapshot"}`,
    filters_applied: {
      studentId,
      documentType,
      previousValues,
      correctedValues: { documentNumber, issueDate, expiryDate, placeOfIssue, visaType, reason }
    }
  });

  return { success: true, activeVer };
}

// Helper to simulate updateDocumentVerificationAction (Approve / Reject)
async function simulateVerification(input: {
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  versionId: string;
  status: "verified" | "rejected";
  rejectionReason?: string;
  actorId: string;
}) {
  const { studentId, documentType, versionId, status, rejectionReason, actorId } = input;

  const targetVer = mockVersions.find(v => v.id === versionId && v.student_id === studentId);
  if (!targetVer) throw new Error("Document version not found");

  if (status === "verified") {
    // 1. Activate target version
    targetVer.verification_status = "verified";
    targetVer.is_active = true;
    targetVer.verified_by = actorId;
    targetVer.verified_at = new Date().toISOString();
    targetVer.rejection_reason = null;

    // 2. Deactivate all OTHER versions for this student
    mockVersions.forEach(v => {
      if (v.student_id === studentId && v.id !== versionId) {
        v.is_active = false;
      }
    });

    // 3. Update snapshot
    if (!mockSnapshots[studentId]) {
      mockSnapshots[studentId] = {
        student_id: studentId,
        passport_status: "COMPLIANT",
        visa_status: "COMPLIANT",
        compliance_status: "COMPLIANT",
        updated_at: new Date().toISOString()
      };
    }

    if (documentType === "passport") {
      mockSnapshots[studentId].passport_number = targetVer.document_number;
      mockSnapshots[studentId].passport_issue_date = targetVer.issue_date;
      mockSnapshots[studentId].passport_expiry = targetVer.expiry_date;
      mockSnapshots[studentId].passport_status = "COMPLIANT";
    } else if (documentType === "visa") {
      mockSnapshots[studentId].visa_number = targetVer.document_number;
      mockSnapshots[studentId].visa_issue_date = targetVer.issue_date;
      mockSnapshots[studentId].visa_expiry = targetVer.expiry_date;
      mockSnapshots[studentId].visa_status = "COMPLIANT";
    }

    mockAuditLogs.push({
      actor_id: actorId,
      action: "DOCUMENT_RENEWAL_APPROVED",
      resource: `${documentType}_versions/${versionId}`,
      filters_applied: { studentId, documentType, versionId, status: "verified" }
    });
  } else {
    // Rejection: Mark target version rejected and keep inactive
    targetVer.verification_status = "rejected";
    targetVer.is_active = false;
    targetVer.rejection_reason = rejectionReason || "Document rejected by administrator";

    // Previous active version remains active!

    mockAuditLogs.push({
      actor_id: actorId,
      action: "DOCUMENT_RENEWAL_REJECTED",
      resource: `${documentType}_versions/${versionId}`,
      filters_applied: { studentId, documentType, versionId, status: "rejected", rejectionReason }
    });
  }

  return { success: true };
}

async function runLifecycleTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` - ${details}` : ""}`);
      failed++;
    }
  }

  console.log("\n=======================================================");
  console.log("  ISCMS DOCUMENT VERSIONING & LIFECYCLE TEST SUITE");
  console.log("=======================================================\n");

  const testStudentId = "stu_lifecycle_test_001";
  const staffUserId = "usr_staff_admin_001";

  // Reset state
  function resetState() {
    mockVersions = [];
    mockSnapshots = {};
    mockAuditLogs = [];
    mockStorageUploads = [];

    // Seed initial active version (v1)
    mockVersions.push({
      id: "ver_v1_seed",
      student_id: testStudentId,
      document_type: "passport",
      version_number: 1,
      is_active: true,
      document_number: "P12345678",
      issue_date: "2022-01-10",
      expiry_date: "2026-06-30",
      place_of_issue: "London",
      file_path: `students/${testStudentId}/passport/v1/original_passport.pdf`,
      verification_status: "verified",
      verified_by: staffUserId,
      verified_at: "2022-01-15T10:00:00Z",
      rejection_reason: null,
      notes: "Initial registered passport",
      created_at: "2022-01-10T10:00:00Z",
      updated_at: "2022-01-10T10:00:00Z",
      deleted_at: null
    });

    mockSnapshots[testStudentId] = {
      student_id: testStudentId,
      passport_number: "P12345678",
      passport_issue_date: "2022-01-10",
      passport_expiry: "2026-06-30",
      passport_place_of_issue: "London",
      passport_status: "COMPLIANT",
      visa_status: "COMPLIANT",
      compliance_status: "COMPLIANT",
      updated_at: "2022-01-10T10:00:00Z"
    };
  }

  // --- OPERATION 0: NEW STUDENT ZERO UPLOADS & FIRST UPLOAD V1 (ACCEPTANCE TESTS 1-4) ---
  console.log("--- Operation 0: New Student Creation & First Upload V1 Lifecycle ---");
  
  const freshStudentId = "stu_fresh_registration_999";
  // 1. Initial student creation (metadata recorded, but NO document files uploaded)
  mockSnapshots[freshStudentId] = {
    student_id: freshStudentId,
    passport_number: "P-FRESH-001",
    passport_issue_date: "2023-01-01",
    passport_expiry: "2028-01-01",
    passport_status: "MISSING",
    visa_number: "V-FRESH-001",
    visa_issue_date: "2023-01-01",
    visa_expiry: "2027-01-01",
    visa_status: "MISSING",
    compliance_status: "MISSING",
    updated_at: new Date().toISOString()
  };

  const freshVersions = mockVersions.filter(v => v.student_id === freshStudentId);
  assert(freshVersions.length === 0, "Test 1: New student has zero document version rows (no placeholder v1 consumed)");

  // Check UI state before upload: versionNumber is null, status is not_uploaded
  const passportVersionBefore = freshVersions.find(v => v.student_id === freshStudentId);
  const isPassportUploaded = Boolean(passportVersionBefore?.file_path && passportVersionBefore.file_path !== "pending_upload");
  const passportVersionNumber = isPassportUploaded ? passportVersionBefore?.version_number : null;

  assert(passportVersionNumber === null, "Test 1: Passport version is null/none before first upload");
  assert(isPassportUploaded === false, "Test 1: Passport is NOT marked as uploaded");

  // 2. First actual Passport upload -> MUST BE v1
  const firstPassportUpload = await simulateUploadRenewal({
    studentId: freshStudentId,
    documentType: "passport",
    documentNumber: "P-FRESH-001",
    issueDate: "2023-01-01",
    expiryDate: "2028-01-01",
    placeOfIssue: "London",
    fileName: "passport_first_scan.pdf",
    fileBuffer: Buffer.from("%PDF-1.4 Initial Passport"),
    contentType: "application/pdf",
    actorId: staffUserId
  });

  assert(firstPassportUpload.success === true, "First passport upload succeeds");
  assert(firstPassportUpload.versionNumber === 1, "Test 2: First passport upload MUST BE v1 (NOT v2)");
  assert(firstPassportUpload.record.version_number === 1, "First passport record has version_number: 1");

  // 3. First actual Visa upload -> MUST BE v1
  const firstVisaUpload = await simulateUploadRenewal({
    studentId: freshStudentId,
    documentType: "visa",
    documentNumber: "V-FRESH-001",
    issueDate: "2023-01-01",
    expiryDate: "2027-01-01",
    visaType: "Student (S-1)",
    fileName: "visa_first_scan.pdf",
    fileBuffer: Buffer.from("%PDF-1.4 Initial Visa"),
    contentType: "application/pdf",
    actorId: staffUserId
  });

  assert(firstVisaUpload.success === true, "First visa upload succeeds");
  assert(firstVisaUpload.versionNumber === 1, "Test 3: First visa upload MUST BE v1 (NOT v2)");

  // 4. First actual eFRRO upload -> MUST BE v1
  const firstEfrroUpload = await simulateUploadRenewal({
    studentId: freshStudentId,
    documentType: "efrro",
    documentNumber: "EFRRO-FRESH-001",
    issueDate: "2023-02-01",
    expiryDate: "2026-12-31",
    fileName: "efrro_first_scan.pdf",
    fileBuffer: Buffer.from("%PDF-1.4 Initial eFRRO"),
    contentType: "application/pdf",
    actorId: staffUserId
  });

  assert(firstEfrroUpload.success === true, "First eFRRO upload succeeds");
  assert(firstEfrroUpload.versionNumber === 1, "Test 4: First eFRRO upload MUST BE v1 (NOT v2)");

  // 5. Approve Passport v1
  await simulateVerification({
    studentId: freshStudentId,
    documentType: "passport",
    versionId: firstPassportUpload.record.id,
    status: "verified",
    actorId: staffUserId
  });

  // 6. Replacement Passport upload -> MUST BE v2
  const secondPassportUpload = await simulateUploadRenewal({
    studentId: freshStudentId,
    documentType: "passport",
    documentNumber: "P-RENEWED-002",
    issueDate: "2028-01-02",
    expiryDate: "2038-01-01",
    placeOfIssue: "London",
    fileName: "passport_renewed_scan.pdf",
    fileBuffer: Buffer.from("%PDF-1.4 Renewed Passport"),
    contentType: "application/pdf",
    actorId: staffUserId
  });

  assert(secondPassportUpload.success === true, "Replacement passport upload succeeds");
  assert(secondPassportUpload.versionNumber === 2, "Test 5: Replacement passport upload MUST BE v2");

  // --- OPERATION A: METADATA CORRECTION (IN-PLACE FIXES) ---
  console.log("\n--- Operation A: Metadata Correction (In-Place Fixes) ---");
  resetState();

  const correctRes = await simulateCorrectMetadata({
    studentId: testStudentId,
    documentType: "passport",
    documentNumber: "P12345678-CORRECTED",
    issueDate: "2022-01-10",
    expiryDate: "2026-07-15",
    placeOfIssue: "London Heathrow",
    reason: "Fixed place of issue and typo in expiry day",
    actorId: staffUserId
  });

  assert(correctRes.success === true, "Metadata correction succeeds with valid input");
  const studentVersions = mockVersions.filter(v => v.student_id === testStudentId);
  assert(studentVersions.length === 1, "Metadata correction maintains single version (v1 stays v1, count = 1)");
  assert(studentVersions[0].version_number === 1, "Version number is preserved as v1 without incrementing");
  assert(studentVersions[0].document_number === "P12345678-CORRECTED", "Document number updated in-place");
  assert(studentVersions[0].expiry_date === "2026-07-15", "Expiry date updated in-place");
  assert(studentVersions[0].place_of_issue === "London Heathrow", "Place of issue updated in-place");
  assert(studentVersions[0].is_active === true, "Active flag remains true on corrected version");
  assert(mockSnapshots[testStudentId].passport_number === "P12345678-CORRECTED", "Snapshot updated with corrected number");
  assert(mockSnapshots[testStudentId].passport_expiry === "2026-07-15", "Snapshot updated with corrected expiry date");

  const auditA = mockAuditLogs.find(a => a.action === "DOCUMENT_METADATA_CORRECTED");
  assert(auditA !== undefined, "Audit record DOCUMENT_METADATA_CORRECTED created");
  assert(auditA?.actor_id === staffUserId, "Audit record captures staff actor ID");

  // Rejection check on missing reason
  let reasonMissingFailed = false;
  try {
    await simulateCorrectMetadata({
      studentId: testStudentId,
      documentType: "passport",
      documentNumber: "P12345678",
      issueDate: "2022-01-10",
      expiryDate: "2026-07-15",
      reason: "",
      actorId: staffUserId
    });
  } catch {
    reasonMissingFailed = true;
  }
  assert(reasonMissingFailed, "Metadata correction rejected when mandatory reason is missing");

  // Rejection check on invalid expiry date
  let invalidDateFailed = false;
  try {
    await simulateCorrectMetadata({
      studentId: testStudentId,
      documentType: "passport",
      documentNumber: "P12345678",
      issueDate: "2022-01-10",
      expiryDate: "2021-12-31",
      reason: "Backdated test",
      actorId: staffUserId
    });
  } catch {
    invalidDateFailed = true;
  }
  assert(invalidDateFailed, "Metadata correction rejected when expiry date is before issue date");

  // --- OPERATION B: DOCUMENT RENEWAL FILE UPLOAD ---
  console.log("\n--- Operation B: Document Renewal File Upload ---");
  resetState();

  const mockFileBuffer = Buffer.from("%PDF-1.4 Mock Renewed Passport Content");
  const uploadRes = await simulateUploadRenewal({
    studentId: testStudentId,
    documentType: "passport",
    documentNumber: "P99990001",
    issueDate: "2026-06-01",
    expiryDate: "2036-05-31",
    placeOfIssue: "British High Commission, New Delhi",
    notes: "Student submitted 10-year passport renewal",
    fileName: "renewed_passport_2026.pdf",
    fileBuffer: mockFileBuffer,
    contentType: "application/pdf",
    actorId: staffUserId
  });

  assert(uploadRes.success === true, "Renewal file upload succeeds");
  assert(uploadRes.versionNumber === 2, "Renewal upload produces version v2");
  assert(mockStorageUploads.length === 1, "File uploaded to storage provider");
  assert(mockStorageUploads[0].path.startsWith(`students/${testStudentId}/passport/v2/`), `Storage path is immutable: ${mockStorageUploads[0].path}`);

  const v1BeforeApproval = mockVersions.find(v => v.version_number === 1);
  const v2BeforeApproval = mockVersions.find(v => v.version_number === 2);

  assert(v1BeforeApproval?.is_active === true, "CRITICAL: Version v1 REMAINS active while v2 is pending verification");
  assert(v1BeforeApproval?.verification_status === "verified", "Version v1 verification status remains 'verified'");
  assert(v2BeforeApproval?.is_active === false, "CRITICAL: Version v2 is NOT active while pending verification");
  assert(v2BeforeApproval?.verification_status === "pending", "Version v2 verification status is 'pending'");
  assert(mockSnapshots[testStudentId].passport_number === "P12345678", "Snapshot passport number still reflects active v1");
  assert(mockSnapshots[testStudentId].passport_expiry === "2026-06-30", "Snapshot expiry date still reflects active v1");

  const auditUpload = mockAuditLogs.find(a => a.action === "DOCUMENT_VERSION_UPLOADED");
  assert(auditUpload !== undefined, "Audit record DOCUMENT_VERSION_UPLOADED created");
  assert((auditUpload?.filters_applied as Record<string, unknown>).versionNumber === 2, "Audit record stores version number 2");

  // --- OPERATION C: APPROVAL TIMING & ROTATION ---
  console.log("\n--- Operation C: Approval Timing & Rotation ---");
  const v2Id = uploadRes.record.id;

  const verifyApproveRes = await simulateVerification({
    studentId: testStudentId,
    documentType: "passport",
    versionId: v2Id,
    status: "verified",
    actorId: staffUserId
  });

  assert(verifyApproveRes.success === true, "Staff approval of v2 succeeds");

  const v1AfterApproval = mockVersions.find(v => v.version_number === 1);
  const v2AfterApproval = mockVersions.find(v => v.version_number === 2);

  assert(v1AfterApproval?.is_active === false, "CRITICAL: Version v1 becomes historical (is_active: false) after v2 approval");
  assert(v2AfterApproval?.is_active === true, "CRITICAL: Version v2 becomes active (is_active: true) after approval");
  assert(v2AfterApproval?.verification_status === "verified", "Version v2 status updated to 'verified'");
  assert(v2AfterApproval?.verified_by === staffUserId, "Version v2 records staff verifier ID");
  assert(mockSnapshots[testStudentId].passport_number === "P99990001", "Snapshot passport number updated to approved v2 number");
  assert(mockSnapshots[testStudentId].passport_expiry === "2036-05-31", "Snapshot expiry date updated to approved v2 expiry");
  assert(mockSnapshots[testStudentId].passport_issue_date === "2026-06-01", "Snapshot issue date updated to approved v2 issue date");

  const auditApprove = mockAuditLogs.find(a => a.action === "DOCUMENT_RENEWAL_APPROVED");
  assert(auditApprove !== undefined, "Audit record DOCUMENT_RENEWAL_APPROVED created");

  // --- OPERATION D: REJECTION TIMING ---
  console.log("\n--- Operation D: Rejection Timing ---");
  resetState();

  const uploadRejTest = await simulateUploadRenewal({
    studentId: testStudentId,
    documentType: "passport",
    documentNumber: "P-REJECT-TEST",
    issueDate: "2026-06-01",
    expiryDate: "2036-05-31",
    fileName: "blurry_scan.pdf",
    fileBuffer: Buffer.from("%PDF-1.4 Blurry Scan"),
    contentType: "application/pdf",
    actorId: staffUserId
  });

  const v2RejId = uploadRejTest.record.id;

  const verifyRejRes = await simulateVerification({
    studentId: testStudentId,
    documentType: "passport",
    versionId: v2RejId,
    status: "rejected",
    rejectionReason: "Blurry document scan, details unreadable.",
    actorId: staffUserId
  });

  assert(verifyRejRes.success === true, "Staff rejection of v2 processed");

  const v1AfterReject = mockVersions.find(v => v.version_number === 1);
  const v2AfterReject = mockVersions.find(v => v.version_number === 2);

  assert(v1AfterReject?.is_active === true, "CRITICAL: Version v1 REMAINS active after v2 rejection");
  assert(v1AfterReject?.verification_status === "verified", "Version v1 remains 'verified'");
  assert(v2AfterReject?.is_active === false, "Version v2 remains inactive (is_active: false)");
  assert(v2AfterReject?.verification_status === "rejected", "Version v2 marked as 'rejected'");
  assert(v2AfterReject?.rejection_reason === "Blurry document scan, details unreadable.", "Rejection reason recorded");
  assert(mockSnapshots[testStudentId].passport_number === "P12345678", "Snapshot untouched, remains with v1 details");
  assert(mockSnapshots[testStudentId].passport_expiry === "2026-06-30", "Snapshot expiry untouched, remains with v1 expiry");

  const auditReject = mockAuditLogs.find(a => a.action === "DOCUMENT_RENEWAL_REJECTED");
  assert(auditReject !== undefined, "Audit record DOCUMENT_RENEWAL_REJECTED created");

  // --- OPERATION E: REMINDER ENGINE SYNCHRONIZATION ---
  console.log("\n--- Operation E: Reminder Engine Synchronization ---");
  const oldExpiry = "2026-06-30";
  const newExpiry = "2036-05-31";
  const todayISO = "2026-08-15";

  const oldSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E12345678",
    expiryDate: oldExpiry,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO
  });

  const newSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E99990001",
    expiryDate: newExpiry,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO
  });

  assert(oldSchedule.schedule.length === 5, "Old schedule has 5 reminder milestones (90, 60, 30, 15, 7 days)");
  assert(newSchedule.schedule.length === 5, "New schedule has 5 reminder milestones (90, 60, 30, 15, 7 days)");

  const old90 = oldSchedule.schedule.find(s => s.thresholdDays === 90);
  const new90 = newSchedule.schedule.find(s => s.thresholdDays === 90);

  assert(old90?.scheduledDateISO === CalendarDateEngine.subtractDays(oldExpiry, 90), "Old 90-day milestone aligns with old expiry (2026-04-01)");
  assert(new90?.scheduledDateISO === CalendarDateEngine.subtractDays(newExpiry, 90), "New 90-day milestone aligns with new expiry (2036-03-02)");
  assert(new90?.scheduledDateISO === "2036-03-02", `New 90-day milestone date calculated: ${new90?.scheduledDateISO}`);

  console.log("\n=======================================================");
  console.log(`  LIFECYCLE TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLifecycleTests().catch(err => {
  console.error("Fatal test runner failure:", err);
  process.exit(1);
});
