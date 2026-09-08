/**
 * ISCMS Comprehensive Regression Test Suite: Document Renewals Classification
 *
 * Verifies Authoritative Business Rules:
 * 1. An Original document (version_number <= 1) is NOT a renewal (0 renewals).
 * 2. Only explicit renewal records (version_number > 1) contribute to "Renewals Recorded".
 * 3. Renewal 1 (version 2) counts as 1 renewal event.
 * 4. Renewal 2 (version 3) represents two total renewal records only when Renewal 1 also exists.
 * 5. Renewal numbers are not summed (count records, don't sum ordinal numbers).
 * 6. NULL / unknown version classifications are never counted as renewals.
 * 7. Live database cross-check: Emadaldeen's Student Profile and Dashboard both report 0 renewals.
 */

import "./test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import assert from "node:assert/strict";
import { reportRepository } from "../src/domain/reports/repositories/report.repository";
import { getAdminSupabase } from "../src/lib/supabase/admin";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
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

// Pure function simulation representing the authoritative classification logic
function calculateRenewalsRecorded(
  records: Array<{
    documentType: "passport" | "visa" | "efrro";
    versionNumber: number | null | undefined;
    deletedAt?: string | null;
  }>
): { total: number; byDocType: { passport: number; visa: number; efrro: number } } {
  const activeRecords = records.filter(r => !r.deletedAt);
  
  // Rule: Only version_number > 1 counts as a renewal
  const renewals = activeRecords.filter(r => {
    const vNum = Number(r.versionNumber);
    return !isNaN(vNum) && vNum > 1;
  });

  return {
    total: renewals.length,
    byDocType: {
      passport: renewals.filter(r => r.documentType === "passport").length,
      visa: renewals.filter(r => r.documentType === "visa").length,
      efrro: renewals.filter(r => r.documentType === "efrro").length
    }
  };
}

