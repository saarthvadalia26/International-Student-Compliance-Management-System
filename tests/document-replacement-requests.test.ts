import assert from "node:assert/strict";
import { 
  DocumentReplacementRequestService, 
  DocumentReplacementStatus,
  DocumentReplacementReason 
} from "../src/domain/compliance/services/replacement-request.service";
import { 
  DocumentUploadEligibilityEngine,
  ComplianceDocumentType,
  DocumentVersionInfo,
  StudentUploadAuthorization
} from "../src/domain/compliance/services/upload-eligibility.service";

console.log("=======================================================");
console.log("  ISCMS DOCUMENT REPLACEMENT REQUEST TEST SUITE");
console.log("=======================================================\n");

// -------------------------------------------------------------
// Test 1: Valid approved document outside window
// -------------------------------------------------------------
console.log("--- Test 1: Approved Document Outside Window ---");
{
  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: {
      versionNumber: 1,
      filePath: "efrro/std-1/v1/efrro.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2026-12-20"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: null,
    currentDate: new Date("2026-08-15") // 127 days before expiry
  });

  assert.equal(eligibility.canUpload, false, "Upload must be disabled outside window");
  assert.equal(eligibility.reasonCode, "OUTSIDE_WINDOW", "Reason code must be OUTSIDE_WINDOW");
  assert.equal(eligibility.daysUntilExpiry, 127, "Days until expiry should be 127");
  assert.equal(eligibility.userTitle, "Document Verified");
  console.log("✅ [PASS] Test 1: Upload is DISABLED outside window with valid approved document");
}

// -------------------------------------------------------------
// Test 2: Student submits early replacement request
// -------------------------------------------------------------
console.log("\n--- Test 2: Replacement Request Submitted (Pending) ---");
{
  const pendingRequest = {
    id: "req-001",
    studentId: "std-1",
    documentType: "efrro" as const,
    currentDocumentVersion: 1,
    currentExpiryDate: "2026-12-20",
    reason: "efrro_reissued" as const,
    reasonDetails: "Received new eFRRO registration certificate from immigration.",
    status: "pending" as const,
    submittedAt: "2026-08-15T10:00:00.000Z",
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    authorizationId: null,
    authorizationExpiresAt: null,
    completedAt: null,
    completedVersionId: null,
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z"
  };

  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: {
      versionNumber: 1,
      filePath: "efrro/std-1/v1/efrro.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2026-12-20"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: pendingRequest,
    currentDate: new Date("2026-08-15")
  });

  assert.equal(eligibility.canUpload, false, "Upload must remain DISABLED while replacement request is pending");
  assert.equal(eligibility.reasonCode, "REPLACEMENT_REQUEST_PENDING", "Reason code must be REPLACEMENT_REQUEST_PENDING");
  assert.equal(eligibility.userTitle, "Replacement Request Pending");
  assert.ok(eligibility.userMessage.includes("under review"), "User message must indicate under review");
  console.log("✅ [PASS] Test 2: Request status is Pending and upload remains securely disabled");
}

// -------------------------------------------------------------
// Test 3: Staff approves request -> Temporary authorization created
// -------------------------------------------------------------
console.log("\n--- Test 3: Staff Approves Replacement Request ---");
{
  const approvedRequest = {
    id: "req-001",
    studentId: "std-1",
    documentType: "efrro" as const,
    currentDocumentVersion: 1,
    currentExpiryDate: "2026-12-20",
    reason: "efrro_reissued" as const,
    reasonDetails: "Received new eFRRO registration certificate from immigration.",
    status: "approved" as const,
    submittedAt: "2026-08-15T10:00:00.000Z",
    reviewedBy: "staff-99",
    reviewedAt: "2026-08-15T11:00:00.000Z",
    rejectionReason: null,
    authorizationId: "auth-001",
    authorizationExpiresAt: "2026-08-22T11:00:00.000Z", // 7 days later
    completedAt: null,
    completedVersionId: null,
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T11:00:00.000Z"
  };

  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: {
      versionNumber: 1,
      filePath: "efrro/std-1/v1/efrro.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2026-12-20"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: approvedRequest,
    currentDate: new Date("2026-08-16") // Inside 7-day window
  });

  assert.equal(eligibility.canUpload, true, "Upload must be ENABLED after replacement request is approved");
  assert.equal(eligibility.reasonCode, "REPLACEMENT_REQUEST_APPROVED", "Reason code must be REPLACEMENT_REQUEST_APPROVED");
  assert.equal(eligibility.userTitle, "Replacement Approved");
  assert.equal(eligibility.authorizationExpiresAt, "2026-08-22T11:00:00.000Z");
  assert.ok(eligibility.userMessage.includes("approved"), "User message confirms approval");
  console.log("✅ [PASS] Test 3: Approved request enables upload with specific expiration date");
}

