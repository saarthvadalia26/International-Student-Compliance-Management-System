/**
 * ISCMS ICCR Application Number Test Suite
 * Validates end-to-end implementation of ICCR Application Number across:
 * - Category options and requirements metadata (optional across all categories)
 * - Schema validation across all categories
 * - Data preservation rules
 * - Bulk Excel import field definitions
 * - Report mapping
 */

import { StudentAcademicSchema } from "../src/services/validation/validation.service";
import { RegisterStudentValidationSchema } from "../src/services/validation/student-validation";
import { ADMISSION_CATEGORY_OPTIONS } from "../src/domain/students/types/registration-expansion.types";
import { ISCMS_FIELD_DEFINITIONS } from "../src/domain/import/types/bulk-import.types";
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
  console.log("\n============================================================");
  console.log(" ISCMS ICCR APPLICATION NUMBER END-TO-END TEST SUITE");
  console.log("============================================================\n");

  // --------------------------------------------------------------------------
  // 1. CATEGORY METADATA & CONSTANTS
  // --------------------------------------------------------------------------
  console.log("[1] Category Constants & Requirement Metadata");

  const iccrOpt = ADMISSION_CATEGORY_OPTIONS.find(o => o.value === "iccr");
  assert(iccrOpt !== undefined, "ADMISSION_CATEGORY_OPTIONS contains 'iccr'");
  assert(iccrOpt?.requiresIccrNumber === false, "ICCR category has requiresIccrNumber === false (optional)");
  assert(iccrOpt?.requiresSii === false, "ICCR category requiresSii is false (optional)");

  const allCategoriesOptional = ADMISSION_CATEGORY_OPTIONS.every(o => o.requiresIccrNumber === false && o.requiresSii === false);
  assert(allCategoriesOptional, "All categories have requiresIccrNumber === false and requiresSii === false");

  // --------------------------------------------------------------------------
  // 2. VALIDATION MATRIX
  // --------------------------------------------------------------------------
  console.log("\n[2] Validation Matrix");

  // Case 1: Category = ICCR with valid app numbers -> Valid
  const case1Res = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-98124",
    siiApplicationNumber: "SII-2026-88192",
    currentSemester: 1
  });
  assert(case1Res.success, "Case 1: Category = ICCR with valid iccrApplicationNumber and siiApplicationNumber is accepted");

  // Case 2: Category = ICCR with empty app number -> Valid (Optional)
  const case2EmptyRes = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: "SII-2026-88192",
    currentSemester: 1
  });
  assert(case2EmptyRes.success, "Case 2a: Category = ICCR with empty string iccrApplicationNumber is accepted (optional)");

  const case2NullRes = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: null,
    siiApplicationNumber: "SII-2026-88192",
    currentSemester: 1
  });
  assert(case2NullRes.success, "Case 2b: Category = ICCR with null iccrApplicationNumber is accepted (optional)");

  // Case 3: Category = SII with SII app number -> Valid
  const case3Res = StudentAcademicSchema.safeParse({
    admissionCategory: "sii",
    iccrApplicationNumber: null,
    siiApplicationNumber: "SII-2026-88192",
    currentSemester: 1
  });
  assert(case3Res.success, "Case 3: Category = SII with siiApplicationNumber is accepted");

  // Case 4: Category = direct with empty app numbers -> Valid
  const case4Res = StudentAcademicSchema.safeParse({
    admissionCategory: "direct",
    iccrApplicationNumber: null,
    siiApplicationNumber: null,
    currentSemester: 1
  });
  assert(case4Res.success, "Case 4: Category = direct with empty application numbers is accepted");

  // Case 5: Existing non-ICCR student (no admission category) -> Valid
  const case5Res = StudentAcademicSchema.safeParse({
    admissionCategory: null,
    currentSemester: 1
  });
  assert(case5Res.success, "Case 5: Student without admissionCategory is valid (no regression)");

  // Case 6: ICCR with empty SII application number -> Valid (Optional)
  const case6Res = StudentAcademicSchema.safeParse({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-98124",
    siiApplicationNumber: "",
    currentSemester: 1
  });
  assert(case6Res.success, "Case 6: Category = ICCR with empty SII application number is accepted (optional)");

  // Case 7: Full Registration Schema
  const case7Valid = RegisterStudentValidationSchema.safeParse({
    fullName: "Fatima Al-Mansoor",
    nationalityCode: "AFG",
    gender: "female",
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-KBL-001",
    siiApplicationNumber: "SII-2026-KBL-001"
  });
  assert(case7Valid.success, "Case 7a: Full registration with valid ICCR and SII application numbers passes");

  const case7EmptyAppNos = RegisterStudentValidationSchema.safeParse({
    fullName: "Fatima Al-Mansoor",
    nationalityCode: "AFG",
    gender: "female",
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: ""
  });
  assert(case7EmptyAppNos.success, "Case 7b: Full registration with empty application numbers passes (optional)");

  // Case 8: Category = other requires admissionCategoryOther
  const case8NoOther = StudentAcademicSchema.safeParse({
    admissionCategory: "other",
    admissionCategoryOther: ""
  });
  assert(!case8NoOther.success, "Case 8a: Category = other without specification fails");

  const case8WithOther = StudentAcademicSchema.safeParse({
    admissionCategory: "other",
    admissionCategoryOther: "Special Bilateral Cultural Exchange"
  });
  assert(case8WithOther.success, "Case 8b: Category = other with specification succeeds");

  // --------------------------------------------------------------------------
  // 3. BULK IMPORT FIELD DEFINITIONS
  // --------------------------------------------------------------------------
  console.log("\n[3] Bulk Excel Import Field Definitions");

  const iccrFieldDef = ISCMS_FIELD_DEFINITIONS.find(f => f.field === "iccr_application_number");
  assert(iccrFieldDef !== undefined, "ISCMS_FIELD_DEFINITIONS includes 'iccr_application_number'");
  assert(iccrFieldDef?.aliases.includes("iccr application number") || false, "Contains alias 'iccr application number'");
  assert(iccrFieldDef?.aliases.includes("iccr app no") || false, "Contains alias 'iccr app no'");
  assert(iccrFieldDef?.aliases.includes("iccr_no") || false, "Contains alias 'iccr_no'");
  assert(iccrFieldDef?.aliases.includes("iccr id") || false, "Contains alias 'iccr id'");

  // --------------------------------------------------------------------------
  // 4. REPORT MAPPER & INDEPENDENCE
  // --------------------------------------------------------------------------
  console.log("\n[4] Report Mapper & Independence");

  const reportRow = ReportMapper.toStudentReportRow({
    student_id: "stu-1001",
    registration_number: "REG-2026-001",
    full_name: "Ahmad Shah",
    nationality: "Afghanistan",
    school: "School of Engineering & Technology",
    programme: "B.Tech in Computer Science & Engineering",
    admission_category: "iccr",
    iccr_application_number: "ICCR-2026-AFG-999"
  });
  assert(reportRow.admissionCategory === "iccr", "ReportMapper maps admissionCategory correctly");
  assert(reportRow.iccrApplicationNumber === "ICCR-2026-AFG-999", "ReportMapper maps iccrApplicationNumber correctly");

  const fullIccrRow = ReportMapper.toStudentReportRow({
    student_id: "stu-1002",
    registration_number: "REG-2026-002",
    full_name: "Mariam Ba",
    nationality: "Gambia",
    school: "School of Management Studies",
    programme: "Master of Business Administration",
    admission_category: "iccr",
    iccr_application_number: "ICCR-ROW-55",
    sii_application_number: "SII-ROW-55"
  });
  assert(fullIccrRow.admissionCategory === "iccr", "ICCR row maps admissionCategory 'iccr'");
  assert(fullIccrRow.iccrApplicationNumber === "ICCR-ROW-55", "ICCR row maps iccrApplicationNumber");
  assert(fullIccrRow.siiApplicationNumber === "SII-ROW-55", "ICCR row maps siiApplicationNumber");

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n============================================================");
  console.log(` RESULTS: ${passedTests} passed, ${failedTests} failed`);
  console.log("============================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Fatal error executing ICCR test suite:", err);
  process.exit(1);
});