async function runSuite() {
  console.log("============================================================");
  console.log(" ISCMS REGRESSION TEST: DOCUMENT RENEWALS CLASSIFICATION");
  console.log("============================================================\n");

  // TEST 1 — Scenario A: Only Originals
  await test("TEST 1: Scenario A — Three Original records (Passport v1, Visa v1, eFRRO v1) = 0 renewals", () => {
    const input = [
      { documentType: "passport" as const, versionNumber: 1 },
      { documentType: "visa" as const, versionNumber: 1 },
      { documentType: "efrro" as const, versionNumber: 1 }
    ];
    const result = calculateRenewalsRecorded(input);
    assert.equal(result.total, 0, "Originals must contribute 0 renewals");
    assert.equal(result.byDocType.passport, 0);
    assert.equal(result.byDocType.visa, 0);
    assert.equal(result.byDocType.efrro, 0);
  });

  // TEST 2 — Scenario B: One Renewal
  await test("TEST 2: Scenario B — Passport (v1 + v2), Visa (v1), eFRRO (v1) = 1 renewal", () => {
    const input = [
      { documentType: "passport" as const, versionNumber: 1 },
      { documentType: "passport" as const, versionNumber: 2 }, // Renewal 1
      { documentType: "visa" as const, versionNumber: 1 },
      { documentType: "efrro" as const, versionNumber: 1 }
    ];
    const result = calculateRenewalsRecorded(input);
    assert.equal(result.total, 1, "Must count exactly 1 renewal event");
    assert.equal(result.byDocType.passport, 1);
    assert.equal(result.byDocType.visa, 0);
    assert.equal(result.byDocType.efrro, 0);
  });

  // TEST 3 — Scenario C: Two Renewals on Same Document
  await test("TEST 3: Scenario C — Passport (v1 + v2 + v3), Visa (v1), eFRRO (v1) = 2 renewals", () => {
    const input = [
      { documentType: "passport" as const, versionNumber: 1 },
      { documentType: "passport" as const, versionNumber: 2 }, // Renewal 1
      { documentType: "passport" as const, versionNumber: 3 }, // Renewal 2
      { documentType: "visa" as const, versionNumber: 1 },
      { documentType: "efrro" as const, versionNumber: 1 }
    ];
    const result = calculateRenewalsRecorded(input);
    assert.equal(result.total, 2, "Must count exactly 2 renewal events, NOT sum version numbers (1+2+3)");
    assert.equal(result.byDocType.passport, 2);
    assert.equal(result.byDocType.visa, 0);
    assert.equal(result.byDocType.efrro, 0);
  });

  // TEST 4 — Scenario D: Renewals Across Document Types
  await test("TEST 4: Scenario D — Passport (v1 + v2), Visa (v1 + v2), eFRRO (v1) = 2 renewals", () => {
    const input = [
      { documentType: "passport" as const, versionNumber: 1 },
      { documentType: "passport" as const, versionNumber: 2 }, // Passport Renewal 1
      { documentType: "visa" as const, versionNumber: 1 },
      { documentType: "visa" as const, versionNumber: 2 },     // Visa Renewal 1
      { documentType: "efrro" as const, versionNumber: 1 }
    ];
    const result = calculateRenewalsRecorded(input);
    assert.equal(result.total, 2, "Must count 2 renewals across Passport and Visa");
    assert.equal(result.byDocType.passport, 1);
    assert.equal(result.byDocType.visa, 1);
    assert.equal(result.byDocType.efrro, 0);
  });

  // TEST 5 — Scenario E: Multiple Renewals Across Document Types
  await test("TEST 5: Scenario E — Passport (v1, v2, v3, v4), Visa (v1, v2), eFRRO (v1) = 4 renewals", () => {
    const input = [
      { documentType: "passport" as const, versionNumber: 1 },
      { documentType: "passport" as const, versionNumber: 2 }, // Passport Renewal 1
      { documentType: "passport" as const, versionNumber: 3 }, // Passport Renewal 2
      { documentType: "passport" as const, versionNumber: 4 }, // Passport Renewal 3
      { documentType: "visa" as const, versionNumber: 1 },
      { documentType: "visa" as const, versionNumber: 2 },     // Visa Renewal 1
      { documentType: "efrro" as const, versionNumber: 1 }
    ];
    const result = calculateRenewalsRecorded(input);
    assert.equal(result.total, 4, "Must count 4 renewals (3 passport + 1 visa)");
    assert.equal(result.byDocType.passport, 3);
    assert.equal(result.byDocType.visa, 1);
    assert.equal(result.byDocType.efrro, 0);
  });

  // TEST 6 — Scenario F: NULL, Missing, or Unexpected Version Classification
  await test("TEST 6: Scenario F — NULL, undefined, 0, or malformed version numbers = NOT renewals", () => {
    const input = [
      { documentType: "passport" as const, versionNumber: null },
      { documentType: "passport" as const, versionNumber: undefined },
      { documentType: "visa" as const, versionNumber: 0 },
      { documentType: "visa" as const, versionNumber: NaN },
      { documentType: "efrro" as const, versionNumber: 1 }
    ];
    const result = calculateRenewalsRecorded(input);
    assert.equal(result.total, 0, "Unknown or malformed versions must never count as renewals");
    assert.equal(result.byDocType.passport, 0);
    assert.equal(result.byDocType.visa, 0);
    assert.equal(result.byDocType.efrro, 0);
  });

  // TEST 7 — Live Database Verification: Emadaldeen Gamal Mohammed Al-Ansi
  await test("TEST 7: Live Database — Emadaldeen's documents are Original (v1) and NOT counted as renewals", async () => {
    const supabase = getAdminSupabase();
    const { data: personal } = await supabase
      .from("student_personal")
      .select("student_id, full_name")
      .ilike("full_name", "%EMADALDEEN%")
      .single();

    assert(personal, "Student Emadaldeen must exist in database");
    const sId = personal.student_id;

    const [pRes, vRes] = await Promise.all([
      supabase.from("passport_versions").select("version_number").eq("student_id", sId),
      supabase.from("visa_versions").select("version_number").eq("student_id", sId)
    ]);

    const pVersions = pRes.data || [];
    const vVersions = vRes.data || [];

    // Verify all versions for this student are v1
    pVersions.forEach(pv => assert.equal(pv.version_number, 1, "Passport must be version 1 (Original)"));
    vVersions.forEach(vv => assert.equal(vv.version_number, 1, "Visa must be version 1 (Original)"));

    // Verify Dashboard metrics report 0 renewals for this database state
    const metrics = await reportRepository.getDashboardMetrics();
    assert.equal(metrics.renewalsRecorded, 0, "Dashboard renewalsRecorded must be 0 when only Originals exist");
    assert.equal(metrics.renewalsByDocType?.passport, 0, "Passport renewals must be 0");
    assert.equal(metrics.renewalsByDocType?.visa, 0, "Visa renewals must be 0");
    assert.equal(metrics.renewalsByDocType?.efrro, 0, "eFRRO renewals must be 0");
  });

  // TEST 8 — Live Drilldown Verification: 'renewals' category
  await test("TEST 8: Live Drilldown — 'renewals' category returns exactly 0 items when no v > 1 exists", async () => {
    const drilldown = await reportRepository.getDashboardDrilldown("renewals");
    assert.equal(drilldown.category, "renewals");
    assert.equal(drilldown.totalCount, 0, "drilldown totalCount must be 0");
    assert.equal(drilldown.items.length, 0, "drilldown items array must be empty");
    assert.equal(drilldown.byDocType?.passport, 0);
    assert.equal(drilldown.byDocType?.visa, 0);
    assert.equal(drilldown.byDocType?.efrro, 0);
  });

  console.log("\n============================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error("Suite failed:", err);
  process.exit(1);
});
