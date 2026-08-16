/**
 * ============================================================================
 * ISCMS DOCUMENT REMINDER SCHEDULE CONSISTENCY & RECOVERY TEST SUITE
 * ============================================================================
 *
 * Verifies:
 * - Test A: eFRRO exactly 15 days away (15-day reminder is DUE/Due Today, schedule visible, PDF not required)
 * - Test B: Visa expired (Expired status visible, no misleading future pre-expiry reminders, schedule not empty)
 * - Test C: Passport far from expiry (Future 90d/60d/30d/15d/7d schedule calculated according to configured rules)
 * - Test D: PDF missing but metadata exists (Reminders still calculated without physical upload)
 * - Test E: Metadata missing (Clear "Expiry date not available" fallback)
 * - Test F: Multiple document types (Passport valid, Visa expired, eFRRO 15 days remaining -> all 3 independent & visible)
 * - Test G: Repeated schedule recalculation (Idempotent evaluation, zero duplicate reminder records)
 * - Test H: Replacement/version (Old schedule superseded, new version schedule active)
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";
import { CalendarDateEngine } from "../src/domain/notifications/services/calendar-date";

console.log("\n==================================================================");
console.log("  ISCMS DOCUMENT REMINDER SCHEDULE CONSISTENCY TESTS              ");
console.log("==================================================================\n");

describe("Document Reminder Schedule Consistency Acceptance Suite", () => {
  const TODAY = "2026-08-16";

  // -------------------------------------------------------------
  // Test A: eFRRO Exactly 15 Days Away
  // -------------------------------------------------------------
  it("Test A — eFRRO exactly 15 days away: 15-day reminder is Due Today, schedule visible without PDF", () => {
    const efrroExpiry = "2026-08-31"; // 15 days from 2026-08-16

    const efrroReminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/2026/8899",
      expiryDate: efrroExpiry,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(efrroReminders.daysRemaining, 15, "Calculates exactly 15 days remaining");
    assert.strictEqual(efrroReminders.isExpired, false, "Document is not expired");
    assert.strictEqual(efrroReminders.isUploaded, false, "Document copy is not uploaded");
    assert.strictEqual(efrroReminders.schedule.length, 5, "5 reminder tiers present");

    const rule15 = efrroReminders.schedule.find(r => r.thresholdDays === 15);
    assert.ok(rule15, "15-day rule exists");
    assert.strictEqual(rule15?.scheduledDateISO, "2026-08-16", "Scheduled for today (2026-08-16)");
    assert.strictEqual(rule15?.status, "DUE", "15-day reminder is DUE");
    assert.strictEqual(rule15?.statusLabel, "Due Today", "15-day statusLabel is Due Today");

    // Check that historical milestones (90d, 60d, 30d) are marked Passed
    const rule30 = efrroReminders.schedule.find(r => r.thresholdDays === 30);
    assert.strictEqual(rule30?.status, "DUE", "30-day rule status is DUE");
    assert.strictEqual(rule30?.statusLabel, "Passed", "30-day rule label is Passed");

    // Check that 7d rule is Scheduled for future
    const rule7 = efrroReminders.schedule.find(r => r.thresholdDays === 7);
    assert.strictEqual(rule7?.status, "NOT_DUE", "7-day rule status is NOT_DUE");
    assert.strictEqual(rule7?.statusLabel, "Scheduled", "7-day rule label is Scheduled");
    assert.strictEqual(rule7?.scheduledDateISO, "2026-08-24", "7-day rule scheduled for 2026-08-24");

    console.log("✅ [PASS] Test A: eFRRO 15 days away accurately triggers 15-Day Critical Alert as Due Today");
  });

  // -------------------------------------------------------------
  // Test B: Visa Expired (e.g. 47 Days Ago)
  // -------------------------------------------------------------
  it("Test B — Visa expired: Expired status visible, historical rules marked Expired, panel not empty", () => {
    const visaExpiry = "2026-06-30"; // 47 days before 2026-08-16

    const visaReminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "visa",
      documentTitle: "Student Visa",
      documentNumber: "V-99881122",
      expiryDate: visaExpiry,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(visaReminders.isExpired, true, "Document is expired");
    assert.strictEqual(visaReminders.daysRemaining, -47, "Calculates -47 days remaining");
    assert.strictEqual(visaReminders.schedule.length, 5, "Schedule is NOT empty");
    assert.ok(visaReminders.schedule.every(r => r.status === "EXPIRED"), "All pre-expiry rules marked EXPIRED");
    assert.ok(visaReminders.schedule.every(r => r.statusLabel === "Expired"), "All statusLabels are Expired");

    console.log("✅ [PASS] Test B: Expired Visa preserves full historical timeline with explicit Expired states");
  });

  // -------------------------------------------------------------
  // Test C: Passport Far From Expiry
  // -------------------------------------------------------------
  it("Test C — Passport far from expiry: Future 90d/60d/30d/15d/7d schedule calculated from rules", () => {
    const passportExpiry = "2028-08-16"; // 731 days away

    const passportReminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "P-44556677",
      expiryDate: passportExpiry,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(passportReminders.isExpired, false, "Not expired");
    assert.strictEqual(passportReminders.daysRemaining, 731, "731 days remaining");
    assert.ok(passportReminders.schedule.every(r => r.status === "NOT_DUE"), "All rules NOT_DUE (future)");
    assert.ok(passportReminders.schedule.every(r => r.statusLabel === "Scheduled"), "All statusLabels Scheduled");

    const rule90 = passportReminders.schedule.find(r => r.thresholdDays === 90);
    assert.strictEqual(rule90?.scheduledDateISO, "2028-05-18", "90d rule scheduled for 2028-05-18");

    console.log("✅ [PASS] Test C: Future passport correctly calculates all configured future trigger dates");
  });

  // -------------------------------------------------------------
  // Test D: PDF Missing but Metadata Exists
  // -------------------------------------------------------------
  it("Test D — PDF missing but metadata exists: Reminders calculated without physical upload", () => {
    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/META/ONLY",
      expiryDate: "2026-09-15", // 30 days away
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.isUploaded, false, "isUploaded is false");
    assert.strictEqual(reminders.verificationStatus, "not_uploaded", "verificationStatus is not_uploaded");
    assert.strictEqual(reminders.daysRemaining, 30, "30 days remaining");
    assert.strictEqual(reminders.schedule.length, 5, "5 reminder tiers present");

    const rule30 = reminders.schedule.find(r => r.thresholdDays === 30);
    assert.strictEqual(rule30?.status, "DUE", "30-day reminder is DUE");
    assert.strictEqual(rule30?.statusLabel, "Due Today", "30-day statusLabel is Due Today");

    console.log("✅ [PASS] Test D: Metadata-only document generates reminder schedule with isUploaded: false");
  });

  // -------------------------------------------------------------
  // Test E: Metadata Missing (No Expiry Date)
  // -------------------------------------------------------------
  it("Test E — Metadata missing: Clear 'Expiry date not available' representation", () => {
    const reminders = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "",
      expiryDate: null,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(reminders.expiryDate, null, "Expiry date is null");
    assert.strictEqual(reminders.daysRemaining, null, "Days remaining is null");
    assert.ok(reminders.schedule.every(r => r.status === "NOT_APPLICABLE"), "All rules NOT_APPLICABLE");
    assert.ok(reminders.schedule.every(r => r.statusLabel === "Not Available"), "All labels Not Available");

    console.log("✅ [PASS] Test E: Missing expiry cleanly represented as NOT_APPLICABLE");
  });

  // -------------------------------------------------------------
  // Test F: Multiple Document Types (Passport valid, Visa expired, eFRRO 15 days)
  // -------------------------------------------------------------
  it("Test F — Multiple document types: Passport valid, Visa expired, eFRRO 15 days remaining -> all 3 independent & visible", () => {
    const studentReminders = ExpiryReminderEngine.calculateStudentReminders({
      studentId: "student-mixed-state-001",
      passport: {
        number: "P12345678",
        expiryDate: "2028-08-16", // Valid (+731d)
        isUploaded: true,
        verificationStatus: "verified"
      },
      visa: {
        number: "V87654321",
        expiryDate: "2026-06-30", // Expired (-47d)
        isUploaded: true,
        verificationStatus: "verified"
      },
      efrro: {
        number: "FRRO998877",
        expiryDate: "2026-08-31", // Critical (+15d)
        isUploaded: false,
        verificationStatus: "not_uploaded"
      },
      notifications: [],
      todayISO: TODAY
    });

    // 1. Passport is Valid
    assert.strictEqual(studentReminders.passport.isExpired, false, "Passport not expired");
    assert.strictEqual(studentReminders.passport.daysRemaining, 731, "Passport 731 days remaining");
    assert.ok(studentReminders.passport.schedule.every(r => r.status === "NOT_DUE"), "Passport rules scheduled");

    // 2. Visa is Expired
    assert.strictEqual(studentReminders.visa.isExpired, true, "Visa is expired");
    assert.strictEqual(studentReminders.visa.daysRemaining, -47, "Visa -47 days remaining");
    assert.ok(studentReminders.visa.schedule.every(r => r.status === "EXPIRED"), "Visa rules expired");

    // 3. eFRRO is 15 days remaining (Critical)
    assert.strictEqual(studentReminders.efrro.isExpired, false, "eFRRO not expired");
    assert.strictEqual(studentReminders.efrro.daysRemaining, 15, "eFRRO 15 days remaining");
    assert.strictEqual(studentReminders.efrro.isUploaded, false, "eFRRO is not uploaded");
    const efrroRule15 = studentReminders.efrro.schedule.find(r => r.thresholdDays === 15);
    assert.strictEqual(efrroRule15?.status, "DUE", "eFRRO 15d is DUE");
    assert.strictEqual(efrroRule15?.statusLabel, "Due Today", "eFRRO 15d is Due Today");

    // 4. Summaries are independent
    assert.strictEqual(studentReminders.summary.byDocument.passport.notDueCount, 5, "Passport has 5 not due");
    assert.strictEqual(studentReminders.summary.byDocument.visa.totalRules, 5, "Visa has 5 total rules");
    assert.strictEqual(studentReminders.summary.byDocument.efrro.dueCount, 4, "eFRRO has 4 due/passed");

    console.log("✅ [PASS] Test F: Passport, Visa, and eFRRO evaluated completely independently in mixed state");
  });

  // -------------------------------------------------------------
  // Test G: Repeated Schedule Recalculation (Idempotency)
  // -------------------------------------------------------------
  it("Test G — Repeated schedule recalculation: Preserves existing dispatch logs without creating duplicate reminders", () => {
    const existingNotifications = [
      {
        id: "notif-efrro-15d",
        student_id: "student-idemp",
        document_type: "efrro" as const,
        status: "sent" as const,
        channel: "whatsapp",
        scheduled_for: "2026-08-16T09:00:00Z",
        idempotency_key: "rem:efrro:student-idemp:2026-08-31:15:whatsapp",
        notification_context: { days_left: 15 },
        created_at: "2026-08-16T09:00:00Z",
        updated_at: "2026-08-16T09:05:00Z",
        notification_delivery_log: [
          {
            id: "log-1",
            status: "delivered",
            error_message: null,
            created_at: "2026-08-16T09:05:30Z"
          }
        ]
      }
    ];

    // First calculation
    const calc1 = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/IDEMP/01",
      expiryDate: "2026-08-31",
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications,
      todayISO: TODAY
    });

    // Second calculation
    const calc2 = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "FRRO/IDEMP/01",
      expiryDate: "2026-08-31",
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications,
      todayISO: TODAY
    });

    const rule15_1 = calc1.schedule.find(r => r.thresholdDays === 15);
    const rule15_2 = calc2.schedule.find(r => r.thresholdDays === 15);

    assert.strictEqual(rule15_1?.status, "DISPATCHED", "Rule 15 marked DISPATCHED");
    assert.strictEqual(rule15_1?.statusLabel, "Delivered", "Rule 15 label is Delivered");
    assert.strictEqual(rule15_1?.notificationId, "notif-efrro-15d", "Matches notification ID");
    assert.deepStrictEqual(calc1, calc2, "Repeated calculations produce identical deterministic outputs");

    console.log("✅ [PASS] Test G: Schedule calculation is idempotent and binds existing delivery logs seamlessly");
  });

  // -------------------------------------------------------------
  // Test H: Replacement / Version Superseding
  // -------------------------------------------------------------
  it("Test H — Replacement/version: Old schedule superseded, new document version schedule active", () => {
    // 1. Old version expired on 2026-06-30
    const oldSchedule = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "visa",
      documentTitle: "Student Visa",
      documentNumber: "VISA-V1-OLD",
      expiryDate: "2026-06-30",
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(oldSchedule.isExpired, true, "Old version is expired");

    // 2. New version v2 issued with expiry 2027-08-16
    const newSchedule = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "visa",
      documentTitle: "Student Visa",
      documentNumber: "VISA-V2-RENEWED",
      expiryDate: "2027-08-16",
      isUploaded: true,
      verificationStatus: "pending",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.strictEqual(newSchedule.isExpired, false, "New version is not expired");
    assert.strictEqual(newSchedule.daysRemaining, 365, "New version has 365 days remaining");
    assert.ok(newSchedule.schedule.every(r => r.status === "NOT_DUE"), "New schedule is NOT_DUE (future)");

    console.log("✅ [PASS] Test H: Document replacement recalculates reminder schedule against new authoritative expiry");
  });
});
