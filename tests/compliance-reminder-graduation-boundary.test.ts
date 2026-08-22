import "./test-preload";
import { ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("  ISCMS v0.2.0: REMINDER GRADUATION BOUNDARY TEST SUITE");
  console.log("=======================================================\n");

  const TODAY = "2026-08-22";

  console.log("--- Section 1: Passport Expiry After Graduation Date ---");
  const resPassport = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "passport",
    documentTitle: "International Passport",
    documentNumber: "P99887766",
    expiryDate: "2030-01-14",
    expectedGraduationDate: "2027-06-30",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: TODAY
  });

  assert(resPassport.isAfterGraduation === true, "Passport marked as isAfterGraduation: true");
  assert(resPassport.graduationBoundaryStatus === "AFTER_GRADUATION", "Passport boundary status is AFTER_GRADUATION");
  assert(resPassport.graduationDate === "2027-06-30", "Graduation date is correctly captured as 2027-06-30");
  assert(resPassport.schedule.length > 0, "Schedule items exist");
  assert(resPassport.schedule.every(s => s.status === "NOT_APPLICABLE" && s.statusLabel === "Inactive"), "All schedule items are NOT_APPLICABLE / Inactive");

  console.log("\n--- Section 2: Visa Expiry Before Graduation Date ---");
  const resVisa = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V11223344",
    expiryDate: "2026-10-15",
    expectedGraduationDate: "2027-06-30",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: TODAY
  });

  assert(resVisa.isAfterGraduation === false, "Visa isAfterGraduation is false");
  assert(resVisa.graduationBoundaryStatus === "WITHIN_BOUNDARY", "Visa boundary status is WITHIN_BOUNDARY");
  const rule60 = resVisa.schedule.find(s => s.thresholdDays === 60);
  assert(rule60?.status === "DUE", "60-day milestone is correctly DUE");

  console.log("\n--- Section 3: Exact Boundary Match (Expiry == Graduation) ---");
  const resExact = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "efrro",
    documentTitle: "eFRRO / Residential Permit",
    documentNumber: "EFRRO202699",
    expiryDate: "2027-06-30",
    expectedGraduationDate: "2027-06-30",
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: TODAY
  });

  assert(resExact.isAfterGraduation === false, "Exact boundary is inclusive (isAfterGraduation: false)");
  assert(resExact.graduationBoundaryStatus === "WITHIN_BOUNDARY", "Exact boundary is WITHIN_BOUNDARY");

  console.log("\n--- Section 4: Missing Graduation Date ---");
  const resMissingGrad = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V55667788",
    expiryDate: "2026-10-15",
    expectedGraduationDate: null,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: TODAY
  });

  assert(resMissingGrad.isAfterGraduation === false, "Missing graduation does not assume ineligible");
  assert(resMissingGrad.graduationBoundaryStatus === "MISSING_GRADUATION_DATE", "Boundary status marked MISSING_GRADUATION_DATE");
  assert(resMissingGrad.graduationDate === null, "Graduation date is null");
  const missingGradRule60 = resMissingGrad.schedule.find(s => s.thresholdDays === 60);
  assert(missingGradRule60?.status === "DUE", "Reminders are actively evaluated based on expiry date");

  console.log("\n--- Section 5: Student Multi-Document Independent Boundary Evaluation ---");
  const scheduleResponse = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "student-123",
    expectedGraduationDate: "2027-06-30",
    passport: {
      number: "P-LONG-TERM",
      expiryDate: "2032-05-10", // Expiry > Graduation -> Inactive
      isUploaded: true,
      verificationStatus: "verified"
    },
    visa: {
      number: "V-NEAR-TERM",
      expiryDate: "2026-10-01", // Expiry < Graduation -> Active
      isUploaded: true,
      verificationStatus: "verified"
    },
    efrro: {
      number: "E-MID-TERM",
      expiryDate: "2027-04-15", // Expiry < Graduation -> Active
      isUploaded: true,
      verificationStatus: "verified"
    },
    notifications: [],
    todayISO: TODAY
  });

  assert(scheduleResponse.passport.isAfterGraduation === true, "Student passport is inactive (expires 2032 > 2027)");
  assert(scheduleResponse.summary.byDocument.passport.dueCount === 0, "Student passport due count is 0");
  assert(scheduleResponse.summary.byDocument.passport.notApplicableCount === 5, "Student passport all 5 rules not applicable");

  assert(scheduleResponse.visa.isAfterGraduation === false, "Student visa is active (expires 2026 < 2027)");
  assert(scheduleResponse.summary.byDocument.visa.dueCount > 0, "Student visa due count > 0");

  assert(scheduleResponse.efrro.isAfterGraduation === false, "Student eFRRO is active (expires 2027-04 < 2027-06)");

  console.log("\n=======================================================");
  console.log("  ALL GRADUATION BOUNDARY TESTS PASSED SUCCESSFULLY!  ");
  console.log("=======================================================\n");
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
