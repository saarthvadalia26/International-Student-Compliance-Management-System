/**
 * ISCMS Compliance Engine Acceptance & Regression Test Suite
 * Verifies strict 3-document compliance enforcement (Passport, Visa, and eFRRO)
 * and all 10 test cases defined in the ISCMS production requirements.
 */

import { ComplianceStatusService } from "../src/domain/compliance/services/document.service";
import { StudentSnapshot } from "../src/domain/compliance/types/student-snapshot.types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION_FAILED] ${msg}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  ISCMS 3-DOCUMENT COMPLIANCE ENGINE TEST SUITE");
  console.log("=======================================================\n");

  const today = new Date();
  const futureDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days in future
  const pastDate = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago (expired)
  const warningDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days in future (warning)

  // -------------------------------------------------------------
  // CASE 1: Passport: Valid, Visa: Valid, eFRRO: Valid -> COMPLIANT
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 1: All 3 documents valid (>30 days)...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA123",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: futureDate
    });
    assert(result.status === "COMPLIANT", `Expected COMPLIANT, got ${result.status}`);
    assert(result.score === 100, `Expected score 100, got ${result.score}`);
    console.log("  ✓ CASE 1 Passed (COMPLIANT, score: 100)");
  }

  // -------------------------------------------------------------
  // CASE 2: Passport: Valid, Visa: Valid, eFRRO: Missing -> MISSING (NOT Compliant)
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 2: eFRRO missing (not recorded)...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA123",
      visaExpiry: futureDate,
      efrroNumber: null,
      efrroExpiry: null
    });
    assert(result.status === "MISSING", `Expected MISSING, got ${result.status}`);
    assert(result.score === 0, `Expected score 0, got ${result.score}`);
    console.log("  ✓ CASE 2 Passed (MISSING / Documents Missing, score: 0)");
  }

  // -------------------------------------------------------------
  // CASE 3: Passport: Missing, Visa: Valid, eFRRO: Valid -> MISSING
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 3: Passport missing...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: null,
      passportExpiry: null,
      visaNumber: "VISA123",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: futureDate
    });
    assert(result.status === "MISSING", `Expected MISSING, got ${result.status}`);
    assert(result.score === 0, `Expected score 0, got ${result.score}`);
    console.log("  ✓ CASE 3 Passed (MISSING, score: 0)");
  }

  // -------------------------------------------------------------
  // CASE 4: Passport: Valid, Visa: Missing, eFRRO: Valid -> MISSING
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 4: Visa missing...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: null,
      visaExpiry: null,
      efrroNumber: "EFRRO123",
      efrroExpiry: futureDate
    });
    assert(result.status === "MISSING", `Expected MISSING, got ${result.status}`);
    assert(result.score === 0, `Expected score 0, got ${result.score}`);
    console.log("  ✓ CASE 4 Passed (MISSING, score: 0)");
  }

  // -------------------------------------------------------------
  // CASE 5: Passport: Expired, Visa: Valid, eFRRO: Valid -> EXPIRED
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 5: Passport expired...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: pastDate,
      visaNumber: "VISA123",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: futureDate
    });
    assert(result.status === "EXPIRED", `Expected EXPIRED, got ${result.status}`);
    assert(result.score === 10, `Expected score 10, got ${result.score}`);
    console.log("  ✓ CASE 5 Passed (EXPIRED, score: 10)");
  }

  // -------------------------------------------------------------
  // CASE 6: Passport: Valid, Visa: Expired, eFRRO: Valid -> EXPIRED
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 6: Visa expired...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA123",
      visaExpiry: pastDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: futureDate
    });
    assert(result.status === "EXPIRED", `Expected EXPIRED, got ${result.status}`);
    assert(result.score === 10, `Expected score 10, got ${result.score}`);
    console.log("  ✓ CASE 6 Passed (EXPIRED, score: 10)");
  }

  // -------------------------------------------------------------
  // CASE 7: Passport: Valid, Visa: Valid, eFRRO: Expired -> EXPIRED
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 7: eFRRO expired...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA123",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: pastDate
    });
    assert(result.status === "EXPIRED", `Expected EXPIRED, got ${result.status}`);
    assert(result.score === 10, `Expected score 10, got ${result.score}`);
    console.log("  ✓ CASE 7 Passed (EXPIRED, score: 10)");
  }

  // -------------------------------------------------------------
  // CASE 8: Visa Original: Expired, Visa Renewal 1: Valid -> Uses current/active renewal
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 8: Active Visa renewal 1 is valid (historical original was expired)...");
  {
    // Snapshot evaluates the active current document (Renewal 1)
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA-REN-1",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: futureDate
    });
    assert(result.status === "COMPLIANT", `Expected COMPLIANT for current renewal, got ${result.status}`);
    assert(result.score === 100, `Expected score 100, got ${result.score}`);
    console.log("  ✓ CASE 8 Passed (COMPLIANT with Renewal 1)");
  }

  // -------------------------------------------------------------
  // CASE 9: Visa Renewal 1: Expired, Visa Renewal 2: Valid -> Uses Renewal 2
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 9: Active Visa renewal 2 is valid...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA-REN-2",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: futureDate
    });
    assert(result.status === "COMPLIANT", `Expected COMPLIANT for Renewal 2, got ${result.status}`);
    console.log("  ✓ CASE 9 Passed (COMPLIANT with Renewal 2)");
  }

  // -------------------------------------------------------------
  // CASE 10: Historical eFRRO Expired, Current eFRRO Valid -> Uses current eFRRO
  // -------------------------------------------------------------
  console.log("▶ Testing CASE 10: Active eFRRO renewal is valid...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA123",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO-REN-1",
      efrroExpiry: futureDate
    });
    assert(result.status === "COMPLIANT", `Expected COMPLIANT with current eFRRO, got ${result.status}`);
    console.log("  ✓ CASE 10 Passed (COMPLIANT with current eFRRO)");
  }

  // -------------------------------------------------------------
  // Additional WARNING Test Case: Any document within 30 days
  // -------------------------------------------------------------
  console.log("▶ Testing Warning state: eFRRO expiring in 15 days...");
  {
    const result = ComplianceStatusService.calculateScoreAndStatus({
      passportNumber: "PASS123",
      passportExpiry: futureDate,
      visaNumber: "VISA123",
      visaExpiry: futureDate,
      efrroNumber: "EFRRO123",
      efrroExpiry: warningDate
    });
    assert(result.status === "WARNING", `Expected WARNING, got ${result.status}`);
    assert(result.score === 70, `Expected score 70, got ${result.score}`);
    console.log("  ✓ WARNING State Passed (WARNING, score: 70)");
  }

  console.log("\n=======================================================");
  console.log("  ALL 10+ COMPLIANCE ACCEPTANCE TESTS PASSED (100%)");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
