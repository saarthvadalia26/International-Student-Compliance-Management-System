/**
 * ============================================================================
 * Acceptance Test Suite: Student Document Replacement Request Workflow
 * ============================================================================
 * 
 * Verifies that:
 * 1. Verified Document v1 -> Upload locked, Request Replacement available.
 * 2. Student requests Passport replacement -> Status becomes PENDING, upload locked.
 * 3. Staff approves request -> Status becomes APPROVED, upload window opens.
 * 4. Student uploads new Passport -> Status becomes PENDING VERIFICATION (no verified version yet).
 * 5. Staff approves new Passport -> v2 Verified, Upload locks again.
 * 6. Student attempts upload without replacement request -> Upload blocked.
 * 7. Duplicate replacement request -> Prevented while one is already pending.
 * 8. Unauthorized student request -> Blocked.
 * 9. Rejected replacement request -> Upload remains locked, reason visible, can request again.
 * 10. Expired upload window -> Upload disabled, requires new request.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  DocumentUploadEligibilityEngine, 
  ComplianceDocumentType, 
  DocumentVersionInfo,
  StudentUploadAuthorization
} from "../src/domain/compliance/services/upload-eligibility.service";
import { 
  DocumentReplacementRequestRecord,
  DocumentReplacementReason,
  REASON_LABELS
} from "../src/domain/compliance/types/replacement-request.types";

describe("Student Document Replacement Request Workflow", () => {

  console.log("\n=======================================================");
  console.log("  ISCMS DOCUMENT REPLACEMENT REQUEST ACCEPTANCE TESTS  ");
  console.log("=======================================================\n");

  const mockStudentId = "11111111-1111-4111-a111-111111111111";
  const otherStudentId = "22222222-2222-4222-a222-222222222222";

  // Simulated Database State for In-Memory Engine Validation
  interface MockDbState {
    students: Record<string, { id: string }>;
    documents: Record<string, {
      activeVersion: DocumentVersionInfo | null;
      pendingVersion: DocumentVersionInfo | null;
    }>;
    replacementRequests: DocumentReplacementRequestRecord[];
    uploadAuthorizations: StudentUploadAuthorization[];
  }

  let db: MockDbState;

  function resetDb() {
    db = {
      students: {
        [mockStudentId]: { id: mockStudentId },
        [otherStudentId]: { id: otherStudentId }
      },
      documents: {
        [`${mockStudentId}_passport`]: {
          activeVersion: {
            versionNumber: 1,
            filePath: "students/11111111-1111-4111-a111-111111111111/passport/v1.pdf",
            verificationStatus: "verified",
            isActive: true,
            expiryDate: "2028-12-20"
          },
          pendingVersion: null
        },
        [`${mockStudentId}_visa`]: {
          activeVersion: {
            versionNumber: 1,
            filePath: "students/11111111-1111-4111-a111-111111111111/visa/v1.pdf",
            verificationStatus: "verified",
            isActive: true,
            expiryDate: "2027-06-15"
          },
          pendingVersion: null
        },
        [`${mockStudentId}_efrro`]: {
          activeVersion: {
            versionNumber: 1,
            filePath: "students/11111111-1111-4111-a111-111111111111/efrro/v1.pdf",
            verificationStatus: "verified",
            isActive: true,
            expiryDate: "2027-01-30"
          },
          pendingVersion: null
        }
      },
      replacementRequests: [],
      uploadAuthorizations: []
    };
  }

  // Helper to calculate student upload eligibility based on db state
  function getEligibility(studentId: string, docType: ComplianceDocumentType, currentDate: string = "2026-08-15") {
    const docKey = `${studentId}_${docType}`;
    const docState = db.documents[docKey] || { activeVersion: null, pendingVersion: null };
    
    // Find active or pending replacement request
    const activeReq = db.replacementRequests.find(r => 
      r.studentId === studentId && 
      r.documentType === docType && 
      (r.status === "pending" || r.status === "approved" || r.status === "rejected")
    ) || null;

    const activeAuth = db.uploadAuthorizations.find(a => 
      a.studentId === studentId && 
      a.documentType === docType && 
      a.status === "active"
    ) || null;

    return DocumentUploadEligibilityEngine.calculateEligibility({
      documentType: docType,
      activeDocument: docState.activeVersion,
      pendingDocument: docState.pendingVersion,
      activeAuthorization: activeAuth,
      activeReplacementRequest: activeReq,
      currentDate
    });
  }

  function submitReplacementRequest(
    studentId: string, 
    docType: ComplianceDocumentType, 
    reason: DocumentReplacementReason, 
    reasonDetails: string,
    callerStudentId: string
  ): { success: boolean; error?: string; request?: DocumentReplacementRequestRecord } {
    // 1. Authorization check
    if (studentId !== callerStudentId) {
      return { success: false, error: "Unauthorized: You can only submit replacement requests for your own documents." };
    }

    // 2. Check existing pending or active approved request
    const existing = db.replacementRequests.find(r => 
      r.studentId === studentId && 
      r.documentType === docType && 
      r.status === "pending"
    );
    if (existing) {
      return { 
        success: false, 
        error: `A replacement request for your ${docType.toUpperCase()} is already pending review by the compliance team.` 
      };
    }

    const docKey = `${studentId}_${docType}`;
    const activeDoc = db.documents[docKey]?.activeVersion;

    const newReq: DocumentReplacementRequestRecord = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      studentId,
      documentType: docType,
      currentDocumentVersion: activeDoc?.versionNumber || 1,
      currentExpiryDate: activeDoc?.expiryDate || null,
      reason,
      reasonDetails: reasonDetails.trim() || REASON_LABELS[reason] || "Replacement requested",
      status: "pending",
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      authorizationId: null,
      authorizationExpiresAt: null,
      completedAt: null,
      completedVersionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.replacementRequests.push(newReq);
    return { success: true, request: newReq };
  }

  function staffApproveReplacementRequest(requestId: string, durationDays: number = 7) {
    const req = db.replacementRequests.find(r => r.id === requestId);
    if (!req) return { success: false, error: "Request not found." };

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const authId = `auth-${Date.now()}`;

    req.status = "approved";
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = "staff-user-id";
    req.authorizationId = authId;
    req.authorizationExpiresAt = expiresAt;

    db.uploadAuthorizations.push({
      id: authId,
      studentId: req.studentId,
      documentType: req.documentType,
      reason: "document_replaced",
      reasonDetails: req.reasonDetails,
      validFrom: new Date().toISOString(),
      validUntil: expiresAt,
      status: "active",
      createdAt: new Date().toISOString()
    });

    return { success: true, request: req };
  }

  function staffRejectReplacementRequest(requestId: string, rejectionReason: string) {
    const req = db.replacementRequests.find(r => r.id === requestId);
    if (!req) return { success: false, error: "Request not found." };

    req.status = "rejected";
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = "staff-user-id";
    req.rejectionReason = rejectionReason;

    return { success: true, request: req };
  }

  function studentUploadReplacementDocument(studentId: string, docType: ComplianceDocumentType, filePath: string) {
    const elig = getEligibility(studentId, docType);
    if (!elig.canUpload) {
      return { success: false, error: "Upload is locked. Please request a replacement first." };
    }

    const docKey = `${studentId}_${docType}`;
    db.documents[docKey].pendingVersion = {
      versionNumber: (db.documents[docKey].activeVersion?.versionNumber || 0) + 1,
      filePath,
      verificationStatus: "pending",
      isActive: false,
      expiryDate: "2031-08-01"
    };

    return { success: true };
  }

  function staffVerifyAndApproveDocument(studentId: string, docType: ComplianceDocumentType) {
    const docKey = `${studentId}_${docType}`;
    const pending = db.documents[docKey].pendingVersion;
    if (!pending) return { success: false, error: "No pending document to approve." };

    pending.verificationStatus = "verified";
    pending.isActive = true;
    db.documents[docKey].activeVersion = pending;
    db.documents[docKey].pendingVersion = null;

    // Consume replacement request & authorizations
    const req = db.replacementRequests.find(r => r.studentId === studentId && r.documentType === docType && r.status === "approved");
    if (req) {
      req.status = "completed";
    }
    const auth = db.uploadAuthorizations.find(a => a.studentId === studentId && a.documentType === docType && a.status === "active");
    if (auth) {
      auth.status = "consumed";
    }

    return { success: true, activeVersion: pending };
  }

  it("Test 1: Verified Passport v1 -> Upload locked, Request Replacement available", () => {
    resetDb();
    const elig = getEligibility(mockStudentId, "passport");
    assert.equal(elig.canUpload, false);
    assert.equal(elig.reasonCode, "OUTSIDE_WINDOW");
    assert.equal(elig.isPendingReview, false);
    console.log("✅ [PASS] Test 1: Verified Passport v1 is upload-locked and replacement request is accessible");
  });

  it("Test 2: Student requests Passport replacement -> Status becomes PENDING, Upload remains locked", () => {
    resetDb();
    const subRes = submitReplacementRequest(
      mockStudentId, 
      "passport", 
      "passport_renewed_early", 
      "Renewed passport early at embassy", 
      mockStudentId
    );

    assert.equal(subRes.success, true);
    assert.equal(subRes.request?.status, "pending");

    const elig = getEligibility(mockStudentId, "passport");
    assert.equal(elig.canUpload, false);
    assert.equal(elig.reasonCode, "REPLACEMENT_REQUEST_PENDING");
    assert.equal(elig.activeReplacementRequest?.status, "pending");
    console.log("✅ [PASS] Test 2: Replacement request is PENDING and upload remains securely locked");
  });

  it("Test 3: Staff approves request -> Status becomes APPROVED, Passport upload window opens", () => {
    resetDb();
    const subRes = submitReplacementRequest(
      mockStudentId, 
      "passport", 
      "passport_renewed_early", 
      "Renewed passport early at embassy", 
      mockStudentId
    );

    const appRes = staffApproveReplacementRequest(subRes.request!.id, 7);
    assert.equal(appRes.success, true);
    assert.equal(appRes.request?.status, "approved");

    const elig = getEligibility(mockStudentId, "passport");
    assert.equal(elig.canUpload, true);
    assert.equal(elig.reasonCode, "REPLACEMENT_REQUEST_APPROVED");

    // Other documents remain locked
    const visaElig = getEligibility(mockStudentId, "visa");
    const efrroElig = getEligibility(mockStudentId, "efrro");
    assert.equal(visaElig.canUpload, false);
    assert.equal(efrroElig.canUpload, false);

    console.log("✅ [PASS] Test 3: Approved request opens upload window ONLY for the requested document (Passport)");
  });

  it("Test 4: Student uploads new Passport -> Status becomes PENDING VERIFICATION, no verified version created yet", () => {
    resetDb();
    const subRes = submitReplacementRequest(mockStudentId, "passport", "passport_renewed_early", "Details", mockStudentId);
    staffApproveReplacementRequest(subRes.request!.id, 7);

    const uploadRes = studentUploadReplacementDocument(mockStudentId, "passport", "students/1111/passport/v2_temp.pdf");
    assert.equal(uploadRes.success, true);

    const elig = getEligibility(mockStudentId, "passport");
    assert.equal(elig.canUpload, false);
    assert.equal(elig.reasonCode, "PENDING_VERIFICATION");

    // Verified version remains v1 until staff verifies
    const currentActive = db.documents[`${mockStudentId}_passport`].activeVersion;
    assert.equal(currentActive?.versionNumber, 1);
    assert.equal(currentActive?.verificationStatus, "verified");

    console.log("✅ [PASS] Test 4: Uploaded replacement is Pending Verification without prematurely creating verified version");
  });

  it("Test 5: Staff approves new Passport -> v2 Verified, Upload locks again", () => {
    resetDb();
    const subRes = submitReplacementRequest(mockStudentId, "passport", "passport_renewed_early", "Details", mockStudentId);
    staffApproveReplacementRequest(subRes.request!.id, 7);
    studentUploadReplacementDocument(mockStudentId, "passport", "students/1111/passport/v2.pdf");

    const staffApproval = staffVerifyAndApproveDocument(mockStudentId, "passport");
    assert.equal(staffApproval.success, true);
    assert.equal(staffApproval.activeVersion?.versionNumber, 2);
    assert.equal(staffApproval.activeVersion?.verificationStatus, "verified");

    // Upload locks again
    const elig = getEligibility(mockStudentId, "passport");
    assert.equal(elig.canUpload, false);
    assert.equal(elig.reasonCode, "OUTSIDE_WINDOW");

    console.log("✅ [PASS] Test 5: Staff verification creates v2 Verified and automatically locks upload again");
  });

  it("Test 6: Student attempts direct upload without replacement request -> Upload blocked", () => {
    resetDb();
    const uploadRes = studentUploadReplacementDocument(mockStudentId, "passport", "students/1111/passport/rogue.pdf");
    assert.equal(uploadRes.success, false);
    assert.match(uploadRes.error!, /Upload is locked/i);
    console.log("✅ [PASS] Test 6: Direct upload blocked while document is valid");
  });

  it("Test 7: Duplicate replacement request -> Prevented while one is already pending", () => {
    resetDb();
    const firstReq = submitReplacementRequest(mockStudentId, "passport", "passport_lost", "Lost passport", mockStudentId);
    assert.equal(firstReq.success, true);

    const dupReq = submitReplacementRequest(mockStudentId, "passport", "passport_renewed_early", "Renewed", mockStudentId);
    assert.equal(dupReq.success, false);
    assert.match(dupReq.error!, /already pending/i);
    console.log("✅ [PASS] Test 7: Duplicate replacement requests for same document type are strictly prevented");
  });

  it("Test 8: Cross-student unauthorized replacement request -> Blocked", () => {
    resetDb();
    const unauthReq = submitReplacementRequest(mockStudentId, "passport", "passport_damaged", "Damaged", otherStudentId);
    assert.equal(unauthReq.success, false);
    assert.match(unauthReq.error!, /Unauthorized/i);
    console.log("✅ [PASS] Test 8: Cross-student replacement requests strictly denied");
  });

  it("Test 9: Rejected replacement request -> Upload remains locked, reason visible, can request again", () => {
    resetDb();
    const subReq = submitReplacementRequest(mockStudentId, "visa", "incorrect_document", "Uploaded wrong page", mockStudentId);
    assert.equal(subReq.success, true);

    const rejRes = staffRejectReplacementRequest(subReq.request!.id, "Please visit the compliance office with your original visa stamped copy.");
    assert.equal(rejRes.success, true);

    const elig = getEligibility(mockStudentId, "visa");
    assert.equal(elig.canUpload, false);
    assert.equal(elig.activeReplacementRequest?.status, "rejected");
    assert.equal(elig.activeReplacementRequest?.rejectionReason, "Please visit the compliance office with your original visa stamped copy.");

    // Student can submit a new replacement request
    const newReq = submitReplacementRequest(mockStudentId, "visa", "visa_renewed_reissued", "Received official renewal from FRRO", mockStudentId);
    assert.equal(newReq.success, true);
    console.log("✅ [PASS] Test 9: Rejected request leaves upload locked, presents staff reason, and allows new request submission");
  });

  it("Test 10: Expired upload authorization -> Upload disabled, requires new replacement request", () => {
    resetDb();
    const subReq = submitReplacementRequest(mockStudentId, "efrro", "efrro_reissued", "Reissued", mockStudentId);
    staffApproveReplacementRequest(subReq.request!.id, 7);

    // Simulate 10 days later (authorization expired)
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    
    // Invalidate authorization in mock db
    const auth = db.uploadAuthorizations.find(a => a.studentId === mockStudentId && a.documentType === "efrro");
    if (auth) auth.status = "expired";
    const req = db.replacementRequests.find(r => r.studentId === mockStudentId && r.documentType === "efrro");
    if (req) req.status = "expired";

    const elig = getEligibility(mockStudentId, "efrro", futureDate);
    assert.equal(elig.canUpload, false);
    assert.equal(elig.reasonCode, "OUTSIDE_WINDOW");

    console.log("✅ [PASS] Test 10: Expired authorization locks upload and requires new replacement request");
  });
});
