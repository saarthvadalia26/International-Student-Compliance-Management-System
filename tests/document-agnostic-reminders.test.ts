import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  ExpiryReminderEngine, 
  STANDARD_REMINDER_RULES,
  RawNotificationRecord,
  CalendarDateEngine
} from "../src/domain/notifications/services/reminder-engine.service";

describe("ISCMS Document-Agnostic Reminder Engine Acceptance Tests", () => {
  const TODAY = "2026-08-15";

  it("1. Supports standard rules for all 3 canonical document types: Passport, Visa, and eFRRO", () => {
    assert.ok(Array.isArray(STANDARD_REMINDER_RULES.passport), "Passport must have standard rules array");
    assert.ok(Array.isArray(STANDARD_REMINDER_RULES.visa), "Visa must have standard rules array");
    assert.ok(Array.isArray(STANDARD_REMINDER_RULES.efrro), "eFRRO must have standard rules array");

    assert.ok(STANDARD_REMINDER_RULES.passport.length >= 4, "Passport must have at least 4 standard rules (90, 60, 30, 15)");
    assert.ok(STANDARD_REMINDER_RULES.visa.length >= 4, "Visa must have at least 4 standard rules (90, 60, 30, 15)");
    assert.ok(STANDARD_REMINDER_RULES.efrro.length >= 4, "eFRRO must have at least 4 standard rules (90, 60, 30, 15)");
  });

  it("2. Independently calculates reminders for Passport when expiry is 30 days away", () => {
    // Expiry date is 30 days from TODAY: 2026-09-14
    const expiryDate = "2026-09-14";
    const group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "P9876543",
      expiryDate,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.equal(group.documentType, "passport");
    assert.equal(group.daysRemaining, 30);
    assert.equal(group.isExpired, false);

    const rule30 = group.schedule.find(s => s.thresholdDays === 30);
    assert.ok(rule30, "30-day reminder rule must exist for Passport");
    assert.equal(rule30.status, "DUE", "30-day reminder rule must be DUE today");

    const rule60 = group.schedule.find(s => s.thresholdDays === 60);
    assert.ok(rule60);
    assert.equal(rule60.status, "DUE", "60-day reminder threshold has already passed so it is DUE/ready");

    const rule15 = group.schedule.find(s => s.thresholdDays === 15);
    assert.ok(rule15);
    assert.equal(rule15.status, "NOT_DUE", "15-day reminder is in the future (15 days away) and must be NOT_DUE");
  });

  it("3. Independently calculates reminders for Visa when expiry is 15 days away", () => {
    // Expiry date is 15 days from TODAY: 2026-08-30
    const expiryDate = "2026-08-30";
    const group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "visa",
      documentTitle: "Student Visa",
      documentNumber: "V1234567",
      expiryDate,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.equal(group.documentType, "visa");
    assert.equal(group.daysRemaining, 15);
    assert.equal(group.isExpired, false);

    const rule15 = group.schedule.find(s => s.thresholdDays === 15);
    assert.ok(rule15, "15-day rule must exist for Visa");
    assert.equal(rule15.status, "DUE");

    const rule7 = group.schedule.find(s => s.thresholdDays === 7);
    assert.ok(rule7);
    assert.equal(rule7.status, "NOT_DUE", "7-day reminder is in the future and must be NOT_DUE");
  });

  it("4. Independently calculates reminders for eFRRO when expiry is 90 days away", () => {
    // Expiry date is 90 days from TODAY: 2026-11-13
    const expiryDate = "2026-11-13";
    const group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "EF-998877",
      expiryDate,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.equal(group.documentType, "efrro");
    assert.equal(group.daysRemaining, 90);
    assert.equal(group.isExpired, false);

    const rule90 = group.schedule.find(s => s.thresholdDays === 90);
    assert.ok(rule90);
    assert.equal(rule90.status, "DUE", "90-day warning must be DUE when exactly 90 days left");

    const rule60 = group.schedule.find(s => s.thresholdDays === 60);
    assert.ok(rule60);
    assert.equal(rule60.status, "NOT_DUE", "60-day warning is not due yet");
  });

  it("5. Safely handles missing/NULL expiry date without fabricating dates or reminders", () => {
    const group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "P112233",
      expiryDate: null,
      isUploaded: false,
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.equal(group.expiryDate, null);
    assert.equal(group.expiryDateFormatted, "Not Recorded");
    assert.equal(group.daysRemaining, null);
    assert.equal(group.isExpired, false);

    // All rules should be NOT_APPLICABLE
    for (const item of group.schedule) {
      assert.equal(item.status, "NOT_APPLICABLE");
      assert.equal(item.scheduledDate, null);
      assert.ok(item.statusReason?.includes("expiry date has not been recorded"));
    }
  });

  it("6. Supports disabled rule isolation via custom rule configuration", () => {
    // When Passport custom rules have NO rules or only 15-day rule, 30-day is not evaluated
    const customPassportRules = [
      { id: "p-15", ruleName: "Passport 15-Day", thresholdDays: 15, channel: "both" as const }
    ];

    const group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "P112233",
      expiryDate: "2026-09-14", // 30 days away
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      customRules: customPassportRules,
      todayISO: TODAY
    });

    assert.equal(group.schedule.length, 1);
    assert.equal(group.schedule[0].thresholdDays, 15);
    assert.equal(group.schedule[0].status, "NOT_DUE", "Only the 15-day rule exists and it is NOT_DUE");
  });

  it("7. Recalculates schedule when new verified version (v1 -> v2) is approved", () => {
    // v1 was expiring 2026-08-20 (5 days away -> DUE)
    // v2 was renewed to 2030-01-01 (years away -> NOT_DUE)
    const v1Expiry = "2026-08-20";
    const v2Expiry = "2030-01-01";

    const v1Group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "P112233",
      expiryDate: v1Expiry,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    const v2Group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "P112233",
      expiryDate: v2Expiry,
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.equal(v1Group.daysRemaining, 5);
    assert.equal(v1Group.schedule.find(s => s.thresholdDays === 30)?.status, "DUE");

    assert.ok(v2Group.daysRemaining! > 1000);
    assert.equal(v2Group.schedule.find(s => s.thresholdDays === 30)?.status, "NOT_DUE", "Under v2, 30-day reminder is in 2029 and NOT_DUE");
  });

  it("8. Prevents duplicate reminders when matching notification already exists in history", () => {
    const existingNotifs: RawNotificationRecord[] = [
      {
        id: "notif-1",
        student_id: "student-123",
        document_type: "passport",
        status: "sent",
        channel: "both",
        scheduled_for: "2026-08-15T00:00:00Z",
        idempotency_key: "student-123:passport:30:both:2026-09-14",
        notification_context: { days_left: "30" },
        created_at: "2026-08-15T08:00:00Z",
        updated_at: "2026-08-15T08:05:00Z"
      }
    ];

    const group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "International Passport",
      documentNumber: "P112233",
      expiryDate: "2026-09-14", // 30 days away
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: existingNotifs,
      todayISO: TODAY
    });

    const rule30 = group.schedule.find(s => s.thresholdDays === 30);
    assert.ok(rule30);
    assert.equal(rule30.status, "DISPATCHED", "Already sent reminder must be marked DISPATCHED, preventing duplicate trigger");
    assert.equal(rule30.notificationId, "notif-1");
  });

  it("9. Evaluates aggregate student reminder response across all three document types simultaneously", () => {
    const response = ExpiryReminderEngine.calculateStudentReminders({
      studentId: "stu-001",
      passport: { number: "P001", expiryDate: "2026-09-14", isUploaded: true, verificationStatus: "verified" }, // 30 days
      visa: { number: "V001", expiryDate: "2026-08-30", isUploaded: true, verificationStatus: "verified" }, // 15 days
      efrro: { number: "EF001", expiryDate: "2026-11-13", isUploaded: true, verificationStatus: "verified" }, // 90 days
      notifications: [],
      todayISO: TODAY
    });

    assert.equal(response.studentId, "stu-001");
    assert.ok(response.passport, "Response must include passport group");
    assert.ok(response.visa, "Response must include visa group");
    assert.ok(response.efrro, "Response must include efrro group");

    assert.equal(response.passport.daysRemaining, 30);
    assert.equal(response.visa.daysRemaining, 15);
    assert.equal(response.efrro.daysRemaining, 90);

    assert.ok(response.summary.totalRules > 0);
    assert.ok(response.summary.byDocument.passport.totalRules > 0);
    assert.ok(response.summary.byDocument.visa.totalRules > 0);
    assert.ok(response.summary.byDocument.efrro.totalRules > 0);
  });

  it("10. Supports metadata-only expiry calculation without requiring uploaded physical files", () => {
    const group = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "visa",
      documentTitle: "Student Visa",
      documentNumber: "V-META-99",
      expiryDate: "2026-09-14",
      isUploaded: false, // Physical document not yet uploaded
      verificationStatus: "not_uploaded",
      existingNotifications: [],
      todayISO: TODAY
    });

    assert.equal(group.isUploaded, false);
    assert.equal(group.verificationStatus, "not_uploaded");
    assert.equal(group.daysRemaining, 30);
    assert.equal(group.schedule.find(s => s.thresholdDays === 30)?.status, "DUE", "Metadata-only expiry is correctly calculated and scheduled");
  });
});
