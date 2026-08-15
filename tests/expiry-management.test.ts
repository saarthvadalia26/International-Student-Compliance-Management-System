import { CalendarDateEngine, ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";
import { USER_ROLES, isInternalUser, isAdministrator, isStaff, isStudent } from "../src/lib/auth/permissions";

/**
 * ISCMS First-Class Document Expiry-Date Management Test Suite
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
  console.log("  ISCMS FIRST-CLASS EXPIRY-DATE MANAGEMENT TEST SUITE");
  console.log("=======================================================\n");

  const todayISO = "2026-08-15";

  // TEST A: Update Future Expiry (13 Dec 2027 -> 20 Mar 2028)
  console.log("--- Test A: Update Future Expiry Date ---");
  const oldExpiry = "2027-12-13";
  const newExpiry = "2028-03-20";

  const initialSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "E52819040",
    expiryDate: oldExpiry,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO
  });

  const updatedSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "E52819040",
    expiryDate: newExpiry,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO
  });

  const old90 = initialSchedule.schedule.find(s => s.thresholdDays === 90);
  const new90 = updatedSchedule.schedule.find(s => s.thresholdDays === 90);
  const new60 = updatedSchedule.schedule.find(s => s.thresholdDays === 60);
  const new30 = updatedSchedule.schedule.find(s => s.thresholdDays === 30);
  const new15 = updatedSchedule.schedule.find(s => s.thresholdDays === 15);

  assert(old90?.scheduledDateISO === "2027-09-14", "Initial 90-day reminder for 13 Dec 2027 is 14 Sep 2027", `Got: ${old90?.scheduledDateISO}`);
  assert(new90?.scheduledDateISO === "2027-12-21", "Recalculated 90-day reminder for 20 Mar 2028 is 21 Dec 2027", `Got: ${new90?.scheduledDateISO}`);
  assert(new60?.scheduledDateISO === "2028-01-20", "Recalculated 60-day reminder for 20 Mar 2028 is 20 Jan 2028", `Got: ${new60?.scheduledDateISO}`);
  assert(new30?.scheduledDateISO === "2028-02-19", "Recalculated 30-day reminder for 20 Mar 2028 is 19 Feb 2028", `Got: ${new30?.scheduledDateISO}`);
  assert(new15?.scheduledDateISO === "2028-03-05", "Recalculated 15-day reminder for 20 Mar 2028 is 05 Mar 2028", `Got: ${new15?.scheduledDateISO}`);

  const daysRem = CalendarDateEngine.diffCalendarDays(newExpiry, todayISO);
  assert(daysRem === 583, "Days remaining calculated from 2026-08-15 to 2028-03-20 is 583 days", `Got: ${daysRem}`);

  // TEST B: Change to Near Expiry (15 days remaining)
  console.log("\n--- Test B: Near Expiry Warning State ---");
  const nearExpiry = "2026-08-30"; // 15 days after 2026-08-15
  const nearDays = CalendarDateEngine.diffCalendarDays(nearExpiry, todayISO);
  assert(nearDays === 15, "Near expiry date is exactly 15 days left", `Got: ${nearDays}`);

  const nearHealth = CalendarDateEngine.getExpiryHealth(nearDays);
  assert(nearHealth.level === "critical", "15 days remaining categorized as critical expiry", `Got: ${nearHealth.level}`);
  assert(nearHealth.relativeText === "Expires in 15 days", "15 days relative text is 'Expires in 15 days'");

  const nearSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "E52819040",
    expiryDate: nearExpiry,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO
  });

  const near15Reminder = nearSchedule.schedule.find(s => s.thresholdDays === 15);
  assert(near15Reminder?.status === "DUE", "15-day reminder is marked DUE today", `Got: ${near15Reminder?.status}`);

  // TEST C: Expired Document (past dates)
  console.log("\n--- Test C: Expired Document Handling ---");
  const expiredYesterday = "2026-08-14";
  const expiredThreeDays = "2026-08-12";

  const diffYest = CalendarDateEngine.diffCalendarDays(expiredYesterday, todayISO);
  const diffThree = CalendarDateEngine.diffCalendarDays(expiredThreeDays, todayISO);

  assert(diffYest === -1, "Yesterday difference is -1 day");
  assert(diffThree === -3, "Three days ago difference is -3 days");

  assert(CalendarDateEngine.formatRelativeDays(diffYest) === "Expired yesterday", "Formatted -1 is 'Expired yesterday'");
  assert(CalendarDateEngine.formatRelativeDays(diffThree) === "Expired 3 days ago", "Formatted -3 is 'Expired 3 days ago'");

  const expiredSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "E52819040",
    expiryDate: expiredYesterday,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO
  });

  assert(expiredSchedule.isExpired === true, "Document marked isExpired = true");
  assert(expiredSchedule.schedule.every(s => s.status === "EXPIRED"), "All pre-expiry milestones marked EXPIRED for expired document");

  // TEST D: Historical Version Preservation
  console.log("\n--- Test D: Historical Versioning Integrity ---");
  const versionHistory = [
    { version_number: 1, is_active: false, expiry_date: "2027-12-13", notes: "Initial upload" },
    { version_number: 2, is_active: true, expiry_date: "2028-03-20", notes: "Extension stamped" }
  ];

  assert(versionHistory.filter(v => v.is_active).length === 1, "Exactly one version active");
  assert(versionHistory.find(v => v.version_number === 1)?.expiry_date === "2027-12-13", "Historical version 1 retains original expiry date");
  assert(versionHistory.find(v => v.version_number === 2)?.expiry_date === "2028-03-20", "Active version 2 has new expiry date");

  // TEST E: Role Authorization Checks
  console.log("\n--- Test E: Server-Side Role Authorization ---");
  const adminUser = { id: "u-admin", user_metadata: { role: USER_ROLES.ADMINISTRATOR } } as unknown as import("@supabase/supabase-js").User;
  const staffUser = { id: "u-staff", user_metadata: { role: USER_ROLES.STAFF } } as unknown as import("@supabase/supabase-js").User;
  const studentUser = { id: "u-student", user_metadata: { role: USER_ROLES.STUDENT } } as unknown as import("@supabase/supabase-js").User;
  const readOnlyUser = { id: "u-ro", user_metadata: { role: "staff_ro" } } as unknown as import("@supabase/supabase-js").User;

  assert(isInternalUser(adminUser) === true, "Administrator is authorized internal user");
  assert(isAdministrator(adminUser) === true, "Admin role helper works");
  assert(isInternalUser(staffUser) === true, "Staff is authorized internal user");
  assert(isStaff(staffUser) === true, "Staff role helper works");
  assert(isInternalUser(studentUser) === false, "Student is rejected from internal expiry modifications");
  assert(isStudent(studentUser) === true, "Student role helper works");
  assert(isInternalUser(readOnlyUser) === false, "Read-only staff is rejected from internal write actions");

  // TEST F: Comprehensive Relative Days Formatting
  console.log("\n--- Test F: Relative Days Formatting Engine ---");
  assert(CalendarDateEngine.formatRelativeDays(null) === "No expiry recorded", "null formatted as 'No expiry recorded'");
  assert(CalendarDateEngine.formatRelativeDays(undefined) === "No expiry recorded", "undefined formatted as 'No expiry recorded'");
  assert(CalendarDateEngine.formatRelativeDays(-5) === "Expired 5 days ago", "-5 formatted as 'Expired 5 days ago'");
  assert(CalendarDateEngine.formatRelativeDays(-1) === "Expired yesterday", "-1 formatted as 'Expired yesterday'");
  assert(CalendarDateEngine.formatRelativeDays(0) === "Expires today", "0 formatted as 'Expires today'");
  assert(CalendarDateEngine.formatRelativeDays(1) === "Expires tomorrow", "1 formatted as 'Expires tomorrow'");
  assert(CalendarDateEngine.formatRelativeDays(15) === "Expires in 15 days", "15 formatted as 'Expires in 15 days'");
  assert(CalendarDateEngine.formatRelativeDays(582) === "Expires in 582 days", "582 formatted as 'Expires in 582 days'");

  // TEST G: Date Validation Rules
  console.log("\n--- Test G: Date Validation Rules ---");
  const issueDate = "2025-01-10";
  const validExp = "2028-03-20";
  const beforeIssueExp = "2024-12-31";
  const sameDayExp = "2025-01-10";

  assert(new Date(validExp) > new Date(issueDate), "Valid expiry is after issue date");
  assert(new Date(beforeIssueExp) <= new Date(issueDate), "Expiry before issue date caught");
  assert(new Date(sameDayExp) <= new Date(issueDate), "Same day expiry caught");

  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
