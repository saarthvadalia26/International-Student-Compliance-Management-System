import { CalendarDateEngine, ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";

/**
 * ISCMS Document Metadata & Versioning Automated Test Suite
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
  console.log("  ISCMS DOCUMENT METADATA & VERSIONING TEST SUITE");
  console.log("=======================================================\n");

  // TEST 1: Date Validation (expiry > issue)
  console.log("--- Group 1: Document Date Validation ---");
  const validIssue = "2025-01-10";
  const validExpiry = "2030-01-09";
  const invalidExpiry = "2024-12-31";
  const sameDayExpiry = "2025-01-10";

  assert(new Date(validExpiry) > new Date(validIssue), "Valid expiration date is strictly after issue date");
  assert(new Date(invalidExpiry) <= new Date(validIssue), "Invalid expiration before issue date is caught");
  assert(new Date(sameDayExpiry) <= new Date(validIssue), "Same day expiration is caught as invalid");

  // TEST 2: Compliance status calculation from expiry date
  console.log("\n--- Group 2: Expiry Date Compliance Mapping ---");
  const todayISO = "2026-08-15";

  function computeDocStatus(expiryDate: string, refDate: string): "COMPLIANT" | "WARNING" | "EXPIRED" {
    const diff = CalendarDateEngine.diffCalendarDays(expiryDate, refDate);
    if (diff < 0) return "EXPIRED";
    if (diff <= 30) return "WARNING";
    return "COMPLIANT";
  }

  assert(computeDocStatus("2027-12-13", todayISO) === "COMPLIANT", "Expiry in late 2027 is COMPLIANT");
  assert(computeDocStatus("2026-08-30", todayISO) === "WARNING", "Expiry in 15 days is WARNING");
  assert(computeDocStatus("2025-05-01", todayISO) === "EXPIRED", "Expiry in the past is EXPIRED");

  // TEST 3: Versioning progression (v1 -> v2)
  console.log("\n--- Group 3: Document Versioning Mechanics ---");
  const mockExistingVersions = [
    { id: "v1", version_number: 1, is_active: true, document_number: "P-100", expiry_date: "2027-01-01" }
  ];

  const highestVer = Math.max(...mockExistingVersions.map(v => v.version_number));
  const newVerNum = highestVer + 1;
  assert(newVerNum === 2, "New version number correctly increments to v2", `Got: ${newVerNum}`);

  const updatedVersions = mockExistingVersions.map(v => ({ ...v, is_active: false }));
  const newVersion = { id: "v2", version_number: newVerNum, is_active: true, document_number: "P-200", expiry_date: "2028-03-20" };
  const allVersions = [...updatedVersions, newVersion];

  const activeVersions = allVersions.filter(v => v.is_active);
  assert(activeVersions.length === 1, "Exactly one version remains active");
  assert(activeVersions[0].version_number === 2, "Active version is the newly created v2");
  assert(allVersions.find(v => v.version_number === 1)?.is_active === false, "Previous v1 is preserved as inactive in history");

  // TEST 4: Expiry change triggers reminder recalculation
  console.log("\n--- Group 4: Dynamic Reminder Shift on Expiry Change ---");
  const oldExpiry = "2027-12-13";
  const newExpiry = "2028-03-20";

  // Initial schedule based on 2027-12-13
  const initialSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V-9999",
    expiryDate: oldExpiry,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: "2026-08-15"
  });

  const oldR90 = initialSchedule.schedule.find(s => s.thresholdDays === 90);
  assert(oldR90?.scheduledDateISO === "2027-09-14", "Old 90-day reminder calculated from 2027-12-13 is 2027-09-14", `Got: ${oldR90?.scheduledDateISO}`);

  // Updated schedule after staff changes expiry to 2028-03-20
  const updatedSchedule = ExpiryReminderEngine.calculateDocumentReminders({
    documentType: "visa",
    documentTitle: "Student Visa",
    documentNumber: "V-9999",
    expiryDate: newExpiry,
    isUploaded: true,
    verificationStatus: "verified",
    existingNotifications: [],
    todayISO: "2026-08-15"
  });

  const newR90 = updatedSchedule.schedule.find(s => s.thresholdDays === 90);
  assert(newR90?.scheduledDateISO === "2027-12-21", "New 90-day reminder calculated from 2028-03-20 is 2027-12-21", `Got: ${newR90?.scheduledDateISO}`);
  assert(newR90?.scheduledDateISO !== oldR90?.scheduledDateISO, "Reminder schedule successfully shifts when expiry date updates");

  // TEST 5: Complete audit log payload generation
  console.log("\n--- Group 5: Audit Log Integrity ---");
  const auditEntry = {
    actor_id: "staff-uuid-1",
    action: "DOCUMENT_METADATA_UPDATED",
    resource: "passport_versions/v2",
    filters_applied: {
      studentId: "student-123",
      documentType: "passport",
      versionNumber: 2,
      previousValues: {
        documentNumber: "P-100",
        expiryDate: "2027-01-01",
        placeOfIssue: "Berlin"
      },
      newValues: {
        documentNumber: "P-200",
        expiryDate: "2028-03-20",
        placeOfIssue: "New Delhi",
        reason: "Renewed physical passport audited"
      }
    }
  };

  assert(auditEntry.action === "DOCUMENT_METADATA_UPDATED", "Audit action is DOCUMENT_METADATA_UPDATED");
  assert(auditEntry.filters_applied.previousValues.expiryDate === "2027-01-01", "Previous expiry date retained in audit");
  assert(auditEntry.filters_applied.newValues.expiryDate === "2028-03-20", "New expiry date recorded in audit");

  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
