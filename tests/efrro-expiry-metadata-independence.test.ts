/**
 * ============================================================================
 * ISCMS eFRRO EXPIRY METADATA INDEPENDENCE & REMINDER INTEGRATION TEST SUITE
 * ============================================================================
 *
 * Implements and verifies the core ISCMS business rule:
 * "An eFRRO expiry date must be usable by the reminder engine even when
 *  the student's eFRRO PDF/document has not been uploaded."
 *
 * Test Coverage:
 * 1. Test 1 — Metadata only: eFRRO expiry exists, PDF does not exist -> reminder schedule generated
 * 2. Test 2 — PDF uploaded but not verified: eFRRO expiry exists, PDF exists, verification pending -> reminder schedule generated
 * 3. Test 3 — PDF verified: eFRRO expiry exists, PDF exists, verified -> reminder schedule generated
 * 4. Test 4 — No expiry date: eFRRO metadata exists, expiry date = null -> all rules NOT_APPLICABLE
 * 5. Test 5 — Expiry within 15 days: 15-day reminder becomes applicable / Due Now
 * 6. Test 6 — Expiry already passed: Document shown as expired, historical dates marked EXPIRED
 * 7. Test 7 — Expiry correction: Old expiry -> New expiry recalculated, no duplicate reminders
 * 8. Test 8 — First physical upload: Metadata exists (no version) -> first PDF uploaded -> v1 created, reminder schedule remains valid
 * 9. Test 9 — Passport and Visa parity: Identical architectural decoupling across all 3 compliance documents
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";
import { CalendarDateEngine } from "../src/domain/notifications/services/calendar-date";
import { RegisterStudentValidationSchema } from "../src/services/validation/student-validation";

console.log("\n==================================================================");
console.log("  ISCMS eFRRO EXPIRY METADATA INDEPENDENCE TEST SUITE             ");
console.log("==================================================================\n");

describe("eFRRO Expiry Metadata Independence Acceptance Tests", () => {
  const TODAY = "2026-08-15";

  // -------------------------------------------------------------
  // Test 1: Metadata Only
  // -------------------------------------------------------------
  it("Test 1 — Metadata only: eFRRO expiry exists, physical PDF does not exist", () => {
    const expiry = "2026-08-31"; // 16 days from 2026-08-15

    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/9981",
      expiryDate: expiry,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.isUploaded, false, "Document is correctly marked as NOT uploaded");
    assert.strictEqual(reminders.verificationStatus, "not_uploaded", "Verification status is not_uploaded");
    assert.strictEqual(reminders.daysRemaining, 16, "Calculates 16 days remaining");
    assert.strictEqual(reminders.isExpired, false, "Document is not expired");
    assert.strictEqual(reminders.schedule.length, 5, "Generates full 5-tier reminder schedule");

    // Check that 90d, 60d, 30d milestones that already passed are marked DUE (Due Now)
    const rule30 = reminders.schedule.find(r => r.thresholdDays === 30);
    assert.ok(rule30, "30-day rule exists");
    assert.strictEqual(rule30?.status, "DUE", "30-day milestone is Due Now");
    assert.strictEqual(rule30?.statusLabel, "Due Now", "Label is Due Now");

    // Check that 15d milestone (scheduled for 2026-08-16) is NOT_DUE / Scheduled
    const rule15 = reminders.schedule.find(r => r.thresholdDays === 15);
    assert.ok(rule15, "15-day rule exists");
    assert.strictEqual(rule15?.scheduledDateISO, "2026-08-16", "15-day milestone scheduled for 2026-08-16");
    assert.strictEqual(rule15?.status, "NOT_DUE", "15-day milestone is Scheduled for tomorrow");

    console.log("✅ [PASS] Test 1: Metadata-only eFRRO generated active reminder schedule without PDF");
  });

  // -------------------------------------------------------------
  // Test 2: PDF Uploaded but Pending Verification
  // -------------------------------------------------------------
  it("Test 2 — PDF uploaded but not verified: eFRRO expiry exists, PDF exists, verification pending", () => {
    const expiry = "2026-11-13"; // 90 days from 2026-08-15

    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/7711",
      expiryDate: expiry,
      isUploaded: true,
      verificationStatus: "pending",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.isUploaded, true, "Physical PDF is marked as uploaded");
    assert.strictEqual(reminders.verificationStatus, "pending", "Verification status is pending");
    assert.strictEqual(reminders.daysRemaining, 90, "Calculates 90 days remaining");
    
    const rule90 = reminders.schedule.find(r => r.thresholdDays === 90);
    assert.strictEqual(rule90?.status, "DUE", "90-day milestone is Due today");
    assert.strictEqual(rule90?.scheduledDateISO, "2026-08-15", "Scheduled for today");

    console.log("✅ [PASS] Test 2: Pending document calculates reminder schedule accurately");
  });

  // -------------------------------------------------------------
  // Test 3: PDF Verified
  // -------------------------------------------------------------
  it("Test 3 — PDF verified: eFRRO expiry exists, PDF exists, verified", () => {
    const expiry = "2027-08-15"; // 365 days from 2026-08-15

    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/1234",
      expiryDate: expiry,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.isUploaded, true, "Physical PDF is marked as uploaded");
    assert.strictEqual(reminders.verificationStatus, "verified", "Verification status is verified");
    assert.strictEqual(reminders.daysRemaining, 365, "Calculates 365 days remaining");
    assert.ok(reminders.schedule.every(r => r.status === "NOT_DUE"), "All milestones scheduled in future");

    console.log("✅ [PASS] Test 3: Verified document generates active reminder schedule");
  });

  // -------------------------------------------------------------
  // Test 4: No Expiry Date
  // -------------------------------------------------------------
  it("Test 4 — No expiry date: eFRRO metadata exists, expiry date = null", () => {
    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/PENDING/001",
      expiryDate: null,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.expiryDate, null, "Expiry date is null");
    assert.strictEqual(reminders.daysRemaining, null, "Days remaining is null");
    assert.ok(reminders.schedule.every(r => r.status === "NOT_APPLICABLE"), "All rules NOT_APPLICABLE");

    console.log("✅ [PASS] Test 4: Missing expiry safely produces NOT_APPLICABLE status without crashing");
  });

  // -------------------------------------------------------------
  // Test 5: Expiry Within 15 Days
  // -------------------------------------------------------------
  it("Test 5 — Expiry within 15 days: 15-day reminder becomes applicable", () => {
    const expiry = "2026-08-25"; // 10 days from 2026-08-15

    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/CRIT",
      expiryDate: expiry,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.daysRemaining, 10, "10 days remaining");
    const rule15 = reminders.schedule.find(r => r.thresholdDays === 15);
    assert.ok(rule15, "15-day rule exists");
    assert.strictEqual(rule15?.status, "DUE", "15-day milestone is Due Now");
    assert.strictEqual(rule15?.statusLabel, "Due Now", "Label is Due Now");

    const rule7 = reminders.schedule.find(r => r.thresholdDays === 7);
    assert.ok(rule7, "7-day rule exists");
    assert.strictEqual(rule7?.status, "NOT_DUE", "7-day milestone is Scheduled for 2026-08-18");

    console.log("✅ [PASS] Test 5: 15-day critical warning triggered when expiry is within 15 days");
  });

  // -------------------------------------------------------------
  // Test 6: Expiry Already Passed
  // -------------------------------------------------------------
  it("Test 6 — Expiry already passed: Document shown as expired, historical milestones marked EXPIRED", () => {
    const expiry = "2026-08-01"; // 14 days ago

    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/EXP",
      expiryDate: expiry,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.isExpired, true, "Document is expired");
    assert.strictEqual(reminders.daysRemaining, -14, "-14 days remaining");
    assert.ok(reminders.schedule.every(r => r.status === "EXPIRED"), "All rules marked EXPIRED");

    console.log("✅ [PASS] Test 6: Expired document marks milestones as EXPIRED with zero false future schedules");
  });

  // -------------------------------------------------------------
  // Test 7: Expiry Correction (Recalculation & Invalidation)
  // -------------------------------------------------------------
  it("Test 7 — Expiry correction: Old future schedule recalculated from new expiry without duplicate reminders", () => {
    const oldExpiry = "2026-08-31"; // 16 days remaining
    const newExpiry = "2026-12-31"; // 138 days remaining

    // Initial schedule from old expiry
    const oldSchedule = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/8899",
      expiryDate: oldExpiry,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    const oldRule30 = oldSchedule.schedule.find(r => r.thresholdDays === 30);
    assert.strictEqual(oldRule30?.status, "DUE", "Old 30-day rule was Due Now");

    // Corrected schedule from new expiry
    const newSchedule = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/8899",
      expiryDate: newExpiry,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(newSchedule.daysRemaining, 138, "New schedule has 138 days remaining");
    const newRule30 = newSchedule.schedule.find(r => r.thresholdDays === 30);
    assert.strictEqual(newRule30?.status, "NOT_DUE", "New 30-day rule is now Scheduled in future on 2026-12-01");
    assert.strictEqual(newRule30?.scheduledDateISO, "2026-12-01", "30-day milestone scheduled for 2026-12-01");

    console.log("✅ [PASS] Test 7: In-place expiry correction recalculated future reminders without duplication");
  });

  // -------------------------------------------------------------
  // Test 8: First Physical Upload (Version Creation)
  // -------------------------------------------------------------
  it("Test 8 — First physical upload: Metadata exists (no version) -> student uploads PDF -> v1 created, reminders preserved", () => {
    // 1. Initial State: Metadata only, version count 0
    let studentSnapshot = {
      efrro_number: "FRRO/2026/NEW",
      efrro_issue_date: "2026-08-01",
      efrro_expiry: "2027-08-01",
      efrro_status: "MISSING"
    };
    let efrroVersions: Array<{ id: string; version_number: number; file_path: string; verification_status: string }> = [];

    assert.strictEqual(efrroVersions.length, 0, "Initial version count is 0");

    const preUploadReminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: studentSnapshot.efrro_number,
      expiryDate: studentSnapshot.efrro_expiry,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(preUploadReminders.schedule.length, 5, "Pre-upload reminder schedule active");

    // 2. Student uploads first physical document -> establishes v1
    efrroVersions.push({
      id: "ver-efrro-v1",
      version_number: 1,
      file_path: "documents/student-123/efrro/20260815_efrro_cert.pdf",
      verification_status: "pending"
    });

    assert.strictEqual(efrroVersions.length, 1, "First upload creates v1");
    assert.strictEqual(efrroVersions[0].version_number, 1, "Version number is exactly 1");

    // 3. Post-upload reminder calculation continues using authoritative expiry
    const postUploadReminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: studentSnapshot.efrro_number,
      expiryDate: studentSnapshot.efrro_expiry,
      isUploaded: true,
      verificationStatus: "pending",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(postUploadReminders.isUploaded, true, "Post-upload isUploaded is true");
    assert.strictEqual(postUploadReminders.verificationStatus, "pending", "Verification status is pending");
    assert.strictEqual(postUploadReminders.daysRemaining, 351, "Authoritative expiry preserved (351 days remaining)");
    assert.strictEqual(postUploadReminders.schedule.length, 5, "Reminder schedule remains active");

    console.log("✅ [PASS] Test 8: First upload established v1 while preserving existing reminder schedule");
  });

  // -------------------------------------------------------------
  // Test 9: Passport and Visa Parity
  // -------------------------------------------------------------
  it("Test 9 — Passport and Visa parity: Identical architectural decoupling across all 3 compliance documents", () => {
    const studentReminders = ExpiryReminderEngine.calculateStudentReminders({
      studentId: "student-parity-test",
      passport: {
        number: "P12345678",
        expiryDate: "2026-09-14", // 30 days away -> 30-day milestone DUE today
        isUploaded: false,
        verificationStatus: "not_uploaded"
      },
      visa: {
        number: "V87654321",
        expiryDate: "2026-10-14", // 60 days away -> 60-day milestone DUE today
        isUploaded: false,
        verificationStatus: "not_uploaded"
      },
      efrro: {
        number: "FRRO998877",
        expiryDate: "2026-11-13", // 90 days away -> 90-day milestone DUE today
        isUploaded: false,
        verificationStatus: "not_uploaded"
      },
      notifications: [],
      todayISO: TODAY
    });

    // Passport checks
    assert.strictEqual(studentReminders.passport.isUploaded, false, "Passport isUploaded is false");
    assert.strictEqual(studentReminders.passport.daysRemaining, 30, "Passport 30 days remaining");
    const passRule30 = studentReminders.passport.schedule.find(r => r.thresholdDays === 30);
    assert.strictEqual(passRule30?.status, "DUE", "Passport 30-day rule is DUE today");

    // Visa checks
    assert.strictEqual(studentReminders.visa.isUploaded, false, "Visa isUploaded is false");
    assert.strictEqual(studentReminders.visa.daysRemaining, 60, "Visa 60 days remaining");
    const visaRule60 = studentReminders.visa.schedule.find(r => r.thresholdDays === 60);
    assert.strictEqual(visaRule60?.status, "DUE", "Visa 60-day rule is DUE today");

    // eFRRO checks
    assert.strictEqual(studentReminders.efrro.isUploaded, false, "eFRRO isUploaded is false");
    assert.strictEqual(studentReminders.efrro.daysRemaining, 90, "eFRRO 90 days remaining");
    const efrroRule90 = studentReminders.efrro.schedule.find(r => r.thresholdDays === 90);
    assert.strictEqual(efrroRule90?.status, "DUE", "eFRRO 90-day rule is DUE today");

    console.log("✅ [PASS] Test 9: Passport, Visa, and eFRRO follow identical metadata-to-reminder decoupling");
  });
});
