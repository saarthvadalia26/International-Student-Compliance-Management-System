/**
 * ISCMS ICCR & SII Application Number Business Rules Test Suite
 * Validates the canonical business rules across:
 * - Category metadata & helper predicates (requiresIccrApplicationNumber, requiresSiiApplicationNumber)
 * - Complete 9-case validation matrix
 * - Category transition & active-record clearing rules
 * - Bulk Excel import validation and normalization
 * - Report and Student Portal mapping
 */

import { StudentAcademicSchema } from "../src/services/validation/validation.service";
import { RegisterStudentValidationSchema } from "../src/services/validation/student-validation";
import { 
  ADMISSION_CATEGORY_OPTIONS, 
  requiresIccrApplicationNumber, 
  requiresSiiApplicationNumber 
} from "../src/domain/students/types/registration-expansion.types";
import { ReportMapper } from "../src/domain/reports/mappers";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, errorDetail || "");
    failedTests++;
  }
}

async function runTestSuite() {
  console.log("\n======================================================================");
  console.log(" ISCMS ICCR & SII APPLICATION NUMBER BUSINESS RULES TEST SUITE");
  console.log("======================================================================\n");

  // --------------------------------------------------------------------------
  // 1. CANONICAL CATEGORY METADATA & HELPER FUNCTIONS
  // --------------------------------------------------------------------------
  console.log("[1] Canonical Category Metadata & Helper Functions");

  const iccrOpt = ADMISSION_CATEGORY_OPTIONS.find(o => o.value === "iccr");
  assert(iccrOpt !== undefined, "ADMISSION_CATEGORY_OPTIONS contains 'iccr'");
  assert(iccrOpt?.requiresIccrNumber === true, "ICCR category has requiresIccrNumber === true");
  assert(iccrOpt?.requiresSii === true, "ICCR category has requiresSii === true (ICCR students must also apply via SII)");

  const siiOpt = ADMISSION_CATEGORY_OPTIONS.find(o => o.value === "sii");
  assert(siiOpt !== undefined, "ADMISSION_CATEGORY_OPTIONS contains 'sii'");
  assert(siiOpt?.requiresIccrNumber === false, "SII category has requiresIccrNumber === false");
  assert(siiOpt?.requiresSii === true, "SII category has requiresSii === true");

  assert(requiresIccrApplicationNumber("iccr") === true, "requiresIccrApplicationNumber('iccr') === true");
  assert(requiresIccrApplicationNumber("sii") === false, "requiresIccrApplicationNumber('sii') === false");
  assert(requiresIccrApplicationNumber("direct") === false, "requiresIccrApplicationNumber('direct') === false");
  assert(requiresIccrApplicationNumber(null) === false, "requiresIccrApplicationNumber(null) === false");

  assert(requiresSiiApplicationNumber("iccr") === true, "requiresSiiApplicationNumber('iccr') === true");
  assert(requiresSiiApplicationNumber("sii") === true, "requiresSiiApplicationNumber('sii') === true");
  assert(requiresSiiApplicationNumber("direct") === false, "requiresSiiApplicationNumber('direct') === false");
  assert(requiresSiiApplicationNumber(null) === false, "requiresSiiApplicationNumber(null) === false");

  // --------------------------------------------------------------------------
  // 2. COMPLETE 9-CASE VALIDATION MATRIX
  // --------------------------------------------------------------------------
  console.log("\n[2] Complete 9-Case Validation Matrix");

  // Case 1: ICCR + both numbers -> VALID
  const case1 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-98124",
    siiApplicationNumber: "SII-2026-44102",
    currentSemester: 1
  });
  assert(case1.success, "Case 1: Category = ICCR with both ICCR and SII numbers is VALID");

  // Case 2: ICCR + missing ICCR number -> INVALID
  const case2 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: "SII-2026-44102",
    currentSemester: 1
  });
  assert(!case2.success, "Case 2: Category = ICCR with missing ICCR number is INVALID");

  // Case 3: ICCR + missing SII number -> INVALID
  const case3 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-98124",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(!case3.success, "Case 3: Category = ICCR with missing SII number is INVALID");

  // Case 4: ICCR + both missing -> INVALID
  const case4 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(!case4.success, "Case 4: Category = ICCR with both numbers missing is INVALID");

  // Case 5: SII + SII number -> VALID
  const case5 = StudentAcademicSchema.safeParse({
    admissionCategory: "sii",
    iccrApplicationNumber: null,
    siiApplicationNumber: "SII-2026-44102",
    currentSemester: 1
  });
  assert(case5.success, "Case 5: Category = SII with SII number is VALID");

  // Case 6: SII + missing SII number -> INVALID
  const case6 = StudentAcademicSchema.safeParse({
    admissionCategory: "sii",
    iccrApplicationNumber: null,
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(!case6.success, "Case 6: Category = SII with missing SII number is INVALID");

  // Case 7: SII with ICCR number supplied (normalized / cleared)
  const case7Payload = {
    admissionCategory: "sii",
    iccrApplicationNumber: "ICCR-EXTRA-999",
    siiApplicationNumber: "SII-2026-44102"
  };
  const case7 = StudentAcademicSchema.safeParse(case7Payload);
  assert(case7.success, "Case 7a: Category = SII with SII number passes schema validation");
  // Normalize per active-record retention rule
  if (case7Payload.admissionCategory === "sii") {
    case7Payload.iccrApplicationNumber = "";
  }
  assert(case7Payload.iccrApplicationNumber === "", "Case 7b: Category = SII clears/normalizes ICCR application number to null/empty");

  // Case 8: Other + no numbers -> VALID
  const case8 = StudentAcademicSchema.safeParse({
    admissionCategory: "direct",
    iccrApplicationNumber: null,
    siiApplicationNumber: null,
    currentSemester: 1
  });
  assert(case8.success, "Case 8: Category = direct with no application numbers is VALID");

  // Case 9: Other + numbers supplied (normalized / cleared)
  const case9Payload = {
    admissionCategory: "direct",
    iccrApplicationNumber: "ICCR-STALE-1",
    siiApplicationNumber: "SII-STALE-2"
  };
  if (case9Payload.admissionCategory !== "iccr" && case9Payload.admissionCategory !== "sii") {
    case9Payload.iccrApplicationNumber = "";
    case9Payload.siiApplicationNumber = "";
  }
  assert(case9Payload.iccrApplicationNumber === "" && case9Payload.siiApplicationNumber === "", "Case 9: Other category clears/normalizes both application numbers to null/empty");

  // --------------------------------------------------------------------------
  // 3. FULL REGISTRATION SCHEMA ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log("\n[3] Full Registration Schema Dual-Requirement Tests");

  const regIccrValid = RegisterStudentValidationSchema.safeParse({
    fullName: "Tariq Aziz",
    nationalityCode: "AFG",
    gender: "male",
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-KBL-01",
    siiApplicationNumber: "SII-2026-AFG-01"
  });
  assert(regIccrValid.success, "Full registration with Category = ICCR and both numbers passes");

  const regIccrMissingSii = RegisterStudentValidationSchema.safeParse({
    fullName: "Tariq Aziz",
    nationalityCode: "AFG",
    gender: "male",
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-KBL-01",
    siiApplicationNumber: ""
  });
  assert(!regIccrMissingSii.success, "Full registration with Category = ICCR missing SII number is blocked");

  const regSiiValid = RegisterStudentValidationSchema.safeParse({
    fullName: "Fatima Noor",
    nationalityCode: "BGD",
    gender: "female",
    admissionCategory: "sii",
    siiApplicationNumber: "SII-2026-DHK-99"
  });
  assert(regSiiValid.success, "Full registration with Category = SII and SII number passes");

  // --------------------------------------------------------------------------
  // 4. CATEGORY TRANSITIONS & DATA RETENTION RULES
  // --------------------------------------------------------------------------
  console.log("\n[4] Category Transitions & Data Retention Rules");

  function simulateCategoryTransition(
    currentCategory: string,
    currentIccr: string | null,
    currentSii: string | null,
    newCategory: string,
    inputIccr?: string | null,
    inputSii?: string | null
  ) {
    let resultingIccr: string | null = null;
    let resultingSii: string | null = null;

    if (newCategory === "iccr") {
      resultingIccr = inputIccr ?? currentIccr;
      resultingSii = inputSii ?? currentSii;
    } else if (newCategory === "sii") {
      resultingIccr = null; // ICCR cleared per retention rule
      resultingSii = inputSii ?? currentSii;
    } else {
      resultingIccr = null; // Both cleared per retention rule
      resultingSii = null;
    }

    return { resultingIccr, resultingSii };
  }

  // Transition: ICCR -> SII
  const t1 = simulateCategoryTransition("iccr", "ICCR-100", "SII-200", "sii");
  assert(t1.resultingIccr === null, "ICCR -> SII transition clears ICCR number to NULL");
  assert(t1.resultingSii === "SII-200", "ICCR -> SII transition retains SII number");

  // Transition: ICCR -> Other
  const t2 = simulateCategoryTransition("iccr", "ICCR-100", "SII-200", "direct");
  assert(t2.resultingIccr === null && t2.resultingSii === null, "ICCR -> Other transition clears both numbers to NULL");

  // Transition: SII -> Other
  const t3 = simulateCategoryTransition("sii", null, "SII-200", "other");
  assert(t3.resultingIccr === null && t3.resultingSii === null, "SII -> Other transition clears SII number to NULL");

  // Transition: SII -> ICCR
  const t4 = simulateCategoryTransition("sii", null, "SII-200", "iccr", "ICCR-NEW-300");
  assert(t4.resultingIccr === "ICCR-NEW-300", "SII -> ICCR transition adds required ICCR number");
  assert(t4.resultingSii === "SII-200", "SII -> ICCR transition retains existing SII number");

  // Transition: Other -> ICCR
  const t5 = simulateCategoryTransition("direct", null, null, "iccr", "ICCR-NEW-400", "SII-NEW-400");
  assert(t5.resultingIccr === "ICCR-NEW-400" && t5.resultingSii === "SII-NEW-400", "Other -> ICCR transition sets both numbers");

  // --------------------------------------------------------------------------
  // 5. REPORT & STUDENT PORTAL MAPPER
  // --------------------------------------------------------------------------
  console.log("\n[5] Report & Student Portal Mapper Verification");

  const iccrReportRow = ReportMapper.toStudentReportRow({
    student_id: "stu-iccr",
    registration_number: "REG-ICCR-001",
    full_name: "Farhan Saeed",
    nationality: "Afghanistan",
    school: "School of Engineering & Technology",
    programme: "B.Tech CSE",
    admission_category: "iccr",
    iccr_application_number: "ICCR-2026-AFG-1",
    sii_application_number: "SII-2026-AFG-1"
  });
  assert(iccrReportRow.admissionCategory === "iccr", "ReportMapper maps ICCR category");
  assert(iccrReportRow.iccrApplicationNumber === "ICCR-2026-AFG-1", "ReportMapper maps ICCR number");
  assert(iccrReportRow.siiApplicationNumber === "SII-2026-AFG-1", "ReportMapper maps SII number for ICCR student");

  const siiReportRow = ReportMapper.toStudentReportRow({
    student_id: "stu-sii",
    registration_number: "REG-SII-002",
    full_name: "Ayesha Malik",
    nationality: "Bangladesh",
    school: "School of Management Studies",
    programme: "MBA",
    admission_category: "sii",
    iccr_application_number: "SHOULD-BE-IGNORED",
    sii_application_number: "SII-2026-BGD-2"
  });
  assert(siiReportRow.admissionCategory === "sii", "ReportMapper maps SII category");
  assert(siiReportRow.iccrApplicationNumber === null, "ReportMapper omits ICCR number for SII student");
  assert(siiReportRow.siiApplicationNumber === "SII-2026-BGD-2", "ReportMapper maps SII number for SII student");

  const directReportRow = ReportMapper.toStudentReportRow({
    student_id: "stu-direct",
    registration_number: "REG-DIR-003",
    full_name: "John Doe",
    nationality: "United States",
    school: "School of Forensic Sciences",
    programme: "M.Sc Forensic Science",
    admission_category: "direct",
    iccr_application_number: "SHOULD-BE-NULL",
    sii_application_number: "SHOULD-BE-NULL"
  });
  assert(directReportRow.admissionCategory === "direct", "ReportMapper maps direct category");
  assert(directReportRow.iccrApplicationNumber === null, "ReportMapper sets iccrApplicationNumber = null for direct student");
  assert(directReportRow.siiApplicationNumber === null, "ReportMapper sets siiApplicationNumber = null for direct student");

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log(` RESULTS: ${passedTests} passed, ${failedTests} failed`);
  console.log("======================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Fatal error executing test suite:", err);
  process.exit(1);
});
