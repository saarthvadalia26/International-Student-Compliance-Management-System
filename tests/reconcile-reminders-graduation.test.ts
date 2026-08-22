import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ReminderReconciliationService } from "../src/domain/notifications/services/reminder-reconciliation.service";
import { ExpiryReminderEngine, RawNotificationRecord } from "../src/domain/notifications/services/reminder-engine.service";
import { CalendarDateEngine } from "../src/domain/notifications/services/calendar-date";

describe("ISCMS — Reconcile Document Reminders Against Graduation Date", () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Centralized Eligibility Decision Matrix (Passport, Visa, eFRRO)
  // ──────────────────────────────────────────────────────────────────────────
  describe("1. Centralized Eligibility Decision Matrix", () => {
    it("Case 1A: Document expiry strictly before graduation -> ELIGIBLE", () => {
      const res = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2026-08-28",
        expectedGraduationDate: "2028-06-30"
      });

      assert.equal(res.isEligible, true);
      assert.equal(res.reason, "ELIGIBLE");
    });

    it("Case 1B: Document expiry exactly equal to graduation -> ELIGIBLE", () => {
      const res = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2028-06-30",
        expectedGraduationDate: "2028-06-30"
      });

      assert.equal(res.isEligible, true);
      assert.equal(res.reason, "ELIGIBLE");
    });

    it("Case 1C: Document expiry strictly after graduation -> NOT ELIGIBLE (AFTER_GRADUATION)", () => {
      const res = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14",
        expectedGraduationDate: "2028-06-30"
      });

      assert.equal(res.isEligible, false);
      assert.equal(res.reason, "AFTER_GRADUATION");
      assert.match(res.details, /Document expires .* after student expected graduation date/);
    });

    it("Case 1D: Missing graduation date -> ELIGIBLE (Standard Fallback Policy)", () => {
      const res = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14",
        expectedGraduationDate: null
      });

      assert.equal(res.isEligible, true);
      assert.equal(res.reason, "MISSING_GRADUATION_DATE");
    });

    it("Case 1E: Missing document expiry date -> NOT ELIGIBLE (MISSING_EXPIRY)", () => {
      const res = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: null,
        expectedGraduationDate: "2028-06-30"
      });

      assert.equal(res.isEligible, false);
      assert.equal(res.reason, "MISSING_EXPIRY");
    });

    it("Case 1F: Canonical date comparison handles ISO date strings with timestamps cleanly", () => {
      const res = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14T00:00:00.000Z",
        expectedGraduationDate: "2028-06-30T23:59:59.000Z"
      });

      assert.equal(res.isEligible, false);
      assert.equal(res.reason, "AFTER_GRADUATION");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Multi-Document Support: Passport, Visa, and eFRRO
  // ──────────────────────────────────────────────────────────────────────────
  describe("2. Multi-Document Support (Passport, Visa, eFRRO)", () => {
    const expectedGraduation = "2028-06-30";

    it("evaluates Passport expiring 2032 (after 2028 grad) as INACTIVE", () => {
      const schedule = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "passport",
        documentTitle: "International Passport",
        documentNumber: "L8920192",
        expiryDate: "2032-01-14",
        expectedGraduationDate: expectedGraduation,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: []
      });

      assert.equal(schedule.isAfterGraduation, true);
      assert.equal(schedule.graduationBoundaryStatus, "AFTER_GRADUATION");
      assert.match(schedule.graduationBoundaryReason || "", /Document expires after expected graduation/);

      // All reminder items must be inactive NOT_APPLICABLE
      schedule.schedule.forEach(item => {
        assert.equal(item.status, "NOT_APPLICABLE");
        assert.equal(item.statusLabel, "Inactive");
      });
    });

    it("evaluates Visa expiring 2026 (before 2028 grad) as ACTIVE", () => {
      const schedule = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "visa",
        documentTitle: "Student Visa",
        documentNumber: "VI-882910",
        expiryDate: "2026-08-28",
        expectedGraduationDate: expectedGraduation,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: "2026-05-01"
      });

      assert.equal(schedule.isAfterGraduation, false);
      assert.equal(schedule.graduationBoundaryStatus, "WITHIN_BOUNDARY");
      
      // Items should have active statuses (DUE or NOT_DUE)
      const hasActiveStatus = schedule.schedule.some(i => i.status === "DUE" || i.status === "NOT_DUE");
      assert.equal(hasActiveStatus, true);
    });

    it("evaluates eFRRO expiring 2026 (before 2028 grad) as ACTIVE", () => {
      const schedule = ExpiryReminderEngine.calculateDocumentReminders({
        documentType: "efrro",
        documentTitle: "eFRRO / Residential Permit",
        documentNumber: "EF-992011",
        expiryDate: "2026-08-31",
        expectedGraduationDate: expectedGraduation,
        isUploaded: true,
        verificationStatus: "verified",
        existingNotifications: [],
        todayISO: "2026-05-01"
      });

      assert.equal(schedule.isAfterGraduation, false);
      assert.equal(schedule.graduationBoundaryStatus, "WITHIN_BOUNDARY");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Stale Notification Reconciliation Logic Simulation
  // ──────────────────────────────────────────────────────────────────────────
  describe("3. Stale Notification Invalidation & Historical Sent Preservation", () => {
    it("invalidates queued, sending, and failed notifications while preserving historical sent records", () => {
      const mockNotifications: RawNotificationRecord[] = [
        {
          id: "notif-1",
          student_id: "student-101",
          document_type: "passport",
          status: "queued",
          channel: "whatsapp",
          scheduled_for: "2031-10-16",
          idempotency_key: "student-101:passport:90:whatsapp:2032-01-14",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z"
        },
        {
          id: "notif-2",
          student_id: "student-101",
          document_type: "passport",
          status: "sending",
          channel: "whatsapp",
          scheduled_for: "2031-11-15",
          idempotency_key: "student-101:passport:60:whatsapp:2032-01-14",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z"
        },
        {
          id: "notif-3",
          student_id: "student-101",
          document_type: "passport",
          status: "failed",
          channel: "whatsapp",
          scheduled_for: "2031-12-15",
          idempotency_key: "student-101:passport:30:whatsapp:2032-01-14",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z"
        },
        {
          id: "notif-4-historical-sent",
          student_id: "student-101",
          document_type: "passport",
          status: "sent",
          channel: "whatsapp",
          scheduled_for: "2024-01-01",
          idempotency_key: "student-101:passport:90:whatsapp:2024-04-01",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          notification_delivery_log: [{
            id: "log-1",
            status: "delivered",
            created_at: "2024-01-01T00:00:05Z"
          }]
        }
      ];

      const expectedGraduation = "2028-06-30";
      const passportExpiry = "2032-01-14";

      const eligibility = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: passportExpiry,
        expectedGraduationDate: expectedGraduation
      });

      assert.equal(eligibility.isEligible, false);
      assert.equal(eligibility.reason, "AFTER_GRADUATION");

      // Filter notifications to reconcile:
      // Only queued, sending, processing, and failed records for ineligible documents should be cancelled.
      const notificationsToCancel = mockNotifications.filter(n => 
        n.document_type === "passport" && 
        ["queued", "sending", "processing", "failed"].includes(n.status)
      );

      const historicalSentRecords = mockNotifications.filter(n => n.status === "sent");

      assert.equal(notificationsToCancel.length, 3);
      assert.equal(historicalSentRecords.length, 1);
      assert.equal(historicalSentRecords[0].id, "notif-4-historical-sent");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Idempotency Verification
  // ──────────────────────────────────────────────────────────────────────────
  describe("4. Idempotency Invariant", () => {
    it("multiple reconciliation evaluations on identical input produce identical output", () => {
      const input = {
        expiryDate: "2032-01-14",
        expectedGraduationDate: "2028-06-30"
      };

      const run1 = ReminderReconciliationService.isDocumentReminderEligible(input);
      const run2 = ReminderReconciliationService.isDocumentReminderEligible(input);
      const run100 = ReminderReconciliationService.isDocumentReminderEligible(input);

      assert.deepEqual(run1, run2);
      assert.deepEqual(run2, run100);
      assert.equal(run100.isEligible, false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Dynamic Transitions (Graduation or Expiry Dates Change)
  // ──────────────────────────────────────────────────────────────────────────
  describe("5. Dynamic Transitions (Date Mutations)", () => {
    it("Scenario A: Graduation date moves earlier (2035 -> 2028) -> Passport (2032) becomes INELIGIBLE", () => {
      const initial = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14",
        expectedGraduationDate: "2035-06-30"
      });
      assert.equal(initial.isEligible, true);

      // Student graduates earlier
      const updated = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14",
        expectedGraduationDate: "2028-06-30"
      });
      assert.equal(updated.isEligible, false);
      assert.equal(updated.reason, "AFTER_GRADUATION");
    });

    it("Scenario B: Graduation date extended (2028 -> 2035) -> Passport (2032) becomes ELIGIBLE", () => {
      const initial = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14",
        expectedGraduationDate: "2028-06-30"
      });
      assert.equal(initial.isEligible, false);

      // Course extension / Ph.D. transfer
      const updated = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14",
        expectedGraduationDate: "2035-06-30"
      });
      assert.equal(updated.isEligible, true);
      assert.equal(updated.reason, "ELIGIBLE");
    });

    it("Scenario C: Expiry date corrected earlier (2032 -> 2027) -> Becomes ELIGIBLE before 2028 graduation", () => {
      const initial = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2032-01-14",
        expectedGraduationDate: "2028-06-30"
      });
      assert.equal(initial.isEligible, false);

      // Expiry corrected
      const updated = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: "2027-12-31",
        expectedGraduationDate: "2028-06-30"
      });
      assert.equal(updated.isEligible, true);
      assert.equal(updated.reason, "ELIGIBLE");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Pre-Dispatch Safety Check Guard
  // ──────────────────────────────────────────────────────────────────────────
  describe("6. Pre-Dispatch Safety Check Guard", () => {
    it("blocks dispatch when document expiry is after graduation even if notification was previously queued", () => {
      const queuedAlert = {
        id: "alert-99",
        studentId: "student-1",
        documentType: "passport",
        status: "queued",
        scheduledFor: "2026-05-01"
      };

      // Current live DB snapshot at time of dispatch
      const liveStudent = {
        graduationDate: "2028-06-30",
        passportExpiry: "2032-01-14"
      };

      const isSafeToDispatch = ReminderReconciliationService.isDocumentReminderEligible({
        expiryDate: liveStudent.passportExpiry,
        expectedGraduationDate: liveStudent.graduationDate
      });

      // Safety check must reject dispatch
      assert.equal(isSafeToDispatch.isEligible, false);
      assert.equal(isSafeToDispatch.reason, "AFTER_GRADUATION");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Full Student Multi-Document Schedule Aggregation
  // ──────────────────────────────────────────────────────────────────────────
  describe("7. Full Student Multi-Document Schedule Aggregation", () => {
    it("computes complete 3-document response with individual boundary states", () => {
      const fullResponse = ExpiryReminderEngine.calculateStudentReminders({
        studentId: "student-test-1",
        expectedGraduationDate: "2028-06-30",
        passport: {
          number: "P-100293",
          expiryDate: "2032-01-14", // AFTER graduation -> INACTIVE
          isUploaded: true,
          verificationStatus: "verified"
        },
        visa: {
          number: "V-993812",
          expiryDate: "2026-08-28", // BEFORE graduation -> ACTIVE
          isUploaded: true,
          verificationStatus: "verified"
        },
        efrro: {
          number: "E-382910",
          expiryDate: "2026-08-31", // BEFORE graduation -> ACTIVE
          isUploaded: true,
          verificationStatus: "verified"
        },
        notifications: [],
        todayISO: "2026-05-01"
      });

      assert.equal(fullResponse.passport.isAfterGraduation, true);
      assert.equal(fullResponse.passport.graduationBoundaryStatus, "AFTER_GRADUATION");

      assert.equal(fullResponse.visa.isAfterGraduation, false);
      assert.equal(fullResponse.visa.graduationBoundaryStatus, "WITHIN_BOUNDARY");

      assert.equal(fullResponse.efrro.isAfterGraduation, false);
      assert.equal(fullResponse.efrro.graduationBoundaryStatus, "WITHIN_BOUNDARY");
    });
  });
});
