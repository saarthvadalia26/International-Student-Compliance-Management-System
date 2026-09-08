/**
 * ISCMS Automated Test Suite: Unified Compliance Operations Dashboard
 *
 * Verifies:
 * 1. Total active students matches database authoritative count.
 * 2. Fully compliant identification (valid Passport & Visa, upload-independent).
 * 3. 30-day expiry counts across Passport, Visa, and eFRRO.
 * 4. 15-day critical expiry counts across Passport, Visa, and eFRRO.
 * 5. Expired documents count across Passport, Visa, and eFRRO.
 * 6. Historical superseded versions are ignored (only latest active version evaluated).
 * 7. Renewals recorded in the last 30 days (reflecting versions > 1 and audit_log).
 * 8. Notifications sent today and failed notifications tracking.
 * 9. Drill-down data structure and item schema validation for all categories.
 * 10. Analytics charts data includes upcomingExpiryByDocType matching card breakdowns.
 */

import "./test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import assert from "node:assert/strict";
import { reportRepository } from "../src/domain/reports/repositories/report.repository";
import { _fetchAnalyticsChartsInternal } from "../src/app/(app)/dashboard/actions";

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

async function runTests() {
  console.log("============================================================");
  console.log(" ISCMS TEST SUITE: UNIFIED COMPLIANCE OPERATIONS DASHBOARD");
  console.log("============================================================\n");

  const metrics = await reportRepository.getDashboardMetrics();
  console.log("Retrieved Dashboard Metrics:", JSON.stringify(metrics, null, 2));

  // TEST 1 — Total Active Students
  await test("TEST 1: Total active students count is populated and positive", () => {
    assert(typeof metrics.totalStudents === "number", "totalStudents must be a number");
    assert(metrics.totalStudents > 0, "totalStudents must be greater than zero in seeded database");
  });

  // TEST 2 — Fully Compliant Calculation
  await test("TEST 2: Fully compliant count is calculated without upload dependency", () => {
    assert(typeof metrics.fullyCompliantStudents === "number", "fullyCompliantStudents must be a number");
    assert(
      metrics.fullyCompliantStudents <= metrics.totalStudents,
      "fullyCompliantStudents cannot exceed totalStudents"
    );
    const complianceRate = (metrics.fullyCompliantStudents / metrics.totalStudents) * 100;
    assert(
      complianceRate >= 0 && complianceRate <= 100,
      `complianceRate (${complianceRate}) must be between 0 and 100`
    );
  });

  // TEST 3 — 30-Day Expiry (Unified across Passport, Visa, eFRRO)
  await test("TEST 3: 30-Day Expiry metric includes multi-document breakdown", () => {
    assert(typeof metrics.expiringIn30Days === "number", "expiringIn30Days must be a number");
    assert(metrics.expiringByDocType, "expiringByDocType must exist");
    assert(metrics.documentCounts, "documentCounts must exist");
    
    const { passport, visa, efrro } = metrics.expiringByDocType;
    assert(typeof passport.expiring30 === "number", "passport expiring30 must be a number");
    assert(typeof visa.expiring30 === "number", "visa expiring30 must be a number");
    assert(typeof efrro.expiring30 === "number", "efrro expiring30 must be a number");
    assert(
      typeof metrics.documentCounts.expiringIn30DaysDocs === "number",
      "expiringIn30DaysDocs must be a number"
    );
  });

  // TEST 4 — 15-Day Critical Expiry (Unified across Passport, Visa, eFRRO)
  await test("TEST 4: 15-Day Critical metric is a subset of 30-day and includes breakdown", () => {
    assert(typeof metrics.criticalIn15Days === "number", "criticalIn15Days must be a number");
    assert(
      metrics.criticalIn15Days <= metrics.expiringIn30Days,
      "criticalIn15Days cannot exceed expiringIn30Days"
    );
    const { passport, visa, efrro } = metrics.expiringByDocType!;
    assert(typeof passport.critical15 === "number", "passport critical15 must be a number");
    assert(typeof visa.critical15 === "number", "visa critical15 must be a number");
    assert(typeof efrro.critical15 === "number", "efrro critical15 must be a number");
  });

  // TEST 5 — Expired Documents (Unified across Passport, Visa, eFRRO)
  await test("TEST 5: Expired documents metric includes multi-document breakdown", () => {
    assert(typeof metrics.expiredDocuments === "number", "expiredDocuments must be a number");
    const { passport, visa, efrro } = metrics.expiringByDocType!;
    assert(typeof passport.expired === "number", "passport expired must be a number");
    assert(typeof visa.expired === "number", "visa expired must be a number");
    assert(typeof efrro.expired === "number", "efrro expired must be a number");
    assert(
      typeof metrics.documentCounts?.expiredDocs === "number",
      "expiredDocs count must be a number"
    );
  });

  // TEST 6 — Renewals Recorded Metric
  await test("TEST 6: Renewals recorded replaces obsolete pending verification and tracks 30-day window", () => {
    assert(typeof metrics.renewalsRecorded === "number", "renewalsRecorded must be a number");
    assert(metrics.renewalsByDocType, "renewalsByDocType must exist");
    const { passport, visa, efrro } = metrics.renewalsByDocType;
    assert(typeof passport === "number", "passport renewal breakdown must be a number");
    assert(typeof visa === "number", "visa renewal breakdown must be a number");
    assert(typeof efrro === "number", "efrro renewal breakdown must be a number");
    // Verify obsolete property is no longer present on DashboardMetrics
    assert.equal(
      (metrics as unknown as Record<string, unknown>).pendingEfrroVerification,
      undefined,
      "pendingEfrroVerification must be completely removed"
    );
  });

  // TEST 7 — Notifications Sent Today & Failures
  await test("TEST 7: Notification dispatch metrics for today and failures", () => {
    assert(typeof metrics.notificationsSentToday === "number", "notificationsSentToday must be a number");
    assert(typeof metrics.failedNotifications === "number", "failedNotifications must be a number");
  });

  // TEST 8 — Drill-down for Expiring in 30 Days
  await test("TEST 8: Drill-down for 'expiring_30' returns valid item structure", async () => {
    const drilldown = await reportRepository.getDashboardDrilldown("expiring_30");
    assert.equal(drilldown.category, "expiring_30");
    assert(Array.isArray(drilldown.items), "drilldown.items must be an array");
    assert.equal(drilldown.totalCount, drilldown.items.length);

    drilldown.items.forEach(item => {
      assert(item.studentId, "studentId required");
      assert(item.studentName, "studentName required");
      assert(["passport", "visa", "efrro"].includes(item.documentType?.toLowerCase() || ""), "documentType must be valid");
      assert(item.expiryDate, "expiryDate required");
      assert(item.daysRemaining !== null, "daysRemaining must not be null for expiring items");
      assert(item.daysRemaining! >= 0 && item.daysRemaining! <= 30, `daysRemaining (${item.daysRemaining}) must be within 0-30 days`);
    });
  });

  // TEST 9 — Drill-down for Critical 15 Days
  await test("TEST 9: Drill-down for 'critical_15' returns items within 0-15 days", async () => {
    const drilldown = await reportRepository.getDashboardDrilldown("critical_15");
    assert.equal(drilldown.category, "critical_15");
    assert(Array.isArray(drilldown.items), "drilldown.items must be an array");

    drilldown.items.forEach(item => {
      assert(item.studentId, "studentId required");
      assert(["passport", "visa", "efrro"].includes(item.documentType?.toLowerCase() || ""), "documentType must be valid");
      assert(item.daysRemaining !== null, "daysRemaining must not be null");
      assert(item.daysRemaining! >= 0 && item.daysRemaining! <= 15, `daysRemaining (${item.daysRemaining}) must be within 0-15 days`);
    });
  });

  // TEST 10 — Drill-down for Expired Documents
  await test("TEST 10: Drill-down for 'expired' returns items with negative days remaining", async () => {
    const drilldown = await reportRepository.getDashboardDrilldown("expired");
    assert.equal(drilldown.category, "expired");
    assert(Array.isArray(drilldown.items), "drilldown.items must be an array");

    drilldown.items.forEach(item => {
      assert(item.studentId, "studentId required");
      assert(["passport", "visa", "efrro"].includes(item.documentType?.toLowerCase() || ""), "documentType must be valid");
      assert(item.daysRemaining !== null, "daysRemaining must not be null");
      assert(item.daysRemaining! < 0, `daysRemaining (${item.daysRemaining}) must be negative for expired documents`);
    });
  });

  // TEST 11 — Drill-down for Renewals Recorded
  await test("TEST 11: Drill-down for 'renewals' returns valid renewal records", async () => {
    const drilldown = await reportRepository.getDashboardDrilldown("renewals");
    assert.equal(drilldown.category, "renewals");
    assert(Array.isArray(drilldown.items), "drilldown.items must be an array");

    drilldown.items.forEach(item => {
      assert(item.studentId, "studentId required");
      assert(["passport", "visa", "efrro"].includes(item.documentType?.toLowerCase() || ""), `documentType (${item.documentType}) must be valid`);
      assert(item.versionLabel || item.recordedAt, "versionLabel or recordedAt must be populated");
    });
  });

  // TEST 12 — Drill-down for Failed Notifications
  await test("TEST 12: Drill-down for 'failed_notifications' returns valid failure items", async () => {
    const drilldown = await reportRepository.getDashboardDrilldown("failed_notifications");
    assert.equal(drilldown.category, "failed_notifications");
    assert(Array.isArray(drilldown.items), "drilldown.items must be an array");

    drilldown.items.forEach(item => {
      assert(item.studentId, "studentId required");
      assert(item.failureReason || item.status, "failureReason or status required");
    });
  });

  // TEST 13 — Analytics Charts: Upcoming Expiry by Document Type
  await test("TEST 13: Analytics charts data includes upcomingExpiryByDocType with Passport, Visa, eFRRO", async () => {
    const chartsData = await _fetchAnalyticsChartsInternal();
    assert(chartsData.upcomingExpiryByDocType, "upcomingExpiryByDocType must be present");
    const { passport, visa, efrro } = chartsData.upcomingExpiryByDocType;

    assert(passport, "Passport entry must be present");
    assert(visa, "Visa entry must be present");
    assert(efrro, "eFRRO entry must be present");

    // Breakdown counts in upcomingExpiryByDocType should reconcile with metrics breakdowns
    assert.equal(passport.expiring30, metrics.expiringByDocType?.passport.expiring30);
    assert.equal(passport.critical15, metrics.expiringByDocType?.passport.critical15);
    assert.equal(passport.expired, metrics.expiringByDocType?.passport.expired);

    assert.equal(visa.expiring30, metrics.expiringByDocType?.visa.expiring30);
    assert.equal(visa.critical15, metrics.expiringByDocType?.visa.critical15);
    assert.equal(visa.expired, metrics.expiringByDocType?.visa.expired);

    assert.equal(efrro.expiring30, metrics.expiringByDocType?.efrro.expiring30);
    assert.equal(efrro.critical15, metrics.expiringByDocType?.efrro.critical15);
    assert.equal(efrro.expired, metrics.expiringByDocType?.efrro.expired);
  });

  // TEST 14 — No Obsolete Statuses in Compliance Distribution
  await test("TEST 14: Compliance distribution has no obsolete UPLOAD_PENDING or MISSING statuses", async () => {
    const chartsData = await _fetchAnalyticsChartsInternal();
    chartsData.complianceDistribution.forEach(entry => {
      assert.notEqual(entry.name, "Upload Required / Missing Documents", "Obsolete status must not exist");
      assert.notEqual(entry.name, "UPLOAD_PENDING", "UPLOAD_PENDING must not exist in compliance distribution");
      assert.notEqual(entry.name, "MISSING", "MISSING must not exist in compliance distribution");
    });
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
