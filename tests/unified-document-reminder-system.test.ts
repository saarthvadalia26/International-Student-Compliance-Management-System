import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  ExpiryReminderEngine, 
  STANDARD_REMINDER_RULES,
  RawNotificationRecord,
  CalendarDateEngine
} from "../src/domain/notifications/services/reminder-engine.service";

describe("Unified Document Reminder System Acceptance & Edge Case Test Suite", () => {
  // Base test date: 2026-08-16
  const CURRENT_DATE = "2026-08-16";

  // =========================================================================
  // PART 12: SPECIFIC REPRODUCTION OF THE 31 AUG 2026 BUG
  // =========================================================================
  describe("PART 12 — 31 Aug 2026 eFRRO Expiry Bug Reproduction & Resolution", () => {
    it("Calculates correct schedule for eFRRO with expiry 31 Aug 2026 when current date is 16 Aug 2026", () => {
      const efrroExpiry = "2026-08-31";
      const schedule = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "efrro",
        documentTitle: "eFRRO / Residential Permit",
        documentNumber: "EF-2026-AUG31",
        expiryDate: efrroExpiry,
        isUploaded: false, // Metadata-only record (no physical PDF uploaded yet)
        verificationStatus: "not_uploaded",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });

      // 1. Expiry must be detected and not null
      assert.equal(schedule.expiryDate, "2026-08-31");
      assert.ok(schedule.expiryDateFormatted.includes("2026"));

      // 2. Days remaining must be 15 days (2026-08-31 - 2026-08-16)
      assert.equal(schedule.daysRemaining, 15);
      assert.equal(schedule.isExpired, false);

      // 3. 30-Day Reminder (scheduled for 2026-08-01): Passed 15 days ago -> Passed
      const rule30 = schedule.schedule.find(s => s.thresholdDays === 30);
      assert.ok(rule30, "30-Day reminder must exist");
      assert.equal(rule30.status, "DUE");
      assert.equal(rule30.statusLabel, "Passed", "Late entry: 30-day threshold passed so it is Passed");
      assert.equal(rule30.scheduledDateISO, "2026-08-01");

      // 4. 15-Day Reminder (scheduled for 2026-08-16): Reached today -> Due Today
      const rule15 = schedule.schedule.find(s => s.thresholdDays === 15);
      assert.ok(rule15, "15-Day reminder must exist");
      assert.equal(rule15.status, "DUE");
      assert.equal(rule15.statusLabel, "Due Today", "15-day threshold is today so it is Due Today");
      assert.equal(rule15.scheduledDateISO, "2026-08-16");

      // 5. 7-Day Reminder (scheduled for 2026-08-24): In future -> Scheduled (NOT_DUE)
      const rule7 = schedule.schedule.find(s => s.thresholdDays === 7);
      assert.ok(rule7, "7-Day reminder must exist");
      assert.equal(rule7.status, "NOT_DUE");
      assert.equal(rule7.statusLabel, "Scheduled");
      assert.equal(rule7.scheduledDateISO, "2026-08-24");

      // 6. 90-Day & 60-Day reminders: Passed because student entered late inside 15-day window
      const rule90 = schedule.schedule.find(s => s.thresholdDays === 90);
      const rule60 = schedule.schedule.find(s => s.thresholdDays === 60);
      assert.equal(rule90?.status, "DUE");
      assert.equal(rule90?.statusLabel, "Passed");
      assert.equal(rule60?.status, "DUE");
      assert.equal(rule60?.statusLabel, "Passed");
    });
  });

  // =========================================================================
  // PART 1 & 2: UNIFIED 3-DOCUMENT MODEL (PASSPORT, VISA, EFRRO)
  // =========================================================================
  describe("Unified Multi-Document Architecture", () => {
    it("Evaluates Passport, Visa, and eFRRO with identical reminder milestone engines", () => {
      const response = ExpiryReminderEngine.calculateStudentReminders({
        studentId: "student-unified-001",
        passport: { number: "P10001", expiryDate: "2026-11-20", isUploaded: true, verificationStatus: "verified" },
        visa: { number: "V20002", expiryDate: "2026-09-15", isUploaded: true, verificationStatus: "verified" },
        efrro: { number: "EF30003", expiryDate: "2026-08-31", isUploaded: false, verificationStatus: "not_uploaded" },
        notifications: [],
        todayISO: CURRENT_DATE
      });

      assert.equal(response.studentId, "student-unified-001");
      assert.equal(response.passport.documentType, "passport");
      assert.equal(response.visa.documentType, "visa");
      assert.equal(response.efrro.documentType, "efrro");

      // Passport: ~96 days left -> all NOT_DUE
      assert.ok(response.passport.daysRemaining! > 90);
      assert.equal(response.passport.schedule.find(s => s.thresholdDays === 90)?.status, "NOT_DUE");

      // Visa: 30 days left (2026-09-15 - 2026-08-16) -> 30-day is DUE
      assert.equal(response.visa.daysRemaining, 30);
      assert.equal(response.visa.schedule.find(s => s.thresholdDays === 30)?.status, "DUE");

      // eFRRO: 15 days left (2026-08-31 - 2026-08-16) -> 15-day is DUE
      assert.equal(response.efrro.daysRemaining, 15);
      assert.equal(response.efrro.schedule.find(s => s.thresholdDays === 15)?.status, "DUE");
    });
  });

  // =========================================================================
  // PART 11: EDGE CASES A THROUGH Q
  // =========================================================================
  describe("PART 11 — Comprehensive Edge Cases", () => {
    // Edge Case A: Expiry > 90 days away
    it("Edge Case A: Expiry > 90 days away (All milestones NOT_DUE / Scheduled)", () => {
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "P-100",
        expiryDate: "2026-12-31", // 137 days away
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 137);
      assert.ok(res.schedule.every(s => s.status === "NOT_DUE"));
    });

    // Edge Case B: Expiry exactly 90 days away
    it("Edge Case B: Expiry exactly 90 days away (90-day milestone is DUE today)", () => {
      const expiry = CalendarDateEngine.addDays(CURRENT_DATE, 90);
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "P-100",
        expiryDate: expiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 90);
      const rule90 = res.schedule.find(s => s.thresholdDays === 90);
      const rule60 = res.schedule.find(s => s.thresholdDays === 60);
      assert.equal(rule90?.status, "DUE");
      assert.equal(rule90?.statusLabel, "Due Today");
      assert.equal(rule60?.status, "NOT_DUE");
    });

    // Edge Case C: Expiry between 90 and 60 days (e.g. 75 days)
    it("Edge Case C: Expiry between 90 and 60 days (90-day is Due Now, 60-day is NOT_DUE)", () => {
      const expiry = CalendarDateEngine.addDays(CURRENT_DATE, 75);
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "visa",
        documentTitle: "Student Visa",
        documentNumber: "V-75",
        expiryDate: expiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 75);
      assert.equal(res.schedule.find(s => s.thresholdDays === 90)?.status, "DUE");
      assert.equal(res.schedule.find(s => s.thresholdDays === 90)?.statusLabel, "Due Now");
      assert.equal(res.schedule.find(s => s.thresholdDays === 60)?.status, "NOT_DUE");
    });

    // Edge Case D: Expiry between 60 and 30 days (e.g. 45 days)
    it("Edge Case D: Expiry between 60 and 30 days (60-day is Due Now, 30-day is NOT_DUE)", () => {
      const expiry = CalendarDateEngine.addDays(CURRENT_DATE, 45);
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "efrro",
        documentTitle: "eFRRO / Residential Permit",
        documentNumber: "E-45",
        expiryDate: expiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 45);
      assert.equal(res.schedule.find(s => s.thresholdDays === 60)?.status, "DUE");
      assert.equal(res.schedule.find(s => s.thresholdDays === 30)?.status, "NOT_DUE");
    });

    // Edge Case E: Expiry between 30 and 15 days (e.g. 20 days)
    it("Edge Case E: Expiry between 30 and 15 days (30-day is Due Now, 15-day is NOT_DUE)", () => {
      const expiry = CalendarDateEngine.addDays(CURRENT_DATE, 20);
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "efrro",
        documentTitle: "eFRRO / Residential Permit",
        documentNumber: "E-20",
        expiryDate: expiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 20);
      assert.equal(res.schedule.find(s => s.thresholdDays === 30)?.status, "DUE");
      assert.equal(res.schedule.find(s => s.thresholdDays === 15)?.status, "NOT_DUE");
    });

    // Edge Case F: Expiry exactly 15 days away
    it("Edge Case F: Expiry exactly 15 days away (15-day milestone is DUE today)", () => {
      const expiry = CalendarDateEngine.addDays(CURRENT_DATE, 15);
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "P-15",
        expiryDate: expiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 15);
      const rule15 = res.schedule.find(s => s.thresholdDays === 15);
      assert.equal(rule15?.status, "DUE");
      assert.equal(rule15?.statusLabel, "Due Today");
      assert.equal(res.schedule.find(s => s.thresholdDays === 7)?.status, "NOT_DUE");
    });

    // Edge Case G: Expiry less than 15 days away (e.g. 10 days away)
    it("Edge Case G: Expiry less than 15 days away (15-day is Due Now, 7-day is NOT_DUE)", () => {
      const expiry = CalendarDateEngine.addDays(CURRENT_DATE, 10);
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "visa",
        documentTitle: "Student Visa",
        documentNumber: "V-10",
        expiryDate: expiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 10);
      assert.equal(res.schedule.find(s => s.thresholdDays === 15)?.status, "DUE");
      assert.equal(res.schedule.find(s => s.thresholdDays === 7)?.status, "NOT_DUE");
    });

    // Edge Case H: Expiry today (0 days left)
    it("Edge Case H: Expiry today (0 days left -> all threshold rules DUE / Due Now)", () => {
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "P-0",
        expiryDate: CURRENT_DATE,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.daysRemaining, 0);
      assert.equal(res.isExpired, false);
      assert.ok(res.schedule.every(s => s.status === "DUE"));
    });

    // Edge Case I: Expired document (-10 days)
    it("Edge Case I: Expired document (All rules marked EXPIRED)", () => {
      const expiry = CalendarDateEngine.subtractDays(CURRENT_DATE, 10);
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "efrro",
        documentTitle: "eFRRO / Residential Permit",
        documentNumber: "E-EXP",
        expiryDate: expiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.isExpired, true);
      assert.equal(res.daysRemaining, -10);
      assert.ok(res.schedule.every(s => s.status === "EXPIRED"));
      assert.equal(res.schedule[0].statusLabel, "Expired");
    });

    // Edge Case J: No expiry date (Null/Empty)
    it("Edge Case J: No expiry date (Never crashes, all rules NOT_APPLICABLE)", () => {
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "visa",
        documentTitle: "Student Visa",
        documentNumber: "V-NO-EXP",
        expiryDate: null,
        isUploaded: false,
        verificationStatus: "not_uploaded",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.expiryDate, null);
      assert.equal(res.daysRemaining, null);
      assert.ok(res.schedule.every(s => s.status === "NOT_APPLICABLE"));
      assert.equal(res.schedule[0].statusLabel, "Not Available");
    });

    // Edge Case K: Metadata-only document with expiry (No physical file uploaded)
    it("Edge Case K: Metadata-only document with expiry generates valid schedule", () => {
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "P-META-1234",
        expiryDate: "2026-09-15", // 30 days away
        isUploaded: false,
        verificationStatus: "not_uploaded",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.expiryDate, "2026-09-15");
      assert.equal(res.isUploaded, false);
      assert.equal(res.daysRemaining, 30);
      assert.equal(res.schedule.find(s => s.thresholdDays === 30)?.status, "DUE");
    });

    // Edge Case L: Document uploaded but not verified (Pending verification)
    it("Edge Case L: Document uploaded with pending verification calculates reminders accurately", () => {
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "efrro",
        documentTitle: "eFRRO / Residential Permit",
        documentNumber: "EF-PENDING",
        expiryDate: "2026-09-15",
        isUploaded: true,
        verificationStatus: "pending",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.verificationStatus, "pending");
      assert.equal(res.daysRemaining, 30);
      assert.equal(res.schedule.find(s => s.thresholdDays === 30)?.status, "DUE");
    });

    // Edge Case M: Rejected document version
    it("Edge Case M: Rejected document version is represented accurately without corrupting schedule", () => {
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "visa",
        documentTitle: "Student Visa",
        documentNumber: "V-REJECTED",
        expiryDate: "2026-09-15",
        isUploaded: true,
        verificationStatus: "rejected",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });
      assert.equal(res.verificationStatus, "rejected");
      assert.equal(res.daysRemaining, 30);
    });

    // Edge Case N & O: Superseded document vs New replacement version
    it("Edge Case N & O: Superseded old expiry is replaced by active new version expiry", () => {
      const oldVersionExpiry = "2026-08-20"; // Expiring in 4 days
      const newVersionExpiry = "2030-05-15"; // Expiring in ~4 years

      const oldSchedule = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "P-OLD",
        expiryDate: oldVersionExpiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });

      const newSchedule = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "P-NEW-RENEWED",
        expiryDate: newVersionExpiry,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });

      assert.equal(oldSchedule.daysRemaining, 4);
      assert.equal(oldSchedule.schedule.find(s => s.thresholdDays === 15)?.status, "DUE");

      assert.ok(newSchedule.daysRemaining! > 1000);
      assert.equal(newSchedule.schedule.find(s => s.thresholdDays === 15)?.status, "NOT_DUE");
    });

    // Edge Case P: Student entered late into ISCMS (Milestones marked Due Now)
    it("Edge Case P: Late-entered student gets Due Now status on already-passed milestone thresholds", () => {
      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "visa",
        documentTitle: "Student Visa",
        documentNumber: "V-LATE",
        expiryDate: "2026-08-31", // 15 days away
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: CURRENT_DATE
      });

      const rule60 = res.schedule.find(s => s.thresholdDays === 60);
      const rule30 = res.schedule.find(s => s.thresholdDays === 30);
      const rule15 = res.schedule.find(s => s.thresholdDays === 15);

      assert.equal(rule60?.status, "DUE");
      assert.equal(rule60?.statusLabel, "Passed");
      assert.equal(rule30?.status, "DUE");
      assert.equal(rule30?.statusLabel, "Passed");
      assert.equal(rule15?.status, "DUE");
      assert.equal(rule15?.statusLabel, "Due Today");
    });

    // Edge Case Q: Reminder scheduler running repeatedly (Idempotency and duplicate prevention)
    it("Edge Case Q: Reminder scheduler marks existing dispatched notifications as DISPATCHED / Delivered", () => {
      const mockHistory: RawNotificationRecord[] = [
        {
          id: "notif-dispatched-1",
          student_id: "stu-repeat",
          document_type: "efrro",
          status: "sent",
          channel: "whatsapp",
          scheduled_for: "2026-08-01T10:00:00Z",
          idempotency_key: "stu-repeat:efrro:30:whatsapp:2026-08-31",
          notification_context: { days_left: 30 },
          created_at: "2026-08-01T10:00:00Z",
          updated_at: "2026-08-01T10:01:00Z",
          notification_delivery_log: [{
            id: "log-del-1",
            status: "delivered",
            created_at: "2026-08-01T10:01:05Z"
          }]
        }
      ];

      const res = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "efrro",
        documentTitle: "eFRRO / Residential Permit",
        documentNumber: "EF-REPEAT",
        expiryDate: "2026-08-31",
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: mockHistory,
        todayISO: CURRENT_DATE
      });

      const rule30 = res.schedule.find(s => s.thresholdDays === 30);
      assert.equal(rule30?.status, "DISPATCHED");
      assert.equal(rule30?.statusLabel, "Delivered");
      assert.equal(rule30?.deliveredAt, "2026-08-01T10:01:05Z");
      assert.equal(rule30?.notificationId, "notif-dispatched-1");

      // 15-day reminder has no existing notification -> remains DUE
      const rule15 = res.schedule.find(s => s.thresholdDays === 15);
      assert.equal(rule15?.status, "DUE");
    });
  });
});
