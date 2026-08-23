import "./test-preload";

import { DocumentUploadEligibilityEngine } from "../src/domain/compliance/services/upload-eligibility.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("  ISCMS: STUDENT PORTAL PERFORMANCE & UX OPTIMIZATION  ");
  console.log("=======================================================\n");

  console.log("--- Section 1: In-Memory Reference Cache Simulation ---");
  
  // Simulate the exact CacheEntry structure used in StudentPortalReferenceCache
  interface CacheEntry<T> {
    data: T;
    expiresAt: number;
  }
  let cache: CacheEntry<Record<string, string>> | null = null;
  const TTL_MS = 5 * 60 * 1000;

  const getCachedData = async () => {
    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      return { data: cache.data, cached: true };
    }
    // Simulate DB fetch (15ms)
    await new Promise((r) => setTimeout(r, 15));
    const fetched = { "CYBER_01": "B.Tech in Cyber Security & Forensic Science" };
    cache = { data: fetched, expiresAt: now + TTL_MS };
    return { data: fetched, cached: false };
  };

  const t1 = performance.now();
  const res1 = await getCachedData();
  const dur1 = performance.now() - t1;
  console.log(`Initial lookup time: ${dur1.toFixed(2)}ms (cached: ${res1.cached})`);
  assert(res1.cached === false, "First call is a fresh fetch");
  assert(res1.data["CYBER_01"] !== undefined, "Data loaded correctly");

  const t2 = performance.now();
  const res2 = await getCachedData();
  const dur2 = performance.now() - t2;
  console.log(`Subsequent cached lookup time: ${dur2.toFixed(2)}ms (cached: ${res2.cached})`);
  assert(res2.cached === true, "Second call is served from in-memory cache");
  assert(dur2 < 2, "Cache response time is under 2ms");

  console.log("\n--- Section 2: Deterministic Batch Upload Eligibility ---");
  
  // 1. Passport outside 30-day window
  const passportCalc = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "passport",
    activeDocument: {
      versionNumber: 1,
      filePath: "passport/test.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2029-10-15"
    },
    pendingDocument: null,
    policyWindowDays: 30,
    currentDate: "2026-08-23"
  });
  assert(passportCalc.canUpload === false, "Valid passport far from expiry has upload locked");
  assert(passportCalc.reasonCode === "OUTSIDE_WINDOW", "Reason code is OUTSIDE_WINDOW");

  // 2. Visa inside 30-day window
  const visaNearExpiryCalc = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "visa",
    activeDocument: {
      versionNumber: 1,
      filePath: "visa/test.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2026-09-10" // 18 days from 2026-08-23 -> inside 30-day window
    },
    pendingDocument: null,
    policyWindowDays: 30,
    currentDate: "2026-08-23"
  });
  assert(visaNearExpiryCalc.canUpload === true, "Visa inside 30-day pre-expiry window has upload open");
  assert(visaNearExpiryCalc.reasonCode === "WINDOW_OPEN", "Reason code is WINDOW_OPEN");

  // 3. Approved early replacement authorization
  const earlyAuthCalc = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "passport",
    activeDocument: {
      versionNumber: 1,
      filePath: "passport/test.pdf",
      verificationStatus: "verified",
      isActive: true,
      expiryDate: "2029-10-15"
    },
    pendingDocument: null,
    activeAuthorization: {
      id: "auth-101",
      studentId: "stu-101",
      documentType: "passport",
      reason: "document_damaged",
      reasonDetails: "Passport water damaged, replaced",
      validFrom: "2026-08-20T00:00:00Z",
      validUntil: "2026-08-27T00:00:00Z",
      status: "active",
      createdAt: "2026-08-20T00:00:00Z"
    },
    policyWindowDays: 30,
    currentDate: "2026-08-23"
  });
  assert(earlyAuthCalc.canUpload === true, "Approved staff exception unlocks early upload");
  assert(earlyAuthCalc.reasonCode === "EARLY_AUTHORIZATION_ACTIVE", "Reason code is EARLY_AUTHORIZATION_ACTIVE");

  console.log("\n--- Section 3: First Upload & Data Isolation ---");
  const efrroCalc = DocumentUploadEligibilityEngine.calculateEligibility({
    documentType: "efrro",
    activeDocument: null,
    pendingDocument: null,
    policyWindowDays: 30,
    currentDate: "2026-08-23"
  });
  assert(efrroCalc.canUpload === true, "Unsubmitted eFRRO document allows FIRST_UPLOAD");
  assert(efrroCalc.reasonCode === "FIRST_UPLOAD", "Reason code is FIRST_UPLOAD");

  console.log("\n=======================================================");
  console.log("  ALL PERFORMANCE & UX TESTS PASSED SUCCESSFULLY!      ");
  console.log("=======================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Performance test suite failure:", err);
  process.exit(1);
});
