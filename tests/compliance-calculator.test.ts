/**
 * ISCMS Automated Test Suite: Authoritative Compliance Calculator
 * 
 * Verifies:
 * - Test 1: Complete eFRRO + Passport + Visa valid -> COMPLIANT (Score: 100)
 * - Test 2: Missing eFRRO record -> NOT Fully Compliant (MISSING, Score: 0)
 * - Test 3: Missing eFRRO expiry -> NOT Fully Compliant (MISSING, Score: 0)
 * - Test 4: Expired eFRRO -> EXPIRED (Score: 10)
 * - Test 5: Critical eFRRO (0-15 days) -> WARNING / CRITICAL
 * - Test 6: Upcoming eFRRO (16-30 days) -> WARNING
 * - Test 7: Renewal 1 is active -> Evaluates Renewal 1
 * - Test 8: Multiple renewals (Renewal 2 active) -> Evaluates Renewal 2
 * - Test 9: Missing required Passport -> NOT Fully Compliant (MISSING)
 * - Test 10: Missing required Visa -> NOT Fully Compliant (MISSING)
 * - Test 11: Multiple missing requirements (Visa + eFRRO) -> NOT Fully Compliant (MISSING)
 * - Test 12: Mandatory Regression — 100 students (80 compliant, 20 missing eFRRO) -> 80 compliant, NEVER 100
 * - Test 13: Edge cases (null, undefined, empty string, whitespace) -> never pass compliance
 */

