import { 
  CalendarDateEngine, 
  ExpiryReminderEngine, 
  RawNotificationRecord 
} from "../src/domain/notifications/services/reminder-engine.service";

/**
 * ISCMS Expiry-Driven Reminder Engine Automated Test Suite (eFRRO Only Model)
 */
function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` - ${details}` : ""}`);
      failed++;
    }
  }

  console.log("\n=======================================================");
  console.log("  ISCMS EFRRO-ONLY REMINDER ENGINE TEST SUITE");
  console.log("=======================================================\n");

  // TEST 1: Date arithmetic accuracy (Prompt example: Expiry = 2026-12-30)
  console.log("--- Group 1: Calendar Date Arithmetic ---");
  const expiry = "2026-12-30";
  const r90 = CalendarDateEngine.subtractDays(expiry, 90);
  const r60 = CalendarDateEngine.subtractDays(expiry, 60);
  const r30 = CalendarDateEngine.subtractDays(expiry, 30);
  const r15 = CalendarDateEngine.subtractDays(expiry, 15);

  assert(r90 === "2026-10-01", "90-day calculation from 2026-12-30 = 2026-10-01", `Got: ${r90}`);
  assert(r60 === "2026-10-31", "60-day calculation from 2026-12-30 = 2026-10-31", `Got: ${r60}`);
  assert(r30 === "2026-11-30", "30-day calculation from 2026-12-30 = 2026-11-30", `Got: ${r30}`);
  assert(r15 === "2026-12-15", "15-day calculation from 2026-12-30 = 2026-12-15", `Got: ${r15}`);

  // TEST 2: No eFRRO expiry date (NULL / Empty)
  console.log("\n--- Group 2: No eFRRO Expiry Date Handling ---");
  const nullExpiryResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E-12345",
    expiryDate: null,
    isUploaded: false,
    verificationStatus: "not_uploaded",
    existingNotifications: [],
    todayISO: "2026-08-15"
  });

  assert(nullExpiryResult.daysRemaining === null, "Days remaining is null when no expiry");
  assert(nullExpiryResult.schedule.length === 5, "5 milestone rules created (90, 60, 30, 15, 7)");
  assert(nullExpiryResult.schedule.every(s => s.status === "NOT_APPLICABLE"), "All rules NOT_APPLICABLE when no expiry date");
  assert(nullExpiryResult.schedule[0].statusLabel === "Not Available", "Status label says 'Not Available'");

  // TEST 3: Expiry far in future (All Scheduled / NOT_DUE)
  console.log("\n--- Group 3: Future eFRRO Expiry (Scheduled) ---");
  const futureResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E-99999",
    expiryDate: "2027-08-26",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: "2026-08-15"
  });

  assert(futureResult.isExpired === false, "Document is not expired");
  assert(futureResult.daysRemaining === 376, "Calculated 376 days remaining", `Got: ${futureResult.daysRemaining}`);
  assert(futureResult.schedule.every(s => s.status === "NOT_DUE"), "All milestones NOT_DUE when far in future");
  assert(futureResult.schedule[0].scheduledDateISO === "2027-05-28", "90-day scheduled for 2027-05-28");
  assert(futureResult.schedule[0].statusLabel === "Scheduled", "Status label displays 'Scheduled'");

  // TEST 4: Exactly 30 days before expiry (30-day milestone reached)
  console.log("\n--- Group 4: Threshold Arrived (DUE) ---");
  const dueResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E-88888",
    expiryDate: "2027-08-26",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: "2027-07-27" // Exactly 30 days before 2027-08-26
  });

  const rule30 = dueResult.schedule.find(s => s.thresholdDays === 30);
  const rule15 = dueResult.schedule.find(s => s.thresholdDays === 15);
  assert(rule30?.status === "DUE", "30-day reminder is DUE on 2027-07-27", `Got: ${rule30?.status}`);
  assert(rule15?.status === "NOT_DUE", "15-day reminder is still NOT_DUE on 2027-07-27", `Got: ${rule15?.status}`);

  // TEST 5: Reminder already dispatched (DISPATCHED)
  console.log("\n--- Group 5: Dispatched Notification ---");
  const mockSentNotif: RawNotificationRecord = {
    id: "notif-1",
    student_id: "student-1",
    document_type: "efrro",
    status: "sent",
    channel: "both",
    scheduled_for: "2027-07-27T10:00:00Z",
    idempotency_key: "student-1:efrro:30:both:2027-08-26",
    notification_context: { days_left: 30 },
    created_at: "2027-07-27T10:00:00Z",
    updated_at: "2027-07-27T10:15:00Z"
  };

  const dispatchedResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E-88888",
    expiryDate: "2027-08-26",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [mockSentNotif],
    todayISO: "2027-07-28"
  });

  const dispatched30 = dispatchedResult.schedule.find(s => s.thresholdDays === 30);
  assert(dispatched30?.status === "DISPATCHED", "30-day reminder is marked DISPATCHED", `Got: ${dispatched30?.status}`);
  assert(dispatched30?.dispatchedAt !== undefined, "dispatchedAt timestamp recorded");

  // TEST 6: Delivery Failure (FAILED)
  console.log("\n--- Group 6: Delivery Failure ---");
  const mockFailedNotif: RawNotificationRecord = {
    id: "notif-2",
    student_id: "student-1",
    document_type: "efrro",
    status: "failed",
    channel: "whatsapp",
    scheduled_for: "2027-07-27T10:00:00Z",
    idempotency_key: "student-1:efrro:30:whatsapp:2027-08-26",
    notification_context: { days_left: 30 },
    created_at: "2027-07-27T10:00:00Z",
    updated_at: "2027-07-27T10:05:00Z",
    notification_delivery_log: [{
      id: "log-1",
      status: "failed",
      error_message: "WhatsApp Gateway connection timeout",
      created_at: "2027-07-27T10:05:00Z"
    }]
  };

  const failedResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E-88888",
    expiryDate: "2027-08-26",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [mockFailedNotif],
    todayISO: "2027-07-28"
  });

  const failed30 = failedResult.schedule.find(s => s.thresholdDays === 30);
  assert(failed30?.status === "FAILED", "30-day reminder is marked FAILED", `Got: ${failed30?.status}`);
  assert(failed30?.failureReason === "WhatsApp Gateway connection timeout", "failureReason matches gateway log");

  // TEST 7: Expired eFRRO Document (EXPIRED)
  console.log("\n--- Group 7: Expired eFRRO Document ---");
  const expiredResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "E-11111",
    expiryDate: "2025-01-01",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: "2026-08-15"
  });

  assert(expiredResult.isExpired === true, "Document marked isExpired = true");
  assert(expiredResult.daysRemaining !== null && expiredResult.daysRemaining < 0, "Days remaining is negative");
  assert(expiredResult.schedule[0].status === "EXPIRED", "Status reflects EXPIRED");
  assert(expiredResult.schedule[0].statusLabel === "Expired", "Status label displays 'Expired'");

  // TEST 8: Student eFRRO Single Subject Reminders
  console.log("\n--- Group 8: Single Subject eFRRO Student Reminders ---");
  const studentSchedule = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "student-123",
    efrro: {
      number: "EFRRO-882200",
      expiryDate: "2026-12-30",
      isUploaded: true,
      verificationStatus: "verified"
    },
    notifications: [],
    todayISO: "2026-08-15"
  });

  assert(studentSchedule.efrro !== undefined, "eFRRO reminder group is returned directly");
  assert(studentSchedule.efrro.schedule.length === 5, "5 milestone rules configured (90, 60, 30, 15, 7)");
  assert(studentSchedule.efrro.schedule[0].ruleName === "90-Day Early Warning", "Milestone 1 is 90-Day Early Warning");
  assert(studentSchedule.efrro.schedule[1].ruleName === "60-Day Administrative Reminder", "Milestone 2 is 60-Day Administrative Reminder");
  assert(studentSchedule.efrro.schedule[2].ruleName === "30-Day Urgent Renewal", "Milestone 3 is 30-Day Urgent Renewal");
  assert(studentSchedule.efrro.schedule[3].ruleName === "15-Day Critical Alert", "Milestone 4 is 15-Day Critical Alert");
  assert(studentSchedule.efrro.schedule[4].ruleName === "7-Day Final Warning", "Milestone 5 is 7-Day Final Warning");
  assert(studentSchedule.summary.totalRules === 15, "Summary total rules across all 3 docs is 15");

  // TEST 9: Empty eFRRO
  console.log("\n--- Group 9: Missing eFRRO Expiry ---");
  const emptyStudentSchedule = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "student-empty",
    efrro: null,
    notifications: [],
    todayISO: "2026-08-15"
  });

  assert(emptyStudentSchedule.efrro.expiryDate === null, "eFRRO expiry date is null");
  assert(emptyStudentSchedule.efrro.schedule.every(s => s.status === "NOT_APPLICABLE"), "All milestones NOT_APPLICABLE");

  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
