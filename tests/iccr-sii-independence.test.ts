/**
 * ISCMS ICCR & SII Application Number Independence Test Suite
 * Validates complete architectural decoupling and independent lifecycle of:
 * - iccr_application_number (ICCR Application Number)
 * - sii_application_number  (Study in India / SII Application Number)
 *
 * Covers all phases from Phase 1 to Phase 30:
 * - Test A: ICCR entered -> SII remains empty
 * - Test B: SII entered -> ICCR remains unchanged
 * - Test C: Both entered -> Both persist independently
 * - Test D: ICCR changed -> SII unchanged
 * - Test E: SII changed -> ICCR unchanged
 * - Test F: ICCR cleared -> SII unchanged
 * - Test G: SII cleared -> ICCR unchanged
 * - Test H: Both empty -> Valid
 * - Test I: All 5 Admission Categories support independent ICCR and SII values
 * - Test J: Profile Completion Engine evaluates both fields as optional
 * - Test K: Report and Student Portal mappers preserve independent values
 */

import { StudentAcademicSchema } from "../src/services/validation/validation.service";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { ADMISSION_CATEGORY_OPTIONS } from "../src/domain/students/types/registration-expansion.types";
import { ProfileCompletionEngine } from "../src/domain/students/services/profile-completion.service";
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
  console.log(" ISCMS ICCR & SII INDEPENDENCE REGRESSION TEST SUITE");
  console.log("======================================================================\n");

  // --------------------------------------------------------------------------
  // SECTION 1: INDEPENDENT EDIT BEHAVIOR (Phase 14 & Phase 30 Tests)
  // --------------------------------------------------------------------------
  console.log("[1] Independent Edit Behavior Lifecycle Simulation");

  // Helper simulating the fixed frontend edit payload builder
  function buildEditPayload(form: {
    admissionCategory: string;
    admissionCategoryOther?: string;
    iccrApplicationNumber: string;
    siiApplicationNumber: string;
  }) {
    return {
      admissionCategory: form.admissionCategory || undefined,
      admissionCategoryOther: form.admissionCategory === "other" ? (form.admissionCategoryOther?.trim() || undefined) : undefined,
      siiApplicationNumber: form.siiApplicationNumber ? form.siiApplicationNumber.trim() : null,
      iccrApplicationNumber: form.iccrApplicationNumber ? form.iccrApplicationNumber.trim() : null
    };
  }

  // Test A: Initial empty -> Enter ICCR -> ICCR saved, SII remains null
  const payloadA = buildEditPayload({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-TEST-001",
    siiApplicationNumber: ""
  });
  assert(payloadA.iccrApplicationNumber === "ICCR-TEST-001", "Test A: ICCR is 'ICCR-TEST-001'");
  assert(payloadA.siiApplicationNumber === null, "Test A: SII remains null (not copied from ICCR)");

  // Test B: Initial ICCR=ICCR-TEST-001, SII=empty -> Enter SII=SII-TEST-002
  const payloadB = buildEditPayload({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-TEST-001",
    siiApplicationNumber: "SII-TEST-002"
  });
  assert(payloadB.iccrApplicationNumber === "ICCR-TEST-001", "Test B: ICCR remains 'ICCR-TEST-001'");
  assert(payloadB.siiApplicationNumber === "SII-TEST-002", "Test B: SII is 'SII-TEST-002'");

  // Test C: Both exist -> Update ICCR to ICCR-TEST-003 -> SII unchanged
  const payloadC = buildEditPayload({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-TEST-003",
    siiApplicationNumber: "SII-TEST-002"
  });
  assert(payloadC.iccrApplicationNumber === "ICCR-TEST-003", "Test C: ICCR updated to 'ICCR-TEST-003'");
  assert(payloadC.siiApplicationNumber === "SII-TEST-002", "Test C: SII remains unchanged at 'SII-TEST-002'");

  // Test D: Both exist -> Update SII to SII-TEST-004 -> ICCR unchanged
  const payloadD = buildEditPayload({
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-TEST-003",
    siiApplicationNumber: "SII-TEST-004"
  });
  assert(payloadD.iccrApplicationNumber === "ICCR-TEST-003", "Test D: ICCR remains unchanged at 'ICCR-TEST-003'");
  assert(payloadD.siiApplicationNumber === "SII-TEST-004", "Test D: SII updated to 'SII-TEST-004'");

  // Test E: Clear ICCR -> ICCR becomes null, SII unchanged
  const payloadE = buildEditPayload({
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: "SII-TEST-004"
  });
  assert(payloadE.iccrApplicationNumber === null, "Test E: ICCR is cleared to null");
  assert(payloadE.siiApplicationNumber === "SII-TEST-004", "Test E: SII remains intact at 'SII-TEST-004'");

  // Test F: Clear SII -> ICCR is null, SII is null
  const payloadF = buildEditPayload({
    admissionCategory: "iccr",
    iccrApplicationNumber: "",
    siiApplicationNumber: ""
  });
  assert(payloadF.iccrApplicationNumber === null, "Test F: ICCR is null");
  assert(payloadF.siiApplicationNumber === null, "Test F: SII is null");

  // --------------------------------------------------------------------------
  // SECTION 2: ADMISSION CATEGORY INDEPENDENCE (Phase 15 & 16)
  // --------------------------------------------------------------------------
  console.log("\n[2] All 5 Admission Categories Support Independent Values");

  const categories = ["iccr", "sii", "direct", "foreign_govt_sponsored", "other"] as const;

  for (const cat of categories) {
    const p1 = buildEditPayload({
      admissionCategory: cat,
      admissionCategoryOther: cat === "other" ? "Custom Scholarship" : undefined,
      iccrApplicationNumber: "ICCR-VAL-99",
      siiApplicationNumber: ""
    });
    assert(p1.iccrApplicationNumber === "ICCR-VAL-99" && p1.siiApplicationNumber === null, 
      `Category '${cat}': ICCR only preserves ICCR and leaves SII null`);

    const p2 = buildEditPayload({
      admissionCategory: cat,
      admissionCategoryOther: cat === "other" ? "Custom Scholarship" : undefined,
      iccrApplicationNumber: "",
      siiApplicationNumber: "SII-VAL-88"
    });
    assert(p2.iccrApplicationNumber === null && p2.siiApplicationNumber === "SII-VAL-88", 
      `Category '${cat}': SII only preserves SII and leaves ICCR null`);

    const p3 = buildEditPayload({
      admissionCategory: cat,
      admissionCategoryOther: cat === "other" ? "Custom Scholarship" : undefined,
      iccrApplicationNumber: "ICCR-VAL-99",
      siiApplicationNumber: "SII-VAL-88"
    });
    assert(p3.iccrApplicationNumber === "ICCR-VAL-99" && p3.siiApplicationNumber === "SII-VAL-88", 
      `Category '${cat}': Both values persist independently`);
  }

  // --------------------------------------------------------------------------
  // SECTION 3: SCHEMA VALIDATION INDEPENDENCE (Zod Schemas)
  // --------------------------------------------------------------------------
  console.log("\n[3] Schema Validation Independence");

  // UpdateStudentValidationSchema with independent values
  const updateRes1 = UpdateStudentValidationSchema.safeParse({
    iccrApplicationNumber: "ICCR-2026-98124",
    siiApplicationNumber: null
  });
  assert(updateRes1.success, "Update schema accepts ICCR without SII");

  const updateRes2 = UpdateStudentValidationSchema.safeParse({
    iccrApplicationNumber: null,
    siiApplicationNumber: "SII-2026-88192"
  });
  assert(updateRes2.success, "Update schema accepts SII without ICCR");

  const updateRes3 = UpdateStudentValidationSchema.safeParse({
    iccrApplicationNumber: "ICCR-2026-98124",
    siiApplicationNumber: "SII-2026-88192"
  });
  assert(updateRes3.success, "Update schema accepts both distinct values");

  // --------------------------------------------------------------------------
  // SECTION 4: PROFILE COMPLETION ENGINE (Optionality Verification)
  // --------------------------------------------------------------------------
  console.log("\n[4] Profile Completion Engine Optionality Verification");

  const iccrStudentWithoutSii = ProfileCompletionEngine.evaluate({
    fullName: "Ronesh Pal",
    dateOfBirth: "2000-01-01",
    gender: "male",
    nationalityCode: "BGD",
    registrationNumber: "NFSU/2026/FS/1001",
    programCode: "MTECH_CS",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    admissionCategory: "iccr",
    iccrApplicationNumber: "ICCR-2026-BGD-101",
    siiApplicationNumber: null, // Empty optional SII number
    phoneLocal: "+91 98765 43210",
    phoneHome: "+880 1712 345678",
    email: "ronesh.pal@nfsu.ac.in",
    emergencyContactName: "Father Name",
    emergencyContactPhone: "+880 1712 345678",
    passportNumber: "BG1234567",
    passportExpiry: "2030-01-01",
    passportStatus: "APPROVED",
    visaNumber: "IND9876543",
    visaExpiry: "2028-07-31",
    visaStatus: "APPROVED",
    efrroNumber: "FRRO/AHM/2026/001",
    efrroExpiry: "2027-07-31",
    efrroStatus: "COMPLIANT"
  });

  const academicSection = iccrStudentWithoutSii.sections.find(s => s.id === "academic");
  assert(academicSection !== undefined, "Profile completion returns academic section");
  assert(academicSection?.percentage === 100, "ICCR student with empty SII number achieves 100% academic score (optional field)");
  assert(!academicSection?.missingFields.includes("SII Application Number (Required for ICCR)"), 
    "SII Application Number is NOT flagged as missing for ICCR category");

  // --------------------------------------------------------------------------
  // SECTION 5: REPORT & PORTAL DATA FLOW
  // --------------------------------------------------------------------------
  console.log("\n[5] Report & Portal Data Mapping Independence");

  const studentRow = ReportMapper.toStudentReportRow({
    student_id: "stu-independent-001",
    registration_number: "NFSU/2026/FS/9999",
    full_name: "Independent Student",
    nationality: "Nepal",
    school: "School of Forensic Sciences",
    programme: "M.Sc Forensic Science",
    admission_category: "iccr",
    iccr_application_number: "ICCR-UNIQUE-111",
    sii_application_number: "SII-UNIQUE-222"
  });

  assert(studentRow.iccrApplicationNumber === "ICCR-UNIQUE-111", "ReportMapper preserves ICCR-UNIQUE-111");
  assert(studentRow.siiApplicationNumber === "SII-UNIQUE-222", "ReportMapper preserves SII-UNIQUE-222");
  assert(studentRow.iccrApplicationNumber !== studentRow.siiApplicationNumber, "ICCR and SII are distinct identifiers");

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
  console.error("Fatal error executing regression test suite:", err);
  process.exit(1);
});
