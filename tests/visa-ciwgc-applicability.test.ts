/**
 * ISCMS Comprehensive Verification Test Suite:
 * Conditional Visa Requirement for Indian National + CIWGC Students
 *
 * Validates:
 * 1. Authoritative Domain Utility & Normalization Matrix
 * 2. Compliance Calculator Positive Compliance Evaluation
 * 3. Profile Completeness Service Exemption Handling
 * 4. Expiry Reminder Engine & Schedule Generation
 * 5. Student Validation Schema (Zod)
 * 6. Dynamic State Transitions (CIWGC <-> other tracks/categories)
 * 7. Active Database Student Compliance Verification
 */

import { isVisaApplicable, isVisaExempt, isIndianNationality, getAuthoritativeVisaStatus } from "../src/domain/compliance/utils/visa-applicability";
import { isEfrroApplicable } from "../src/domain/compliance/utils/efrro-applicability";
import { ComplianceCalculator } from "../src/domain/compliance/services/compliance-calculator";
import { ProfileCompletionEngine } from "../src/domain/students/services/profile-completion.service";
import { ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";
import { RegisterStudentValidationSchema } from "../src/services/validation/student-validation";
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
  console.log("=========================================================================");
  console.log(" ISCMS TEST SUITE: CONDITIONAL VISA REQUIREMENT FOR INDIAN CIWGC STUDENTS");
  console.log("=========================================================================\n");

  // =========================================================================
  // 1. Authoritative Domain Utility & Decision Matrix
  // =========================================================================
  console.log("--- 1. Authoritative Domain Utility & Decision Matrix ---");

  // Test 1: India + Other + CIWGC -> Visa EXEMPT (false)
  assert(
    isVisaApplicable({ nationality: "India", admissionCategory: "other", admissionTrack: "CIWGC" }) === false,
    "India + other + CIWGC -> isVisaApplicable is false"
  );
  assert(
    isVisaApplicable({ nationality: "IND", admissionCategory: "Other", admissionTrack: "ciwgc" }) === false,
    "IND + Other + ciwgc (casing) -> isVisaApplicable is false"
  );
  assert(
    isVisaApplicable({ nationality: "Indian", admissionCategory: "OTHER", admissionTrack: "CIWGC (Children of Indian Workers in Gulf Countries)" }) === false,
    "Indian + OTHER + CIWGC prefix -> isVisaApplicable is false"
  );
  assert(
    isVisaApplicable({ nationality: "356", admissionCategory: "other", admissionTrack: "CIWGC" }) === false,
    "356 (Numeric ISO) + other + CIWGC -> isVisaApplicable is false"
  );
  assert(
    isVisaApplicable({ nationality: " IN ", admissionCategory: " other ", admissionTrack: " CIWGC " }) === false,
    "Whitespace trimmed India + other + CIWGC -> isVisaApplicable is false"
  );
  assert(
    isVisaExempt({ nationality: "India", admissionCategory: "other", admissionTrack: "CIWGC" }) === true,
    "isVisaExempt helper returns true for India + other + CIWGC"
  );

  // Test 2: India + Other + NOT CIWGC -> Visa REQUIRED (true)
  assert(
    isVisaApplicable({ nationality: "India", admissionCategory: "other", admissionTrack: "NRI" }) === true,
    "India + other + NRI -> isVisaApplicable is true"
  );
  assert(
    isVisaApplicable({ nationality: "IND", admissionCategory: "other", admissionTrack: "PIO" }) === true,
    "IND + other + PIO -> isVisaApplicable is true"
  );
  assert(
    isVisaApplicable({ nationality: "India", admissionCategory: "other", admissionTrack: "" }) === true,
    "India + other + empty track -> isVisaApplicable is true"
  );
  assert(
    isVisaApplicable({ nationality: "India", admissionCategory: "other", admissionTrack: null }) === true,
    "India + other + null track -> isVisaApplicable is true"
  );

  // Test 3: India + NOT Other + CIWGC -> Visa REQUIRED (true)
  assert(
    isVisaApplicable({ nationality: "India", admissionCategory: "self_financed", admissionTrack: "CIWGC" }) === true,
    "India + self_financed + CIWGC -> isVisaApplicable is true"
  );
  assert(
    isVisaApplicable({ nationality: "India", admissionCategory: "general", admissionTrack: "CIWGC" }) === true,
    "India + general + CIWGC -> isVisaApplicable is true"
  );
  assert(
    isVisaApplicable({ nationality: "India", admissionCategory: "scholarship", admissionTrack: "CIWGC" }) === true,
    "India + scholarship + CIWGC -> isVisaApplicable is true"
  );

  // Test 4: Non-India + Other + CIWGC -> Visa REQUIRED (true)
  assert(
    isVisaApplicable({ nationality: "Kenya", admissionCategory: "other", admissionTrack: "CIWGC" }) === true,
    "Kenya + other + CIWGC -> isVisaApplicable is true"
  );
  assert(
    isVisaApplicable({ nationality: "United States", admissionCategory: "other", admissionTrack: "CIWGC" }) === true,
    "USA + other + CIWGC -> isVisaApplicable is true"
  );
  assert(
    isVisaApplicable({ nationality: "Nepal", admissionCategory: "other", admissionTrack: "CIWGC" }) === true,
    "Nepal + other + CIWGC -> isVisaApplicable is true"
  );

  // Fail-closed invariant: null / undefined context fields
  assert(
    isVisaApplicable(null) === true,
    "isVisaApplicable(null) fail-closed returns true"
  );
  assert(
    isVisaApplicable({}) === true,
    "isVisaApplicable({}) fail-closed returns true"
  );
  assert(
    isVisaApplicable({ nationality: null, admissionCategory: null, admissionTrack: null }) === true,
    "isVisaApplicable with all null fields fail-closed returns true"
  );

  // getAuthoritativeVisaStatus helper
  assert(
    getAuthoritativeVisaStatus({ nationality: "India", admissionCategory: "other", admissionTrack: "CIWGC" }) === "NOT_APPLICABLE",
    "getAuthoritativeVisaStatus for Indian CIWGC returns NOT_APPLICABLE"
  );
  assert(
    getAuthoritativeVisaStatus({ nationality: "India", admissionCategory: "other", admissionTrack: "NRI" }, "COMPLIANT", true) === "COMPLIANT",
    "getAuthoritativeVisaStatus for Indian NRI with valid visa returns raw status"
  );
  assert(
    getAuthoritativeVisaStatus({ nationality: "India", admissionCategory: "other", admissionTrack: "NRI" }, null, false) === "MISSING",
    "getAuthoritativeVisaStatus for Indian NRI without visa returns MISSING"
  );

  // =========================================================================
  // 2. Compliance Calculator Positive Compliance Evaluation
  // =========================================================================
  console.log("\n--- 2. Compliance Calculator Positive Compliance Evaluation ---");

  // Future valid expiry
  const validFutureDate = "2032-12-31";
  const expiredPastDate = "2020-01-01";

  // Case A: Indian CIWGC student with valid Passport, NO Visa, NO eFRRO
  const evalA = ComplianceCalculator.evaluateStudentCompliance({
    passport: { number: "P12345678", expiry: validFutureDate },
    visa: null,
    efrro: null,
    nationality: "IND",
    admissionCategory: "other",
    admissionTrack: "CIWGC"
  });
  assert(evalA.visa.status === "NOT_APPLICABLE", "Indian CIWGC: Visa status is NOT_APPLICABLE");
  assert(evalA.efrro.status === "NOT_APPLICABLE", "Indian CIWGC: eFRRO status is NOT_APPLICABLE");
  assert(evalA.passport.status === "COMPLIANT", "Indian CIWGC: Passport status is COMPLIANT");
  assert(evalA.overallStatus === "COMPLIANT", "Indian CIWGC: Overall compliance is COMPLIANT (Score: " + evalA.complianceScore + ")");
  assert(evalA.complianceScore === 100, "Indian CIWGC: Compliance score is 100%");

  // Case B: Indian NRI student with valid Passport, NO Visa
  const evalB = ComplianceCalculator.evaluateStudentCompliance({
    passport: { number: "P12345678", expiry: validFutureDate },
    visa: null,
    efrro: null,
    nationality: "IND",
    admissionCategory: "other",
    admissionTrack: "NRI"
  });
  assert(evalB.visa.status === "MISSING", "Indian NRI: Visa status is MISSING");
  assert(evalB.overallStatus === "MISSING", "Indian NRI: Overall compliance is MISSING (Score: " + evalB.complianceScore + ")");
  assert(evalB.complianceScore === 0, "Indian NRI: Compliance score is 0% when Visa missing");

  // Case C: International (Kenya) student with CIWGC track, valid Passport, NO Visa, NO eFRRO
  const evalC = ComplianceCalculator.evaluateStudentCompliance({
    passport: { number: "P12345678", expiry: validFutureDate },
    visa: null,
    efrro: null,
    nationality: "KEN",
    admissionCategory: "other",
    admissionTrack: "CIWGC"
  });
  assert(evalC.visa.status === "MISSING", "Kenya CIWGC: Visa status is MISSING");
  assert(evalC.efrro.status === "MISSING", "Kenya CIWGC: eFRRO status is MISSING");
  assert(evalC.overallStatus === "MISSING", "Kenya CIWGC: Overall compliance is MISSING");

  // Case D: Indian CIWGC student with EXPIRED Passport
  const evalD = ComplianceCalculator.evaluateStudentCompliance({
    passport: { number: "P12345678", expiry: expiredPastDate },
    visa: null,
    efrro: null,
    nationality: "IND",
    admissionCategory: "other",
    admissionTrack: "CIWGC"
  });
  assert(evalD.passport.status === "EXPIRED", "Indian CIWGC expired passport: status is EXPIRED");
  assert(evalD.overallStatus === "EXPIRED", "Indian CIWGC expired passport: overall is EXPIRED");

  // =========================================================================
  // 3. Profile Completeness Evaluation
  // =========================================================================
  console.log("\n--- 3. Profile Completeness Evaluation ---");

  const baseStudentData = {
    fullName: "Zeel Patel",
    firstName: "Zeel",
    lastName: "Patel",
    gender: "Female",
    dateOfBirth: "2003-01-01",
    bloodGroup: "O+",
    maritalStatus: "Single",
    nationalityCode: "IND",
    religion: "Hinduism",
    studentEmail: "zeel@example.com",
    phoneHome: "9876543210",
    phoneHomeCountryCode: "+91",
    phoneHomeNumber: "9876543210",
    permanentAddress: "Ahmedabad, Gujarat",
    presentAddress: "Ahmedabad, Gujarat",
    passportNumber: "Z1234567",
    passportExpiry: validFutureDate,
    passportIssueDate: "2020-01-01",
    passportPlaceOfIssue: "Ahmedabad",
    admissionCategory: "other",
    admissionCategoryOther: "CIWGC",
    admissionDate: "2024-07-01",
    academicLevel: "undergraduate",
    enrollmentStatus: "active"
  };

  // Indian CIWGC student (no visa, no efrro entered)
  const compCIWGC = ProfileCompletionEngine.evaluate(baseStudentData as any);
  const visaFieldsInMissingCIWGC = compCIWGC.missingItems.filter(f => f.toLowerCase().includes("visa"));
  const efrroFieldsInMissingCIWGC = compCIWGC.missingItems.filter(f => f.toLowerCase().includes("efrro"));
  assert(visaFieldsInMissingCIWGC.length === 0, "Indian CIWGC student has ZERO missing visa fields in profile completeness");
  assert(efrroFieldsInMissingCIWGC.length === 0, "Indian CIWGC student has ZERO missing efrro fields in profile completeness");
  assert(compCIWGC.isReadyForComplianceReview === true, "Indian CIWGC student is ready for compliance review without visa");

  // Indian NRI student (no visa entered)
  const compNRI = ProfileCompletionEngine.evaluate({
    ...baseStudentData,
    admissionCategoryOther: "NRI"
  } as any);
  const visaFieldsInMissingNRI = compNRI.missingItems.filter(f => f.toLowerCase().includes("visa"));
  assert(visaFieldsInMissingNRI.length > 0, "Indian NRI student correctly flags missing visa fields (" + visaFieldsInMissingNRI.join(", ") + ")");
  assert(compNRI.isReadyForComplianceReview === false, "Indian NRI student is NOT ready for compliance review when visa missing");

  // =========================================================================
  // 4. Expiry Reminder Engine & Schedule
  // =========================================================================
  console.log("\n--- 4. Expiry Reminder Engine & Schedule ---");

  const reminderCIWGC = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "test-ciwgc-1",
    nationality: "IND",
    admissionCategory: "other",
    admissionCategoryOther: "CIWGC",
    passport: { number: "P12345", expiryDate: validFutureDate },
    visa: null,
    efrro: null,
    notifications: []
  });

  assert(reminderCIWGC.visa.documentNumber === "Not Applicable", "Reminder engine: visa.documentNumber is 'Not Applicable'");
  assert(reminderCIWGC.visa.expiryDate === null, "Reminder engine: visa.expiryDate is null");
  assert(reminderCIWGC.visa.verificationStatus === "not_applicable", "Reminder engine: visa.verificationStatus is 'not_applicable'");
  assert(
    reminderCIWGC.visa.schedule.every(s => s.status === "NOT_APPLICABLE"),
    "Reminder engine: all visa schedule rules are marked NOT_APPLICABLE"
  );
  assert(reminderCIWGC.summary.byDocument.visa.notApplicableCount === reminderCIWGC.visa.schedule.length, "Summary counts all visa rules as notApplicableCount");

  // Verify non-CIWGC Indian student gets standard visa schedule evaluation
  const reminderNRI = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "test-nri-1",
    nationality: "IND",
    admissionCategory: "other",
    admissionCategoryOther: "NRI",
    passport: { number: "P12345", expiryDate: validFutureDate },
    visa: { number: "V99999", expiryDate: validFutureDate },
    efrro: null,
    notifications: []
  });

  assert(reminderNRI.visa.documentNumber === "V99999", "Reminder engine: NRI visa.documentNumber is preserved");
  assert(reminderNRI.visa.schedule.some(s => s.status !== "NOT_APPLICABLE"), "Reminder engine: NRI visa schedule has active rules");

  // =========================================================================
  // 5. Form Validation Schema (RegisterStudentValidationSchema)
  // =========================================================================
  console.log("\n--- 5. Form Validation Schema (RegisterStudentValidationSchema) ---");

  const validCIWGCForm = {
    fullName: "Test Student",
    firstName: "Test",
    lastName: "Student",
    nationality: "IND",
    admissionCategory: "other",
    admissionCategoryOther: "CIWGC",
    admissionDate: "2024-08-01",
    admissionAcademicYear: "2024-2025",
    campus: "Gandhinagar Headquarter",
    programId: "00000000-0000-0000-0000-000000000001",
    passportNumber: "P9999999",
    passportIssueDate: "2021-01-01",
    passportExpiry: validFutureDate,
    passportPlaceOfIssue: "Ahmedabad",
    // Visa completely omitted
    visaNumber: "",
    visaExpiry: "",
    visaIssueDate: "",
    // eFRRO completely omitted
    efrroNumber: "",
    efrroExpiry: "",
    efrroIssueDate: ""
  };

  const parseCIWGC = RegisterStudentValidationSchema.safeParse(validCIWGCForm);
  assert(parseCIWGC.success === true, "RegisterStudentValidationSchema succeeds without visa for Indian CIWGC student");

  // =========================================================================
  // 6. Dynamic Transitions Test Matrix
  // =========================================================================
  console.log("\n--- 6. Dynamic Transitions Test Matrix ---");

  // Dynamic Test 5: CIWGC -> another track -> Visa becomes required
  const track1 = isVisaApplicable({ nationality: "IND", admissionCategory: "other", admissionTrack: "CIWGC" });
  const track2 = isVisaApplicable({ nationality: "IND", admissionCategory: "other", admissionTrack: "NRI" });
  assert(track1 === false && track2 === true, "Track switch CIWGC -> NRI: Visa transitions from EXEMPT to REQUIRED");

  // Dynamic Test 6: Another track -> CIWGC -> Visa becomes disabled
  const track3 = isVisaApplicable({ nationality: "IND", admissionCategory: "other", admissionTrack: "General" });
  const track4 = isVisaApplicable({ nationality: "IND", admissionCategory: "other", admissionTrack: "CIWGC" });
  assert(track3 === true && track4 === false, "Track switch General -> CIWGC: Visa transitions from REQUIRED to EXEMPT");

  // Dynamic Test 7: Other -> another category -> Visa becomes required
  const cat1 = isVisaApplicable({ nationality: "IND", admissionCategory: "other", admissionTrack: "CIWGC" });
  const cat2 = isVisaApplicable({ nationality: "IND", admissionCategory: "self_financed", admissionTrack: "CIWGC" });
  assert(cat1 === false && cat2 === true, "Category switch Other -> self_financed: Visa transitions from EXEMPT to REQUIRED");

  // Dynamic Test 8: India -> another country -> Visa becomes required
  const nat1 = isVisaApplicable({ nationality: "India", admissionCategory: "other", admissionTrack: "CIWGC" });
  const nat2 = isVisaApplicable({ nationality: "Kenya", admissionCategory: "other", admissionTrack: "CIWGC" });
  assert(nat1 === false && nat2 === true, "Nationality switch India -> Kenya: Visa transitions from EXEMPT to REQUIRED");

  // =========================================================================
  // 7. Active Database Student Verification
  // =========================================================================
  console.log("\n--- 7. Active Database Student Verification ---");

  const supabase = getAdminSupabase();
  const { data: dbStudents, error: dbErr } = await supabase
    .from("students")
    .select(`
      id,
      registration_number,
      student_personal(full_name, nationality_code),
      student_academic(admission_category, admission_category_other),
      student_snapshot(passport_status, visa_status, efrro_status, compliance_status)
    `)
    .is("deleted_at", null);

  if (dbErr || !dbStudents) {
    console.error("Database query failed:", dbErr);
  } else {
    let ciwgcIndianCount = 0;
    let nriIndianCount = 0;
    let internationalCount = 0;

    for (const s of dbStudents) {
      const p = Array.isArray(s.student_personal) ? s.student_personal[0] : s.student_personal;
      const a = Array.isArray(s.student_academic) ? s.student_academic[0] : s.student_academic;
      const nat = p?.nationality_code || "";
      const isInd = isIndianNationality(nat);
      const isOther = (a?.admission_category || "").toLowerCase() === "other";
      const isCIWGC = (a?.admission_category_other || "").toUpperCase().startsWith("CIWGC");

      const visaApp = isVisaApplicable({
        nationality: nat,
        admissionCategory: a?.admission_category,
        admissionTrack: a?.admission_category_other,
        admissionCategoryOther: a?.admission_category_other
      });

      if (isInd && isOther && isCIWGC) {
        ciwgcIndianCount++;
        assert(visaApp === false, `DB Student ${p?.full_name} (${s.registration_number}) is Indian CIWGC -> Visa NOT applicable`);
      } else if (isInd) {
        nriIndianCount++;
        assert(visaApp === true, `DB Student ${p?.full_name} (${s.registration_number}) is Indian non-CIWGC -> Visa APPLICABLE`);
      } else {
        internationalCount++;
        assert(visaApp === true, `DB Student ${p?.full_name} (${s.registration_number}) is International (${nat}) -> Visa APPLICABLE`);
      }
    }

    console.log(`\nVerified DB cohort: ${ciwgcIndianCount} Indian CIWGC, ${nriIndianCount} Indian non-CIWGC, ${internationalCount} International students.`);
    assert(ciwgcIndianCount === 13, "Found exactly 13 Indian CIWGC students in active database matching requirement");
  }

  // Final Summary
  console.log("\n============================================================");
  console.log(` TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Fatal test runner exception:", err);
  process.exit(1);
});
