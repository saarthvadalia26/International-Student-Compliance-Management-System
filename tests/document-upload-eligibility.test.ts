import { 
  DocumentUploadEligibilityEngine, 
  ComplianceDocumentType, 
  StudentUploadAuthorization 
} from "../src/domain/compliance/services/upload-eligibility.service";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] ${msg}`);
  }
}

console.log("=======================================================");
console.log("  ISCMS DOCUMENT UPLOAD ELIGIBILITY TEST SUITE");
console.log("=======================================================\n");

const REF_DATE = new Date("2026-08-15T00:00:00Z");

// -------------------------------------------------------------
// Test 1: Approved Document Outside Window -> Upload Disabled
// -------------------------------------------------------------
console.log("--- Test 1: Approved Document Outside Window ---");
const test1Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "efrro",
  activeDocument: {
    versionNumber: 1,
    filePath: "efrro/stu_1/2026/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2027-02-15" // 6 months away
  },
  pendingDocument: null,
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test1Res.canUpload === false, "Test 1: Upload is DISABLED for approved document outside window");
assert(test1Res.reasonCode === "OUTSIDE_WINDOW", "Test 1: Reason code is OUTSIDE_WINDOW");
assert(test1Res.userTitle === "Document Verified", "Test 1: User title is Document Verified");
assert(test1Res.uploadWindowOpensDate === "2027-01-16", `Test 1: Window opens on 2027-01-16 (got ${test1Res.uploadWindowOpensDate})`);
assert(test1Res.daysUntilWindowOpens === 154, `Test 1: Days until window opens is 154 (got ${test1Res.daysUntilWindowOpens})`);
assert(test1Res.userMessage.includes("valid until"), "Test 1: User message explains current validity");

// -------------------------------------------------------------
// Test 2: Inside Upload Window -> Upload Enabled
// -------------------------------------------------------------
console.log("\n--- Test 2: Inside Pre-Expiry Upload Window ---");
const test2Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "efrro",
  activeDocument: {
    versionNumber: 1,
    filePath: "efrro/stu_1/2026/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2026-09-04" // 20 days away (within 30-day window)
  },
  pendingDocument: null,
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test2Res.canUpload === true, "Test 2: Upload is ENABLED inside pre-expiry window");
assert(test2Res.reasonCode === "WINDOW_OPEN", "Test 2: Reason code is WINDOW_OPEN");
assert(test2Res.userTitle === "Expiring Soon — Upload Open", "Test 2: User title is Expiring Soon — Upload Open");
assert(test2Res.daysUntilExpiry === 20, `Test 2: Days until expiry is 20 (got ${test2Res.daysUntilExpiry})`);
assert(test2Res.userMessage.includes("approaching its expiry date"), "Test 2: User message encourages renewal upload");

// -------------------------------------------------------------
// Test 3: Upload Submitted & Pending Verification -> Upload Disabled
// -------------------------------------------------------------
console.log("\n--- Test 3: Document Pending Verification ---");
const test3Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "efrro",
  activeDocument: {
    versionNumber: 1,
    filePath: "efrro/stu_1/2026/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2026-09-04"
  },
  pendingDocument: {
    versionNumber: 2,
    filePath: "efrro/stu_1/2026/v2.pdf",
    verificationStatus: "pending",
    isActive: false
  },
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test3Res.canUpload === false, "Test 3: Upload is DISABLED while replacement is pending verification");
assert(test3Res.reasonCode === "PENDING_VERIFICATION", "Test 3: Reason code is PENDING_VERIFICATION");
assert(test3Res.userTitle === "Pending Verification", "Test 3: User title is Pending Verification");
assert(test3Res.isPendingReview === true, "Test 3: isPendingReview flag is true");
assert(test3Res.userMessage.includes("waiting for verification"), "Test 3: Explains pending compliance review");

// -------------------------------------------------------------
// Test 4: Repeated Upload Spam Prevention
// -------------------------------------------------------------
console.log("\n--- Test 4: Repeated Upload Spam Prevention ---");
// Even if document is expired, if a pending version exists, upload remains disabled!
const test4Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "passport",
  activeDocument: {
    versionNumber: 1,
    filePath: "passport/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2026-08-01" // already expired
  },
  pendingDocument: {
    versionNumber: 2,
    filePath: "passport/v2.pdf",
    verificationStatus: "pending",
    isActive: false
  },
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test4Res.canUpload === false, "Test 4: Repeated upload blocked even for expired document if v2 is pending");
assert(test4Res.reasonCode === "PENDING_VERIFICATION", "Test 4: Reason code remains PENDING_VERIFICATION");

// -------------------------------------------------------------
// Test 5: Approval Rotates to v2 -> Upload Disabled & Recalculates Window
// -------------------------------------------------------------
console.log("\n--- Test 5: After Staff Approves v2 Replacement ---");
const test5Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "efrro",
  activeDocument: {
    versionNumber: 2,
    filePath: "efrro/stu_1/2026/v2.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2027-08-15" // 1 year away
  },
  pendingDocument: null, // no longer pending
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test5Res.canUpload === false, "Test 5: Upload is DISABLED after v2 approval");
assert(test5Res.reasonCode === "OUTSIDE_WINDOW", "Test 5: Reason code is OUTSIDE_WINDOW");
assert(test5Res.uploadWindowOpensDate === "2027-07-16", `Test 5: Next window opens on 2027-07-16 (got ${test5Res.uploadWindowOpensDate})`);

// -------------------------------------------------------------
// Test 6: Early Upload Attempt Outside Window Without Authorization
// -------------------------------------------------------------
console.log("\n--- Test 6: Early Upload Attempt Without Authorization ---");
const test6Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "visa",
  activeDocument: {
    versionNumber: 1,
    filePath: "visa/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2028-06-30" // 2 years away
  },
  pendingDocument: null,
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test6Res.canUpload === false, "Test 6: Early upload rejected without authorization");
assert(test6Res.reasonCode === "OUTSIDE_WINDOW", "Test 6: Reason is OUTSIDE_WINDOW");

// -------------------------------------------------------------
// Test 7: Staff Exception (Early Upload Authorized)
// -------------------------------------------------------------
console.log("\n--- Test 7: Staff Exception for Lost / Damaged Document ---");
const activeAuth: StudentUploadAuthorization = {
  id: "auth_99",
  studentId: "stu_1",
  documentType: "visa",
  reason: "document_lost",
  reasonDetails: "Passport and Student Visa reported stolen in transit. Police report Ref #FIR-2026-99.",
  validFrom: "2026-08-10T00:00:00Z",
  validUntil: "2026-08-20T00:00:00Z",
  status: "active",
  authorizedBy: "staff_user_01",
  createdAt: "2026-08-10T00:00:00Z"
};

const test7Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "visa",
  activeDocument: {
    versionNumber: 1,
    filePath: "visa/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2028-06-30"
  },
  pendingDocument: null,
  policyWindowDays: 30,
  activeAuthorization: activeAuth,
  currentDate: REF_DATE
});

assert(test7Res.canUpload === true, "Test 7: Upload is ENABLED with active staff exception");
assert(test7Res.reasonCode === "EARLY_AUTHORIZATION_ACTIVE", "Test 7: Reason code is EARLY_AUTHORIZATION_ACTIVE");
assert(test7Res.userTitle === "Early Upload Authorized", "Test 7: User title is Early Upload Authorized");
assert(test7Res.activeAuthorizationId === "auth_99", "Test 7: Captures authorization ID");
assert(test7Res.userMessage.includes("Document Lost"), "Test 7: Includes formatted reason in user message");

// Test expired authorization:
const expiredAuth: StudentUploadAuthorization = {
  ...activeAuth,
  validUntil: "2026-08-14T00:00:00Z" // expired yesterday
};

const test7bRes = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "visa",
  activeDocument: {
    versionNumber: 1,
    filePath: "visa/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2028-06-30"
  },
  pendingDocument: null,
  policyWindowDays: 30,
  activeAuthorization: expiredAuth,
  currentDate: REF_DATE
});

assert(test7bRes.canUpload === false, "Test 7b: Upload is DISABLED when exception window has expired");

// -------------------------------------------------------------
// Test 8: Expired Document
// -------------------------------------------------------------
console.log("\n--- Test 8: Expired Document ---");
const test8Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "passport",
  activeDocument: {
    versionNumber: 1,
    filePath: "passport/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2026-08-01" // expired 14 days ago
  },
  pendingDocument: null,
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test8Res.canUpload === true, "Test 8: Upload is ENABLED for expired document");
assert(test8Res.reasonCode === "EXPIRED_DOCUMENT", "Test 8: Reason code is EXPIRED_DOCUMENT");
assert(test8Res.userTitle === "Document Expired", "Test 8: User title is Document Expired");
assert(test8Res.daysUntilExpiry !== null && test8Res.daysUntilExpiry <= 0, "Test 8: daysUntilExpiry is negative/zero");

// -------------------------------------------------------------
// Test 9: Independent Document Type Eligibility
// -------------------------------------------------------------
console.log("\n--- Test 9: Independent Document Types ---");
// Passport = valid outside window (disabled)
const passRes = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "passport",
  activeDocument: {
    versionNumber: 1,
    filePath: "passport/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2030-01-01"
  },
  pendingDocument: null,
  policyWindowDays: 30,
  currentDate: REF_DATE
});

// Visa = expiring in 15 days (enabled)
const visaRes = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "visa",
  activeDocument: {
    versionNumber: 1,
    filePath: "visa/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2026-08-30"
  },
  pendingDocument: null,
  policyWindowDays: 30,
  currentDate: REF_DATE
});

// eFRRO = pending verification (disabled)
const efrroRes = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "efrro",
  activeDocument: {
    versionNumber: 1,
    filePath: "efrro/v1.pdf",
    verificationStatus: "verified",
    isActive: true,
    expiryDate: "2026-08-30"
  },
  pendingDocument: {
    versionNumber: 2,
    filePath: "efrro/v2.pdf",
    verificationStatus: "pending",
    isActive: false
  },
  policyWindowDays: 30,
  currentDate: REF_DATE
});

assert(passRes.canUpload === false && passRes.reasonCode === "OUTSIDE_WINDOW", "Test 9: Passport is OUTSIDE_WINDOW (disabled)");
assert(visaRes.canUpload === true && visaRes.reasonCode === "WINDOW_OPEN", "Test 9: Visa is WINDOW_OPEN (enabled)");
assert(efrroRes.canUpload === false && efrroRes.reasonCode === "PENDING_VERIFICATION", "Test 9: eFRRO is PENDING_VERIFICATION (disabled)");

// -------------------------------------------------------------
// Test 10: First Upload (No Document Uploaded)
// -------------------------------------------------------------
console.log("\n--- Test 10: First Upload (No Document On File) ---");
const test10Res = DocumentUploadEligibilityEngine.calculateEligibility({
  documentType: "passport",
  activeDocument: null,
  pendingDocument: null,
  policyWindowDays: 30,
  activeAuthorization: null,
  currentDate: REF_DATE
});

assert(test10Res.canUpload === true, "Test 10: Upload is ENABLED for first-time upload");
assert(test10Res.reasonCode === "FIRST_UPLOAD", "Test 10: Reason code is FIRST_UPLOAD");
assert(test10Res.isFirstUpload === true, "Test 10: isFirstUpload is true");
assert(test10Res.userTitle === "Document Required", "Test 10: User title is Document Required");

console.log("\n=======================================================");
console.log("  UPLOAD ELIGIBILITY TEST RESULTS: ALL TESTS PASSED");
console.log("=======================================================\n");