// -------------------------------------------------------------
// Test 4: Student uploads -> Pending verification & Request completed
// -------------------------------------------------------------
console.log("\n--- Test 4: Student Uploads Document -> Pending Verification ---");
{
  // When student uploads file v2:
  // 1. Pending document version exists
  // 2. Request transitions to completed
  const completedRequest = {
    id: "req-001",
    studentId: "std-1",
    documentType: "efrro" as const,
    currentDocumentVersion: 1,
    currentExpiryDate: "2026-12-20",
    reason: "efrro_reissued" as const,
    reasonDetails: "Received new eFRRO registration certificate from immigration.",
    status: "completed" as const,
    submittedAt: "2026-08-15T10:00:00.000Z",
    reviewedBy: "staff-99",
    reviewedAt: "2026-08-15T11:00:00.000Z",
    rejectionReason: null,
    authorizationId: "auth-001",
    authorizationExpiresAt: "2026-08-22T11:00:00.000Z",
    completedAt: "2026-08-16T14:30:00.000Z",
    completedVersionId: "ver-002",
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-16T14:30:00.000Z"
  };

  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: {
      versionNumber: 1,
      filePath: "efrro/std-1/v1/efrro.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2026-12-20"
    },
    pendingDocument: {
      versionNumber: 2,
      filePath: "efrro/std-1/v2/new_efrro.pdf",
      verificationStatus: "pending",
      isActive: false,
      expiryDate: "2027-12-20"
    },
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: completedRequest,
    currentDate: new Date("2026-08-16")
  });

  assert.equal(eligibility.canUpload, false, "Upload must be DISABLED while v2 is pending review");
  assert.equal(eligibility.reasonCode, "PENDING_VERIFICATION", "Reason code must be PENDING_VERIFICATION");
  assert.equal(eligibility.isPendingReview, true, "isPendingReview must be true");
  assert.equal(eligibility.userTitle, "Pending Verification");
  console.log("✅ [PASS] Test 4: Upload immediately locks after submission while awaiting staff verification");
}

// -------------------------------------------------------------
// Test 5: Staff verifies document -> New active v2
// -------------------------------------------------------------
console.log("\n--- Test 5: Staff Verifies v2 Document ---");
{
  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: {
      versionNumber: 2,
      filePath: "efrro/std-1/v2/new_efrro.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2027-12-20" // 1 year renewal
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: null,
    currentDate: new Date("2026-08-17")
  });

  assert.equal(eligibility.canUpload, false, "Upload must be locked after v2 verification");
  assert.equal(eligibility.reasonCode, "OUTSIDE_WINDOW", "Reason code must be OUTSIDE_WINDOW");
  assert.equal(eligibility.uploadWindowOpensDate, "2027-11-20", "Next window opens 30 days before new expiry");
  console.log("✅ [PASS] Test 5: v2 verified and active, next upload window correctly set for 2027-11-20");
}

