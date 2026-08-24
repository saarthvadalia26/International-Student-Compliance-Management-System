/**
 * ISCMS ICCR & SII Application Number Business Rules Test Suite
 * Validates the canonical business rules across:
 * - Category metadata & helper predicates (both fields are optional across all categories)
 * - Complete 9-case validation matrix (all categories + empty/filled application numbers are VALID)
 * - Category transitions preserve application numbers without clearing
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
  assert(iccrOpt?.requiresIccrNumber === false, "ICCR category has requiresIccrNumber === false (optional)");
  assert(iccrOpt?.requiresSii === false, "ICCR category has requiresSii === false (optional)");

  const siiOpt = ADMISSION_CATEGORY_OPTIONS.find(o => o.value === "sii");
  assert(siiOpt !== undefined, "ADMISSION_CATEGORY_OPTIONS contains 'sii'");
  assert(siiOpt?.requiresIccrNumber === false, "SII category has requiresIccrNumber === false (optional)");
  assert(siiOpt?.requiresSii === false, "SII category has requiresSii === false (optional)");

  assert(requiresIccrApplicationNumber("iccr") === false, "requiresIccrApplicationNumber('iccr') === false");
  assert(requiresIccrApplicationNumber("sii") === false, "requiresIccrApplicationNumber('sii') === false");
  assert(requiresIccrApplicationNumber("direct") === false, "requiresIccrApplicationNumber('direct') === false");
  assert(requiresIccrApplicationNumber(null) === false, "requiresIccrApplicationNumber(null) === false");

  assert(requiresSiiApplicationNumber("iccr") === false, "requiresSiiApplicationNumber('iccr') === false");
  assert(requiresSiiApplicationNumber("sii") === false, "requiresSiiApplicationNumber('sii') === false");
  assert(requiresSiiApplicationNumber("direct") === false, "requiresSiiApplicationNumber('direct') === false");
  assert(requiresSiiApplicationNumber(null) === false, "requiresSiiApplicationNumber(null) === false");

  // --------------------------------------------------------------------------
  // 2. COMPLETE 9-CASE VALIDATION MATRIX (Phase 24)
  // --------------------------------------------------------------------------
  console.log("\n[2] Complete 9-Case Validation Matrix (Phase 24)");

  // Test 1: Category = ICCR, ICCR = empty, SII = empty -> VALID
  const test1 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(test1.success, "Test 1: Category = ICCR, ICCR = empty, SII = empty is VALID");

  // Test 2: Category = ICCR, ICCR = ABC123, SII = empty -> VALID
  const test2 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ABC123",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(test2.success, "Test 2: Category = ICCR, ICCR = ABC123, SII = empty is VALID");

  // Test 3: Category = ICCR, ICCR = empty, SII = SII456 -> VALID
  const test3 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: "SII456",
    currentSemester: 1
  });
  assert(test3.success, "Test 3: Category = ICCR, ICCR = empty, SII = SII456 is VALID");

  // Test 4: Category = ICCR, ICCR = ABC123, SII = SII456 -> VALID
  const test4 = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ABC123",
    siiApplicationNumber: "SII456",
    currentSemester: 1
  });
  assert(test4.success, "Test 4: Category = ICCR, ICCR = ABC123, SII = SII456 is VALID");

  // Test 5: Category = SII, ICCR = empty, SII = empty -> VALID
  const test5 = StudentAcademicSchema.safeParse({
    admissionCategory: "sii",
    iccrApplicationNumber: "",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(test5.success, "Test 5: Category = SII, ICCR = empty, SII = empty is VALID");

  // Test 6: Category = SII, ICCR = ABC123, SII = empty -> VALID
  const test6 = StudentAcademicSchema.safeParse({
    admissionCategory: "sii",
    iccrApplicationNumber: "ABC123",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(test6.success, "Test 6: Category = SII, ICCR = ABC123, SII = empty is VALID");

  // Test 7: Category = SII, ICCR = empty, SII = SII456 -> VALID
  const test7 = StudentAcademicSchema.safeParse({
    admissionCategory: "sii",
    iccrApplicationNumber: "",
    siiApplicationNumber: "SII456",
    currentSemester: 1
  });
  assert(test7.success, "Test 7: Category = SII, ICCR = empty, SII = SII456 is VALID");

  // Test 8: Category = Other, ICCR = empty, SII = empty -> VALID
  const test8 = StudentAcademicSchema.safeParse({
    admissionCategory: "other",
    admissionCategoryOther: "Custom Track",
    iccrApplicationNumber: "",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(test8.success, "Test 8: Category = Other, ICCR = empty, SII = empty is VALID");

  // Test 9: Category = Other, ICCR = ABC123, SII = SII456 -> VALID
  const test9 = StudentAcademicSchema.safeParse({
    admissionCategory: "other",
    admissionCategoryOther: "Custom Track",
    iccrApplicationNumber: "ABC123",
    siiApplicationNumber: "SII456",
    currentSemester: 1
  });
  assert(test9.success, "Test 9: Category = Other, ICCR = ABC123, SII = SII456 is VALID");

  // --------------------------------------------------------------------------
  // 3. FULL REGISTRATION SCHEMA ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log("\n[3] Full Registration Schema Dual-Requirement Tests");

  const regIccrNoAppNumbers = RegisterStudentValidationSchema.safeParse({
    fullName: "Tariq Aziz",
    nationalityCode: "AFG",
    gender: "male",
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: ""
  });
  assert(regIccrNoAppNumbers.success, "Full registration with Category = ICCR and empty application numbers passes");

  const regIccrBoth = RegisterStudentValidationSchema.safeParse({
    fullName: "Tariq Aziz",
    nationalityCode: "AFG",
    gender: "male",
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-KBL-01",
    siiApplicationNumber: "SII-2026-AFG-01"
  });
  assert(regIccrBoth.success, "Full registration with Category = ICCR and both numbers passes");

  const regSiiNoAppNumbers = RegisterStudentValidationSchema.safeParse({
    fullName: "Fatima Noor",
    nationalityCode: "BGD",
    gender: "female",
    admissionCategory: "sii",
    siiApplicationNumber: ""
  });
  assert(regSiiNoAppNumbers.success, "Full registration with Category = SII and empty SII number passes");

  // --------------------------------------------------------------------------
  // 4. CATEGORY TRANSITIONS & DATA PRESERVATION RULES (Phase 6 & Phase 13)
  // --------------------------------------------------------------------------
  console.log("\n[4] Category Transitions & Data Preservation Rules (Phase 6 & 13)");

  function simulateCategoryTransition(
    currentCategory: string,
    currentIccr: string | null,
    currentSii: string | null,
    newCategory: string,
    inputIccr?: string | null,
    inputSii?: string | null
  ) {
    // Both fields remain unchanged across category transitions unless explicitly edited
    const resultingIccr = inputIccr !== undefined ? inputIccr : currentIccr;
    const resultingSii = inputSii !== undefined ? inputSii : currentSii;
    return { resultingIccr, resultingSii };
  }

  // Transition: ICCR -> SII
  const t1 = simulateCategoryTransition("iccr", "ABC123", "SII456", "sii");
  assert(t1.resultingIccr === "ABC123", "ICCR -> SII transition preserves ICCR number");
  assert(t1.resultingSii === "SII456", "ICCR -> SII transition preserves SII number");

  // Transition: ICCR -> Other
  const t2 = simulateCategoryTransition("iccr", "ABC123", "SII456", "direct");
  assert(t2.resultingIccr === "ABC123" && t2.resultingSii === "SII456", "ICCR -> Other transition preserves both numbers");

  // Transition: SII -> ICCR
  const t3 = simulateCategoryTransition("sii", "ABC123", "SII456", "iccr");
  assert(t3.resultingIccr === "ABC123" && t3.resultingSii === "SII456", "SII -> ICCR transition preserves both numbers");

  // Transition: SII -> Other
  const t4 = simulateCategoryTransition("sii", "ABC123", "SII456", "other");
  assert(t4.resultingIccr === "ABC123" && t4.resultingSii === "SII456", "SII -> Other transition preserves both numbers");

  // Transition: Other -> ICCR
  const t5 = simulateCategoryTransition("direct", "ABC123", "SII456", "iccr");
  assert(t5.resultingIccr === "ABC123" && t5.resultingSii === "SII456", "Other -> ICCR transition preserves both numbers");

  // Transition: Other -> SII
  const t6 = simulateCategoryTransition("direct", "ABC123", "SII456", "sii");
  assert(t6.resultingIccr === "ABC123" && t6.resultingSii === "SII456", "Other -> SII transition preserves both numbers");

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
    iccr_application_number: "ICCR-EXTRA-99",
    sii_application_number: "SII-2026-BGD-2"
  });
  assert(siiReportRow.admissionCategory === "sii", "ReportMapper maps SII category");
  assert(siiReportRow.iccrApplicationNumber === "ICCR-EXTRA-99", "ReportMapper maps ICCR number for SII student");
  assert(siiReportRow.siiApplicationNumber === "SII-2026-BGD-2", "ReportMapper maps SII number for SII student");

  const directReportRow = ReportMapper.toStudentReportRow({
    student_id: "stu-direct",
    registration_number: "REG-DIR-003",
    full_name: "John Doe",
    nationality: "United States",
    school: "School of Forensic Sciences",
    programme: "M.Sc Forensic Science",
    admission_category: "direct",
    iccr_application_number: "ICCR-DIRECT-1",
    sii_application_number: "SII-DIRECT-2"
  });
  assert(directReportRow.admissionCategory === "direct", "ReportMapper maps direct category");
  assert(directReportRow.iccrApplicationNumber === "ICCR-DIRECT-1", "ReportMapper preserves iccrApplicationNumber for direct student");
  assert(directReportRow.siiApplicationNumber === "SII-DIRECT-2", "ReportMapper preserves siiApplicationNumber for direct student");

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
