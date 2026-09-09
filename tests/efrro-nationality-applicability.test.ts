/**
 * ISCMS Comprehensive Verification Test Suite:
 * Authoritative Nationality-Based eFRRO Applicability Rule
 *
 * Validates:
 * 1. Authoritative Domain Utility & ISO Normalization
 * 2. Compliance Calculator 8-Case Matrix (Indian vs. International)
 * 3. Profile Completeness Evaluation (Indian exemption vs. International mandatory)
 * 4. Reminder Engine Schedule Calculation
 * 5. Report Repository Dashboard Metrics & Drilldowns
 */

import { isEfrroApplicable, getAuthoritativeEfrroStatus } from "../src/domain/compliance/utils/efrro-applicability";
import { ComplianceCalculator } from "../src/domain/compliance/services/compliance-calculator";
import { ProfileCompletionEngine } from "../src/domain/students/services/profile-completion.service";
import { ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";
import { reportRepository } from "../src/domain/reports/repositories/report.repository";
import { getAdminSupabase } from "../src/lib/supabase/admin";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✗\x1b[0m ${testName}`);
    if (details) console.error(`    \x1b[33mDetails: ${details}\x1b[0m`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log("============================================================");
  console.log(" ISCMS TEST SUITE: NATIONALITY-BASED eFRRO APPLICABILITY RULE");
  console.log("============================================================\n");

  // =========================================================================
  // 1. Authoritative Domain Utility & Normalization
  // =========================================================================
  console.log("--- 1. Authoritative Domain Utility & Normalization ---");

  // Indian variants -> NOT APPLICABLE (false)
  assert(isEfrroApplicable("India") === false, "isEfrroApplicable('India') returns false");
  assert(isEfrroApplicable("INDIA") === false, "isEfrroApplicable('INDIA') (case-insensitive) returns false");
  assert(isEfrroApplicable("IND") === false, "isEfrroApplicable('IND') (ISO-3) returns false");
  assert(isEfrroApplicable("ind") === false, "isEfrroApplicable('ind') returns false");
  assert(isEfrroApplicable("Indian") === false, "isEfrroApplicable('Indian') (demonym) returns false");
  assert(isEfrroApplicable("IN") === false, "isEfrroApplicable('IN') (ISO-2) returns false");
  assert(isEfrroApplicable("356") === false, "isEfrroApplicable('356') (Numeric ISO) returns false");
  assert(isEfrroApplicable("Republic of India") === false, "isEfrroApplicable('Republic of India') returns false");
  assert(isEfrroApplicable(" India ") === false, "isEfrroApplicable with whitespace trimming returns false");

  // International students -> APPLICABLE (true)
  assert(isEfrroApplicable("United States") === true, "isEfrroApplicable('United States') returns true");
  assert(isEfrroApplicable("USA") === true, "isEfrroApplicable('USA') returns true");
  assert(isEfrroApplicable("Kenya") === true, "isEfrroApplicable('Kenya') returns true");
  assert(isEfrroApplicable("KEN") === true, "isEfrroApplicable('KEN') returns true");
  assert(isEfrroApplicable("Spain") === true, "isEfrroApplicable('Spain') returns true");
  assert(isEfrroApplicable("ESP") === true, "isEfrroApplicable('ESP') returns true");
  assert(isEfrroApplicable("Nepal") === true, "isEfrroApplicable('Nepal') returns true");
  assert(isEfrroApplicable("NPL") === true, "isEfrroApplicable('NPL') returns true");

  // Fail-closed invariant: null, undefined, empty string -> default to APPLICABLE (true)
  assert(isEfrroApplicable(null) === true, "isEfrroApplicable(null) fail-closed returns true");
  assert(isEfrroApplicable(undefined) === true, "isEfrroApplicable(undefined) fail-closed returns true");
  assert(isEfrroApplicable("") === true, "isEfrroApplicable('') fail-closed returns true");
  assert(isEfrroApplicable("   ") === true, "isEfrroApplicable('   ') fail-closed returns true");

  // getAuthoritativeEfrroStatus helper
  assert(getAuthoritativeEfrroStatus("India") === "NOT_APPLICABLE", "getAuthoritativeEfrroStatus for India returns NOT_APPLICABLE");
  assert(getAuthoritativeEfrroStatus("USA", "COMPLIANT", true) === "COMPLIANT", "getAuthoritativeEfrroStatus for USA with record returns raw status");
  assert(getAuthoritativeEfrroStatus("USA", null, false) === "MISSING", "getAuthoritativeEfrroStatus for USA without record returns MISSING");

  // =========================================================================
  // 2. Compliance Calculator Matrix
  // =========================================================================
  console.log("\n--- 2. Compliance Calculator Matrix ---");

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2);
  const futureStr = futureDate.toISOString().split("T")[0];

  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const pastStr = pastDate.toISOString().split("T")[0];

  // Case A: Indian Student with valid Passport & Visa, NO eFRRO
  const indianCompliant = ComplianceCalculator.evaluateStudentCompliance({
    nationality: "India",
    passport: {
      number: "Z1234567",
      expiry: futureStr,
      issueDate: "2020-01-01",
    },
    visa: {
      number: "V9876543",
      expiry: futureStr,
      issueDate: "2022-01-01",
    },
    efrro: null,
  });

  assert(
    indianCompliant.overallStatus === "COMPLIANT",
    "Case A: Indian student with valid passport+visa and NO eFRRO is COMPLIANT",
    `Got overallStatus: ${indianCompliant.overallStatus}`
  );
  assert(
    indianCompliant.complianceScore === 100,
    "Case A: Indian student compliance score is 100%",
    `Got score: ${indianCompliant.complianceScore}`
  );
  assert(
    indianCompliant.efrro.status === "NOT_APPLICABLE",
    "Case A: eFRRO document status is NOT_APPLICABLE for Indian student",
    `Got efrro status: ${indianCompliant.efrro.status}`
  );
  assert(
    indianCompliant.daysUntilEfrroExpiry === null,
    "Case A: daysUntilEfrroExpiry is null for Indian student"
  );
  assert(
    indianCompliant.isFullyCompliant === true,
    "Case A: isFullyCompliant is true for Indian student"
  );
  assert(
    indianCompliant.hasMissingRequiredData === false,
    "Case A: hasMissingRequiredData is false for Indian student"
  );

  // Case B: International Student (USA) with identical documents (valid Passport & Visa, NO eFRRO)
  const intlNonCompliant = ComplianceCalculator.evaluateStudentCompliance({
    nationality: "USA",
    passport: {
      number: "Z1234567",
      expiry: futureStr,
      issueDate: "2020-01-01",
    },
    visa: {
      number: "V9876543",
      expiry: futureStr,
      issueDate: "2022-01-01",
    },
    efrro: null,
  });

  assert(
    intlNonCompliant.overallStatus === "MISSING",
    "Case B: International student missing eFRRO is MISSING/NON_COMPLIANT (fail-closed)",
    `Got overallStatus: ${intlNonCompliant.overallStatus}`
  );
  assert(
    intlNonCompliant.complianceScore < 100,
    "Case B: International student score is penalized (< 100%)",
    `Got score: ${intlNonCompliant.complianceScore}`
  );
  assert(
    intlNonCompliant.efrro.status === "MISSING",
    "Case B: eFRRO status is MISSING for international student",
    `Got efrro status: ${intlNonCompliant.efrro.status}`
  );
  assert(
    intlNonCompliant.hasMissingRequiredData === true,
    "Case B: hasMissingRequiredData is true for international student"
  );

  // Case C: Indian Student with expired Passport
  const indianExpiredPassport = ComplianceCalculator.evaluateStudentCompliance({
    nationality: "India",
    passport: {
      number: "Z1234567",
      expiry: pastStr,
      issueDate: "2015-01-01",
    },
    visa: {
      number: "V9876543",
      expiry: futureStr,
      issueDate: "2022-01-01",
    },
    efrro: null,
  });

  assert(
    indianExpiredPassport.overallStatus === "EXPIRED",
    "Case C: Indian student with expired passport has overallStatus EXPIRED",
    `Got overallStatus: ${indianExpiredPassport.overallStatus}`
  );
  assert(
    indianExpiredPassport.passport.status === "EXPIRED",
    "Case C: Passport status is EXPIRED"
  );
  assert(
    indianExpiredPassport.efrro.status === "NOT_APPLICABLE",
    "Case C: eFRRO remains NOT_APPLICABLE despite passport expiry"
  );

  // Case D: International Student with all 3 valid documents
  const intlFullCompliant = ComplianceCalculator.evaluateStudentCompliance({
    nationality: "Kenya",
    passport: {
      number: "K1234567",
      expiry: futureStr,
      issueDate: "2020-01-01",
    },
    visa: {
      number: "V9876543",
      expiry: futureStr,
      issueDate: "2022-01-01",
    },
    efrro: {
      number: "E1234567",
      expiry: futureStr,
      issueDate: "2023-01-01",
    },
  });

  assert(
    intlFullCompliant.overallStatus === "COMPLIANT",
    "Case D: International student with all 3 documents is COMPLIANT"
  );
  assert(
    intlFullCompliant.efrro.status === "COMPLIANT",
    "Case D: International student eFRRO status is COMPLIANT"
  );
  assert(
    intlFullCompliant.complianceScore === 100,
    "Case D: International student compliance score is 100%"
  );

  // =========================================================================
  // 3. Profile Completeness Evaluation
  // =========================================================================
  console.log("\n--- 3. Profile Completeness Engine ---");

  // Indian Student Profile (no eFRRO entered)
  const indianProfileData = {
    fullName: "Zeel Patel",
    dateOfBirth: "2002-05-15",
    gender: "male",
    nationalityCode: "IND",
    email: "zeel.patel@example.com",
    phoneHome: "+919876543210",
    permanentAddress: "Ahmedabad, Gujarat",
    registrationNumber: "REG12345",
    admissionCategory: "self_financed",
    admissionAcademicYear: "2023-2024",
    lastEducationalQualification: "High School",
    lastEducationalInstitution: "Delhi Public School",
    passportNumber: "Z1234567",
    passportExpiry: futureStr,
    visaNumber: "V1234567",
    visaExpiry: futureStr,
    // efrroNumber and efrroExpiry intentionally omitted
  };

  const indianCompletion = ProfileCompletionEngine.evaluate(indianProfileData);
  assert(
    !indianCompletion.missingItems.includes("eFRRO Number") &&
    !indianCompletion.missingItems.includes("eFRRO Expiry Date"),
    "ProfileCompletion: eFRRO fields are NOT in missingItems for Indian student"
  );

  // International Student Profile (no eFRRO entered)
  const intlProfileData = {
    ...indianProfileData,
    nationalityCode: "USA",
  };

  const intlCompletion = ProfileCompletionEngine.evaluate(intlProfileData);
  assert(
    intlCompletion.missingItems.includes("eFRRO Number") &&
    intlCompletion.missingItems.includes("eFRRO Expiry Date"),
    "ProfileCompletion: eFRRO fields ARE in missingItems for International student"
  );
  assert(
    indianCompletion.percentage > intlCompletion.percentage,
    "ProfileCompletion: Indian percentage is higher because eFRRO is exempt",
    `Indian: ${indianCompletion.percentage}%, Intl: ${intlCompletion.percentage}%`
  );

  // =========================================================================
  // 4. Reminder Engine Schedule Calculation
  // =========================================================================
  console.log("\n--- 4. Reminder Engine Calculation ---");

  const soonExpDate = new Date();
  soonExpDate.setDate(soonExpDate.getDate() + 20); // 20 days remaining
  const soonExpStr = soonExpDate.toISOString().split("T")[0];

  // Indian student with eFRRO date in DB (historical/legacy)
  const indianReminders = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "test-indian-id",
    nationality: "India",
    passport: {
      number: "Z1234567",
      expiryDate: futureStr,
    },
    visa: {
      number: "V9876543",
      expiryDate: futureStr,
    },
    efrro: {
      number: "E1234567",
      expiryDate: soonExpStr,
    },
    notifications: [],
  });

  const indianEfrroReminders = indianReminders.documents.efrro.schedule;
  assert(
    indianEfrroReminders.length > 0 && indianEfrroReminders.every(r => r.status === "NOT_APPLICABLE"),
    "ReminderEngine: eFRRO reminder schedule is NOT_APPLICABLE for Indian student"
  );
  assert(
    indianReminders.summary.byDocument.efrro.notApplicableCount > 0,
    "ReminderEngine: efrro notApplicableCount > 0 for Indian student"
  );
  assert(
    indianReminders.summary.byDocument.efrro.dueCount === 0,
    "ReminderEngine: efrro dueCount is 0 for Indian student"
  );

  // International student with 20 days remaining on eFRRO
  const intlReminders = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "test-intl-id",
    nationality: "KEN",
    passport: {
      number: "K1234567",
      expiryDate: futureStr,
    },
    visa: {
      number: "V9876543",
      expiryDate: futureStr,
    },
    efrro: {
      number: "E1234567",
      expiryDate: soonExpStr,
    },
    notifications: [],
  });

  const intlEfrroReminders = intlReminders.documents.efrro.schedule;
  assert(
    intlEfrroReminders.length > 0 && intlEfrroReminders.some(r => r.status === "DUE" || r.status === "NOT_DUE"),
    "ReminderEngine: eFRRO reminders are active (DUE/NOT_DUE) for International student"
  );
  assert(
    intlReminders.summary.byDocument.efrro.notApplicableCount === 0,
    "ReminderEngine: efrro notApplicableCount is 0 for International student"
  );

  // =========================================================================
  // 5. Database Verification of Live Indian Students
  // =========================================================================
  console.log("\n--- 5. Live Database Indian Students Audit ---");

  const supabase = getAdminSupabase();
  const { data: indianStudents, error } = await supabase
    .from("students")
    .select(`
      id,
      registration_number,
      student_personal!inner(full_name, nationality_code),
      student_snapshot(
        passport_number,
        passport_expiry,
        passport_status,
        visa_number,
        visa_expiry,
        visa_status,
        efrro_number,
        efrro_expiry,
        efrro_status,
        compliance_status
      )
    `)
    .in("student_personal.nationality_code", ["IND", "India", "IN"])
    .is("deleted_at", null);

  assert(!error, "Database: Query for Indian students succeeded without error");

  if (indianStudents && indianStudents.length > 0) {
    console.log(`  Found ${indianStudents.length} Indian student(s) in active database.`);
    indianStudents.forEach((st: any) => {
      const p = Array.isArray(st.student_personal) ? st.student_personal[0] : st.student_personal;
      const snap = Array.isArray(st.student_snapshot) ? st.student_snapshot[0] : st.student_snapshot;
      const name = p?.full_name || st.registration_number;
      const nat = p?.nationality_code;

      const comp = ComplianceCalculator.evaluateStudentCompliance({
        nationality: nat,
        passport: {
          number: snap?.passport_number,
          expiry: snap?.passport_expiry,
        },
        visa: {
          number: snap?.visa_number,
          expiry: snap?.visa_expiry,
        },
        efrro: {
          number: snap?.efrro_number,
          expiry: snap?.efrro_expiry,
        },
      });

      assert(
        comp.efrro.status === "NOT_APPLICABLE",
        `DB Student [${name} (${nat})]: eFRRO evaluated as NOT_APPLICABLE`
      );

      if (comp.passport.hasValidRecord && !comp.passport.isExpired && comp.visa.hasValidRecord && !comp.visa.isExpired) {
        assert(
          comp.overallStatus === "COMPLIANT",
          `DB Student [${name}]: Full compliance achieved without eFRRO`
        );
      }
    });
  }

  // =========================================================================
  // 6. Report Repository Metrics & Drilldown
  // =========================================================================
  console.log("\n--- 6. Report Repository Unified Dashboard Verification ---");

  const metrics = await reportRepository.getDashboardMetrics();

  assert(typeof metrics.fullyCompliantStudents === "number", "ReportRepo: fullyCompliantStudents metric is returned");
  assert(metrics.fullyCompliantStudents >= 1, "ReportRepo: At least 1 fully compliant student exists in repository");

  const compliantDrilldown = await reportRepository.getDashboardDrilldown("compliant");
  assert(Array.isArray(compliantDrilldown.items), "ReportRepo: Compliant drilldown returns items array");

  // Verify that any Indian students in compliant drilldown have NO missing eFRRO
  const indianInCompliant = compliantDrilldown.items.filter(i => !isEfrroApplicable(i.nationalityCode));
  if (indianInCompliant.length > 0) {
    console.log(`  Found ${indianInCompliant.length} Indian student(s) in compliant drilldown.`);
    indianInCompliant.forEach(i => {
      assert(
        !i.missingDocuments?.includes("eFRRO"),
        `Compliant Drilldown [${i.studentName}]: eFRRO is NOT in missingDocuments list`
      );
      assert(
        i.complianceStatus === "COMPLIANT",
        `Compliant Drilldown [${i.studentName}]: Status is COMPLIANT`
      );
    });
  }

  // Verify expiring drilldowns exclude eFRRO for Indian students
  const expiringDrilldown = await reportRepository.getDashboardDrilldown("expiring_30");
  const indianEfrroExpiring = expiringDrilldown.items.filter(
    i => i.documentType === "efrro" && !isEfrroApplicable(i.nationalityCode)
  );
  assert(
    indianEfrroExpiring.length === 0,
    "ReportRepo: Expiring 30 drilldown contains ZERO eFRRO items for Indian nationals"
  );

  console.log("\n============================================================");
  console.log(` RESULTS: ${passedCount} passed, ${failedCount} failed`);
  console.log("============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