// -------------------------------------------------------------
// Test 6: Staff rejects request
// -------------------------------------------------------------
console.log("\n--- Test 6: Staff Rejects Replacement Request ---");
{
  const rejectedRequest = {
    id: "req-002",
    studentId: "std-1",
    documentType: "passport" as const,
    currentDocumentVersion: 1,
    currentExpiryDate: "2028-05-10",
    reason: "passport_lost" as const,
    reasonDetails: "I mislaid my passport somewhere at home.",
    status: "rejected" as const,
    submittedAt: "2026-08-15T10:00:00.000Z",
    reviewedBy: "staff-99",
    reviewedAt: "2026-08-15T11:00:00.000Z",
    rejectionReason: "Official police report or embassy loss acknowledgment letter required.",
    authorizationId: null,
    authorizationExpiresAt: null,
    completedAt: null,
    completedVersionId: null,
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T11:00:00.000Z"
  };

  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "passport",
    activeDocument: {
      versionNumber: 1,
      filePath: "passport/std-1/v1/passport.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2028-05-10"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: rejectedRequest,
    currentDate: new Date("2026-08-15")
  });

  assert.equal(eligibility.canUpload, false, "Upload must remain disabled after request rejection");
  assert.equal(eligibility.activeReplacementRequest?.status, "rejected");
  assert.equal(eligibility.activeReplacementRequest?.rejectionReason, "Official police report or embassy loss acknowledgment letter required.");
  console.log("✅ [PASS] Test 6: Rejected request keeps upload disabled and preserves rejection reason");
}

// -------------------------------------------------------------
// Test 7: Approved request expires without submission
// -------------------------------------------------------------
console.log("\n--- Test 7: Approved Request Expiration ---");
{
  const expiredApprovedRequest = {
    id: "req-003",
    studentId: "std-1",
    documentType: "visa" as const,
    currentDocumentVersion: 1,
    currentExpiryDate: "2027-04-15",
    reason: "visa_renewed_reissued" as const,
    reasonDetails: "Embassy issued fresh visa endorsement.",
    status: "approved" as const,
    submittedAt: "2026-08-01T10:00:00.000Z",
    reviewedBy: "staff-99",
    reviewedAt: "2026-08-01T11:00:00.000Z",
    rejectionReason: null,
    authorizationId: "auth-003",
    authorizationExpiresAt: "2026-08-08T11:00:00.000Z", // Expired 7 days ago
    completedAt: null,
    completedVersionId: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T11:00:00.000Z"
  };

  assert.equal(
    DocumentReplacementRequestService.isRequestExpired(expiredApprovedRequest, new Date("2026-08-15")),
    true,
    "Request should be detected as expired"
  );

  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "visa",
    activeDocument: {
      versionNumber: 1,
      filePath: "visa/std-1/v1/visa.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2027-04-15"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: expiredApprovedRequest,
    currentDate: new Date("2026-08-15") // Date is past authorizationExpiresAt
  });

  assert.equal(eligibility.canUpload, false, "Upload must be DISABLED once authorization window expires");
  assert.equal(eligibility.reasonCode, "OUTSIDE_WINDOW");
  console.log("✅ [PASS] Test 7: Expired authorization correctly locks upload");
}

// -------------------------------------------------------------
// Test 8: State Machine Transitions & Duplicate Prevention
// -------------------------------------------------------------
console.log("\n--- Test 8: State Machine Rules ---");
{
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("pending", "approved"), true);
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("pending", "rejected"), true);
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("pending", "cancelled"), true);
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("approved", "completed"), true);
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("approved", "expired"), true);
  
  // Invalid transitions
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("rejected", "approved"), false);
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("completed", "pending"), false);
  assert.equal(DocumentReplacementRequestService.isValidStatusTransition("cancelled", "approved"), false);
  console.log("✅ [PASS] Test 8: State machine enforces valid transition paths");
}

// -------------------------------------------------------------
// Test 9: Direct Security Bypass Attempt
// -------------------------------------------------------------
console.log("\n--- Test 9: Direct API Security Check ---");
{
  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "passport",
    activeDocument: {
      versionNumber: 1,
      filePath: "passport/std-1/v1/passport.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2029-01-01"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: null,
    currentDate: new Date("2026-08-15")
  });

  assert.equal(eligibility.canUpload, false, "Server MUST reject direct upload without valid window or authorization");
  console.log("✅ [PASS] Test 9: Unauthorized direct upload is rejected server-side");
}

