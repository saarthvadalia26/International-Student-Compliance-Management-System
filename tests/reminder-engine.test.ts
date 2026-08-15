import { 
  CalendarDateEngine, 
  ExpiryReminderEngine, 
  RawNotificationRecord 
} from "../src/domain/notifications/services/reminder-engine.service";

/**
 * ISCMS Expiry-Driven Reminder Engine Automated Test Suite
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
  console.log("  ISCMS EXPIRY-DRIVEN REMINDER ENGINE TEST SUITE");
  console.log("=======================================================\n");

  // TEST 1: Date arithmetic accuracy (Prompt example: Expiry = 2027-08-26)
  console.log("--- Group 1: Calendar Date Arithmetic ---");
  const expiry = "2027-08-26";
  const r90 = CalendarDateEngine.subtractDays(expiry, 90);
  const r60 = CalendarDateEngine.subtractDays(expiry, 60);
  const r30 = CalendarDateEngine.subtractDays(expiry, 30);
  const r15 = CalendarDateEngine.subtractDays(expiry, 15);

  assert(r90 === "2027-05-28", "90-day calculation from 2027-08-26 = 2027-05-28", `Got: ${r90}`);
  assert(r60 === "2027-06-27", "60-day calculation from 2027-08-26 = 2027-06-27", `Got: ${r60}`);
  assert(r30 === "2027-07-27", "30-day calculation from 2027-08-26 = 2027-07-27", `Got: ${r30}`);
  assert(r15 === "2027-08-11", "15-day calculation from 2027-08-26 = 2027-08-11", `Got: ${r15}`);

  // TEST 2: No expiry date (NULL / Empty)
  console.log("\n--- Group 2: No Expiry Date Handling ---");
  const nullExpiryResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V-12345",
    expiryDate: null,
    isUploaded: false,
    verificationStatus: "not_uploaded",
    existingNotifications: [],
    todayISO: "2026-08-15"
  });

  assert(nullExpiryResult.daysRemaining === null, "Days remaining is null when no expiry");
  assert(nullExpiryResult.schedule.length === 4, "4 milestone rules created");
  assert(nullExpiryResult.schedule.every(s => s.status === "NOT_APPLICABLE"), "All rules NOT_APPLICABLE when no expiry date");
  assert(nullExpiryResult.schedule[0].statusLabel === "Not Available", "Status label says 'Not Available'");

  // TEST 3: Expiry far in future (All NOT_DUE)
  console.log("\n--- Group 3: Future Expiry (NOT_DUE) ---");
  const futureResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V-99999",
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

  // TEST 4: Exactly 30 days before expiry (30-day is DUE)
  console.log("\n--- Group 4: Threshold Arrived (DUE) ---");
  const dueResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V-88888",
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
    document_type: "visa",
    status: "sent",
    channel: "both",
    scheduled_for: "2027-07-27T10:00:00Z",
    idempotency_key: "student-1:visa:30:both:2027-08-26",
    notification_context: { days_left: 30 },
    created_at: "2027-07-27T10:00:00Z",
    updated_at: "2027-07-27T10:15:00Z"
  };

  const dispatchedResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V-88888",
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
    document_type: "visa",
    status: "failed",
    channel: "whatsapp",
    scheduled_for: "2027-07-27T10:00:00Z",
    idempotency_key: "student-1:visa:30:whatsapp:2027-08-26",
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
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V-88888",
    expiryDate: "2027-08-26",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [mockFailedNotif],
    todayISO: "2027-07-28"
  });

  const failed30 = failedResult.schedule.find(s => s.thresholdDays === 30);
  assert(failed30?.status === "FAILED", "30-day reminder is marked FAILED", `Got: ${failed30?.status}`);
  assert(failed30?.failureReason === "WhatsApp Gateway connection timeout", "failureReason matches gateway log");

  // TEST 7: Expired Document (EXPIRED)
  console.log("\n--- Group 7: Expired Document ---");
  const expiredResult = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "passport",
    documentTitle: "Passport Document",
    documentNumber: "P-11111",
    expiryDate: "2025-01-01",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: "2026-08-15"
  });

  assert(expiredResult.isExpired === true, "Document marked isExpired = true");
  assert(expiredResult.daysRemaining !== null && expiredResult.daysRemaining < 0, "Days remaining is negative");
  assert(expiredResult.schedule[0].status === "EXPIRED", "Status reflects EXPIRED");

  // TEST 8: Multi-document independence (Passport vs Visa)
  console.log("\n--- Group 8: Multi-document Independence ---");
  const studentSchedule = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "student-123",
    passport: {
      number: "P-PASS-01",
      expiryDate: "2028-12-31", // Far in future
      isUploaded: true,
      verificationStatus: "verified"
    },
    visa: {
      number: "V-VISA-01",
      expiryDate: "2026-09-14", // 30 days from 2026-08-15
      isUploaded: true,
      verificationStatus: "verified"
    },
    efrro: null, // Not uploaded
    notifications: [],
    todayISO: "2026-08-15"
  });

  assert(studentSchedule.documents.passport.schedule.every(s => s.status === "NOT_DUE"), "Passport schedule is all NOT_DUE");
  const visa30 = studentSchedule.documents.visa.schedule.find(s => s.thresholdDays === 30);
  assert(visa30?.status === "DUE", "Visa 30-day schedule is DUE independently");
  assert(studentSchedule.documents.efrro.schedule.every(s => s.status === "NOT_APPLICABLE"), "eFRRO schedule is NOT_APPLICABLE");
  assert(studentSchedule.summary.dueCount > 0, "Summary aggregates due count properly");

  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