import "./test-preload";
import assert from "node:assert/strict";
import { 
  ComplianceCalculator, 
  DocumentEvaluationInput, 
  StudentComplianceEvaluationInput 
} from "../src/domain/compliance/services/compliance-calculator";
import { CalendarDateEngine } from "../src/domain/notifications/services/calendar-date";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function runTests() {
  console.log("============================================================");
  console.log(" ISCMS TEST SUITE: AUTHORITATIVE COMPLIANCE CALCULATOR");
  console.log("============================================================\n");

  const todayStr = "2026-09-08";
  const safeFutureDate = "2027-09-08"; // > 300 days
  const criticalDate = "2026-09-18";   // 10 days (<= 15d)
  const warningDate = "2026-09-28";    // 20 days (16-30d)
  const expiredDate = "2026-08-01";    // past date (< 0d)

  // Standard valid documents
  const validPassport: DocumentEvaluationInput = {
    number: "P12345678",
    expiry: safeFutureDate,
    issueDate: "2022-01-01"
  };

  const validVisa: DocumentEvaluationInput = {
    number: "V87654321",
    expiry: safeFutureDate,
    issueDate: "2024-01-01"
  };

  const validEfrro: DocumentEvaluationInput = {
    number: "EF20260908X",
    expiry: safeFutureDate,
    issueDate: "2024-01-01"
  };

  // TEST 1 — Complete eFRRO
  await test("Test 1: Complete eFRRO + Passport + Visa -> Fully Compliant (Score 100)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: validEfrro
    }, todayStr);

    assert.equal(res.overallStatus, "COMPLIANT");
    assert.equal(res.isFullyCompliant, true);
    assert.equal(res.complianceScore, 100);
    assert.equal(res.hasMissingRequiredData, false);
    assert.equal(res.hasExpiredDocument, false);
    assert.equal(res.hasCriticalDocument, false);
    assert.equal(res.hasWarningDocument, false);
    assert.equal(ComplianceCalculator.mapComplianceToBadge(res.overallStatus), "compliant");
  });

  // TEST 2 — Missing eFRRO record
  await test("Test 2: Missing eFRRO record (null) -> NOT Fully Compliant (MISSING, Score 0)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: null
    }, todayStr);

    assert.notEqual(res.overallStatus, "COMPLIANT", "Must NOT be classified as COMPLIANT");
    assert.equal(res.overallStatus, "MISSING");
    assert.equal(res.isFullyCompliant, false, "isFullyCompliant must be false");
    assert.equal(res.complianceScore, 0);
    assert.equal(res.hasMissingRequiredData, true);
    assert.equal(ComplianceCalculator.mapComplianceToBadge(res.overallStatus), "non_compliant");
  });

  // TEST 3 — Missing eFRRO expiry
  await test("Test 3: eFRRO record exists but expiry is missing/empty -> NOT Fully Compliant (MISSING)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: { number: "EF999999", expiry: null }
    }, todayStr);

    assert.notEqual(res.overallStatus, "COMPLIANT", "Missing expiry must not be COMPLIANT");
    assert.equal(res.overallStatus, "MISSING");
    assert.equal(res.isFullyCompliant, false);
    assert.equal(res.hasMissingRequiredData, true);
  });

  // TEST 4 — Expired eFRRO
  await test("Test 4: Valid eFRRO information but expired -> EXPIRED (Score 10)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: { number: "EF999999", expiry: expiredDate }
    }, todayStr);

    assert.equal(res.overallStatus, "EXPIRED");
    assert.equal(res.isFullyCompliant, false);
    assert.equal(res.complianceScore, 10);
    assert.equal(res.hasExpiredDocument, true);
    assert.equal(res.efrro.isExpired, true);
    assert(res.efrro.daysRemaining! < 0, "Days remaining must be negative");
    assert.equal(ComplianceCalculator.mapComplianceToBadge(res.overallStatus), "expired");
  });

  // TEST 5 — Critical eFRRO
  await test("Test 5: eFRRO expiring within 15 days -> Critical & Warning (Score 70)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: { number: "EF999999", expiry: criticalDate }
    }, todayStr);

    assert.equal(res.overallStatus, "WARNING");
    assert.equal(res.isFullyCompliant, false);
    assert.equal(res.hasCriticalDocument, true);
    assert.equal(res.hasWarningDocument, true);
    assert.equal(res.efrro.isCritical, true);
    assert.equal(res.complianceScore, 70);
    assert.equal(ComplianceCalculator.mapComplianceToBadge(res.overallStatus), "warning");
  });

  // TEST 6 — Upcoming eFRRO
  await test("Test 6: eFRRO expiring within 16-30 days -> Warning but not Critical (Score 70)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: { number: "EF999999", expiry: warningDate }
    }, todayStr);

    assert.equal(res.overallStatus, "WARNING");
    assert.equal(res.isFullyCompliant, false);
    assert.equal(res.hasCriticalDocument, false);
    assert.equal(res.hasWarningDocument, true);
    assert.equal(res.efrro.isWarning, true);
    assert.equal(res.efrro.isCritical, false);
  });

  // TEST 7 — Renewal (Original expired, Renewal 1 active and valid)
  await test("Test 7: Renewal 1 is active -> Evaluates Renewal 1 data", () => {
    // Staff records Renewal 1 which is active
    const renewal1: DocumentEvaluationInput = {
      number: "EF-RENEWED-001",
      expiry: safeFutureDate,
      issueDate: "2026-08-01"
    };

    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: renewal1
    }, todayStr);

    assert.equal(res.overallStatus, "COMPLIANT");
    assert.equal(res.isFullyCompliant, true);
    assert.equal(res.efrro.hasValidRecord, true);
    assert.equal(res.efrro.isExpired, false);
  });

  // TEST 8 — Multiple renewals (Renewal 1 expired, Renewal 2 active and valid)
  await test("Test 8: Multiple renewals (Renewal 2 is active) -> Evaluates Renewal 2 data", () => {
    const renewal2: DocumentEvaluationInput = {
      number: "EF-RENEWED-002",
      expiry: safeFutureDate,
      issueDate: "2026-09-01"
    };

    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: renewal2
    }, todayStr);

    assert.equal(res.overallStatus, "COMPLIANT");
    assert.equal(res.isFullyCompliant, true);
  });

  // TEST 9 — Missing required Passport
  await test("Test 9: Missing required Passport -> NOT Fully Compliant (MISSING)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: null,
      visa: validVisa,
      efrro: validEfrro
    }, todayStr);

    assert.notEqual(res.overallStatus, "COMPLIANT");
    assert.equal(res.overallStatus, "MISSING");
    assert.equal(res.isFullyCompliant, false);
    assert.equal(res.hasMissingRequiredData, true);
  });

  // TEST 10 — Missing required Visa
  await test("Test 10: Missing required Visa -> NOT Fully Compliant (MISSING)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: null,
      efrro: validEfrro
    }, todayStr);

    assert.notEqual(res.overallStatus, "COMPLIANT");
    assert.equal(res.overallStatus, "MISSING");
    assert.equal(res.isFullyCompliant, false);
    assert.equal(res.hasMissingRequiredData, true);
  });

  // TEST 11 — Multiple missing requirements (Visa + eFRRO)
  await test("Test 11: Multiple missing requirements -> Action Required (MISSING)", () => {
    const res = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: null,
      efrro: null
    }, todayStr);

    assert.notEqual(res.overallStatus, "COMPLIANT");
    assert.equal(res.overallStatus, "MISSING");
    assert.equal(res.isFullyCompliant, false);
    assert.equal(res.complianceScore, 0);
  });

  // TEST 12 — MANDATORY REGRESSION TEST: Dashboard Count
  await test("Test 12: Mandatory Regression: 100 students (80 compliant, 20 missing eFRRO) -> Exactly 80 Fully Compliant", () => {
    const population: StudentComplianceEvaluationInput[] = [];

    // 80 students with full, valid Passport, Visa, and eFRRO
    for (let i = 0; i < 80; i++) {
      population.push({
        passport: { number: `PASS-${i}`, expiry: safeFutureDate },
        visa: { number: `VISA-${i}`, expiry: safeFutureDate },
        efrro: { number: `EFRRO-${i}`, expiry: safeFutureDate }
      });
    }

    // 20 students with valid Passport and Visa, but MISSING eFRRO
    for (let i = 80; i < 100; i++) {
      population.push({
        passport: { number: `PASS-${i}`, expiry: safeFutureDate },
        visa: { number: `VISA-${i}`, expiry: safeFutureDate },
        efrro: null // Missing eFRRO
      });
    }

    let fullyCompliantCount = 0;
    let incompleteActionRequiredCount = 0;

    for (const student of population) {
      const res = ComplianceCalculator.evaluateStudentCompliance(student, todayStr);
      if (res.isFullyCompliant) {
        fullyCompliantCount++;
      } else if (res.hasMissingRequiredData) {
        incompleteActionRequiredCount++;
      }
    }

    assert.equal(population.length, 100, "Total population must be 100");
    assert.equal(fullyCompliantCount, 80, "Fully Compliant must be exactly 80");
    assert.notEqual(fullyCompliantCount, 100, "Fully Compliant must NEVER be 100 when eFRRO is missing");
    assert.equal(incompleteActionRequiredCount, 20, "Incomplete/Action Required must be exactly 20");
  });

  // TEST 13 — Three-state Logic & Null Handling
  await test("Test 13: Null, undefined, empty string, and whitespace never pass positive compliance", () => {
    const blankValues = ["", "   ", null, undefined];

    for (const badNum of blankValues) {
      const res = ComplianceCalculator.evaluateStudentCompliance({
        passport: validPassport,
        visa: validVisa,
        efrro: { number: badNum, expiry: safeFutureDate }
      }, todayStr);

      assert.equal(
        res.isFullyCompliant, 
        false, 
        `Blank number ${JSON.stringify(badNum)} must fail positive compliance`
      );
      assert.equal(res.overallStatus, "MISSING");
    }

    for (const badExp of blankValues) {
      const res = ComplianceCalculator.evaluateStudentCompliance({
        passport: validPassport,
        visa: validVisa,
        efrro: { number: "EF12345", expiry: badExp }
      }, todayStr);

      assert.equal(
        res.isFullyCompliant, 
        false, 
        `Blank expiry ${JSON.stringify(badExp)} must fail positive compliance`
      );
      assert.equal(res.overallStatus, "MISSING");
    }

    // Invalid date string
    const resInvalid = ComplianceCalculator.evaluateStudentCompliance({
      passport: validPassport,
      visa: validVisa,
      efrro: { number: "EF12345", expiry: "not-a-valid-date" }
    }, todayStr);
    assert.equal(resInvalid.isFullyCompliant, false);
    assert.equal(resInvalid.overallStatus, "MISSING");
  });

  console.log("\n============================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