// -------------------------------------------------------------
// Test 10: Document Independence
// -------------------------------------------------------------
console.log("\n--- Test 10: Document Independence ---");
{
  // Student has approved replacement for Passport, but Visa and eFRRO are outside window
  const passportApprovedReq = {
    id: "req-p1",
    studentId: "std-1",
    documentType: "passport" as const,
    currentDocumentVersion: 1,
    currentExpiryDate: "2028-10-10",
    reason: "passport_renewed_early" as const,
    reasonDetails: "Passport renewed early.",
    status: "approved" as const,
    submittedAt: "2026-08-15T10:00:00.000Z",
    reviewedBy: "staff-1",
    reviewedAt: "2026-08-15T11:00:00.000Z",
    rejectionReason: null,
    authorizationId: "auth-p1",
    authorizationExpiresAt: "2026-08-22T11:00:00.000Z",
    completedAt: null,
    completedVersionId: null,
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T11:00:00.000Z"
  };

  const passportElig = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "passport",
    activeDocument: { versionNumber: 1, filePath: "p.pdf", verificationStatus: "verified", isActive: true, expiryDate: "2028-10-10" },
    pendingDocument: null,
    activeReplacementRequest: passportApprovedReq,
    currentDate: new Date("2026-08-15")
  });

  const visaElig = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "visa",
    activeDocument: { versionNumber: 1, filePath: "v.pdf", verificationStatus: "verified", isActive: true, expiryDate: "2028-10-10" },
    pendingDocument: null,
    activeReplacementRequest: null,
    currentDate: new Date("2026-08-15")
  });

  const efrroElig = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: { versionNumber: 1, filePath: "e.pdf", verificationStatus: "verified", isActive: true, expiryDate: "2028-10-10" },
    pendingDocument: null,
    activeReplacementRequest: null,
    currentDate: new Date("2026-08-15")
  });

  assert.equal(passportElig.canUpload, true, "Passport upload must be ENABLED");
  assert.equal(visaElig.canUpload, false, "Visa upload must remain DISABLED");
  assert.equal(efrroElig.canUpload, false, "eFRRO upload must remain DISABLED");
  console.log("✅ [PASS] Test 10: Passport authorization does NOT unlock Visa or eFRRO");
}

// -------------------------------------------------------------
// Test 11: Normal Pre-Expiry Window (No Request Required)
// -------------------------------------------------------------
console.log("\n--- Test 11: Automatic Pre-Expiry Window ---");
{
  const eligibility = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: {
      versionNumber: 1,
      filePath: "efrro/std-1/v1/efrro.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2026-09-05"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    activeAuthorization: null,
    activeReplacementRequest: null,
    currentDate: new Date("2026-08-15") // 21 days before expiry (within 30-day window)
  });

  assert.equal(eligibility.canUpload, true, "Upload must be automatically enabled inside window");
  assert.equal(eligibility.reasonCode, "WINDOW_OPEN");
  assert.equal(eligibility.daysUntilExpiry, 21);
  console.log("✅ [PASS] Test 11: Normal expiry window opens automatically without replacement request");
}

// -------------------------------------------------------------
// Test 12: Reason formatting and validation
// -------------------------------------------------------------
console.log("\n--- Test 12: Reason Formatting ---");
{
  assert.equal(DocumentReplacementRequestService.formatReason("passport_lost"), "Passport Lost / Stolen");
  assert.equal(DocumentReplacementRequestService.formatReason("visa_renewed_reissued"), "Visa Renewed / Reissued");
  assert.equal(DocumentReplacementRequestService.formatReason("efrro_reissued"), "eFRRO / Permit Reissued");
  assert.equal(DocumentReplacementRequestService.formatReason("other"), "Other Legitimate Reason");
  console.log("✅ [PASS] Test 12: Reason codes map to institutional labels");
}

console.log("\n=======================================================");
console.log("  DOCUMENT REPLACEMENT TEST RESULTS: ALL 12 PASSED");
console.log("=======================================================\n");
