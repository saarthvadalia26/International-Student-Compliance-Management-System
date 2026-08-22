import "./test-preload";
import { AcademicProgramService, DEFAULT_FALLBACK_PROGRAMS } from "../src/domain/academic-programs/academic-program.service";
import { normalizeAcademicLevel, getAcademicLevelLabel, isValidAcademicLevel } from "../src/domain/academic-programs/academic-level";
import { AcademicProgressionEngine } from "../src/domain/academic/services/semester-progression.service";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runAcademicProgramIntegrityTests() {
  console.log("=================================================================");
  console.log("  ISCMS ACADEMIC PROGRAM / COURSE NAME INTEGRITY AUDIT SUITE");
  console.log("=================================================================\n");

  const programService = new AcademicProgramService();

  // Test Case 1: Normal Postgraduate Course (e.g. M. Sc. Toxicology)
  console.log("--- Test Case 1: Normal PG Course (M. Sc. Toxicology) ---");
  const toxProg = await programService.getProgramByIdCodeOrName("MSC-TOX");
  assert(toxProg !== null, "Resolved program MSC-TOX from service");
  assert(toxProg?.programName === "M. Sc. Toxicology", "Full program name is exactly 'M. Sc. Toxicology'");
  assert(toxProg?.programCode === "MSC-TOX", "Program code is 'MSC-TOX'");
  assert(toxProg?.academicLevel === "PG", "Academic level is 'PG'");
  assert(getAcademicLevelLabel(toxProg?.academicLevel) === "Postgraduate (PG)", "Academic level label is 'Postgraduate (PG)'");
  assert(toxProg?.schoolName === "School of Pharmacy & Emerging Sciences", "School name is 'School of Pharmacy & Emerging Sciences'");
  assert(toxProg?.totalSemesters === 4, "Total semesters for PG Toxicology is 4");

  const toxByName = await programService.getProgramByIdCodeOrName("M. Sc. Toxicology");
  assert(toxByName !== null && toxByName.programCode === "MSC-TOX", "Lookup by full name 'M. Sc. Toxicology' matches MSC-TOX");

  // Test Case 2: Short Prefix Courses (Distinguishing M. Sc. courses)
  console.log("\n--- Test Case 2: Short Prefix Courses ---");
  const fsProg = await programService.getProgramByIdCodeOrName("MSC-FS");
  const csProg = await programService.getProgramByIdCodeOrName("MSC-CS");
  assert(fsProg?.programName === "M. Sc. Forensic Science", "MSC-FS resolves to 'M. Sc. Forensic Science'");
  assert(csProg?.programName === "M. Sc. Cyber Security", "MSC-CS resolves to 'M. Sc. Cyber Security'");
  assert(toxProg?.programName !== "M. Sc.", "M. Sc. Toxicology is not truncated to 'M. Sc.'");
  assert(fsProg?.programName !== "M. Sc.", "M. Sc. Forensic Science is not truncated to 'M. Sc.'");

  // Test Case 3: Long Course Names
  console.log("\n--- Test Case 3: Long Course Names ---");
  const dfisProg = await programService.getProgramByIdCodeOrName("MSC-DFIS");
  const mbaProg = await programService.getProgramByIdCodeOrName("MBA-CS");
  assert(dfisProg?.programName === "M.Sc. in Digital Forensics & Information Security", "Preserved complete title for M.Sc. in Digital Forensics & Information Security");
  assert(mbaProg?.programName === "Master of Business Administration (Cyber Security)", "Preserved complete title for Master of Business Administration (Cyber Security)");

  // Test Case 4: Integrated Courses Classification
  console.log("\n--- Test Case 4: Integrated Courses Classification ---");
  const crimInt = await programService.getProgramByIdCodeOrName("INT-BA-MA-CRIM");
  const cseInt = await programService.getProgramByIdCodeOrName("BTECH-MTECH-CSE");
  assert(crimInt?.programName === "Integrated B.A. + M.A. Criminology", "Resolved 'Integrated B.A. + M.A. Criminology'");
  assert(crimInt?.academicLevel === "INTEGRATED", "Academic level is canonical 'INTEGRATED'");
  assert(getAcademicLevelLabel(crimInt?.academicLevel) === "Integrated (UG + PG)", "Academic level label is 'Integrated (UG + PG)'");
  assert(crimInt?.totalSemesters === 10, "Integrated course has 10 semesters");
  assert(cseInt?.academicLevel === "INTEGRATED", "Dual B.Tech + M.Tech has level 'INTEGRATED'");
  assert(normalizeAcademicLevel("Integrated") === "INTEGRATED", "Normalized 'Integrated' to 'INTEGRATED'");
  assert(normalizeAcademicLevel("Integrated (UG + PG)") === "INTEGRATED", "Normalized 'Integrated (UG + PG)' to 'INTEGRATED'");
  assert(normalizeAcademicLevel("UG + PG") === "INTEGRATED", "Normalized 'UG + PG' to 'INTEGRATED'");

  // Test Case 5: Missing / Unspecified Academic Level Handling
  console.log("\n--- Test Case 5: Missing Academic Level Handling ---");
  assert(getAcademicLevelLabel(null) === "Not Specified", "Null academic level returns 'Not Specified'");
  assert(getAcademicLevelLabel(undefined) === "Not Specified", "Undefined academic level returns 'Not Specified'");
  assert(getAcademicLevelLabel("") === "Not Specified", "Empty academic level returns 'Not Specified'");
  assert(!isValidAcademicLevel(null), "Null is not a valid academic level");
  assert(!isValidAcademicLevel(""), "Empty string is not a valid academic level");

  // Test Case 6: Deterministic Program Code Normalization
  console.log("\n--- Test Case 6: Deterministic Program Code Normalization ---");
  const byHyphen = await programService.getProgramByIdCodeOrName("MSC-TOX");
  const byUnderscore = await programService.getProgramByIdCodeOrName("MSC_TOX");
  assert(byHyphen?.programName === "M. Sc. Toxicology", "Hyphen code 'MSC-TOX' matches 'M. Sc. Toxicology'");
  assert(byUnderscore?.programName === "M. Sc. Toxicology", "Underscore code 'MSC_TOX' matches 'M. Sc. Toxicology'");
  const nonExistent = await programService.getProgramByIdCodeOrName("NON_EXISTENT_COURSE_999");
  assert(nonExistent === null, "Unknown course code safely returns null without hallucinating");

  // Test Case 7: Bulk Excel Import Program Matching
  console.log("\n--- Test Case 7: Bulk Excel Import Program Matching ---");
  const validRows = [
    {
      "Full Name": "Test Student Toxicology",
      "Nationality": "FRA",
      "Academic Program": "M. Sc. Toxicology",
      "Academic Level": "Postgraduate (PG)",
      "Admission Date": "2026-08-01",
      "Passport Number": "FRPASS12345",
      "Passport Expiry": "2030-08-01",
      "Visa Number": "FRVISA12345",
      "Visa Expiry": "2028-08-01"
    }
  ];
  const validHeaders = Object.keys(validRows[0]);
  const validMapping = BulkStudentImportService.generateAutoMapping(validHeaders);
  const validation = await BulkStudentImportService.validateSpreadsheetData(validRows, validMapping, {
    academicPrograms: DEFAULT_FALLBACK_PROGRAMS.map(p => ({
      programName: p.programName,
      programCode: p.programCode || p.programName,
      totalSemesters: p.totalSemesters || 8,
      semesterDuration: p.semesterDuration || 6,
      semesterDurationUnit: p.semesterDurationUnit || "months",
      academicLevel: p.academicLevel || null
    }))
  });

  if (validation.rows[0].errors.length > 0) {
    console.log("Validation errors:", validation.rows[0].errors);
  }
  assert(validation.rows[0].status === "valid", "Valid import row with 'M. Sc. Toxicology' passed validation");
  assert(validation.rows[0].mappedData.academic_program === "M. Sc. Toxicology", "Mapped academic program preserved full title");
  assert(validation.rows[0].mappedData.academic_level === "PG", "Mapped academic level normalized to 'PG'");

  const invalidRows = [
    {
      "Full Name": "Test Student Invalid Course",
      "Nationality": "DEU",
      "Academic Program": "Completely Bogus Non-Existent University Course 999",
      "Admission Date": "2026-08-01"
    }
  ];
  const invalidHeaders = Object.keys(invalidRows[0]);
  const invalidMapping = BulkStudentImportService.generateAutoMapping(invalidHeaders);
  const invalidValidation = await BulkStudentImportService.validateSpreadsheetData(invalidRows, invalidMapping, {
    academicPrograms: DEFAULT_FALLBACK_PROGRAMS.map(p => ({
      programName: p.programName,
      programCode: p.programCode || p.programName,
      totalSemesters: p.totalSemesters || 8,
      semesterDuration: p.semesterDuration || 6,
      semesterDurationUnit: p.semesterDurationUnit || "months",
      academicLevel: p.academicLevel || null
    }))
  });
  assert(invalidValidation.errorCount > 0, "Invalid course name was flagged with errorCount > 0 in bulk import");
  assert(invalidValidation.rows[0].status === "error", "Invalid course name row marked with status 'error'");
  assert(invalidValidation.rows[0].errors.some(e => e.field === "academic_program"), "Error flagged on academic_program field");

  // Test Case 8: Academic Progression Duration & Graduation Calculation
  console.log("\n--- Test Case 8: Progression Calculation with Canonical Programs ---");
  const pgProgression = AcademicProgressionEngine.calculateProgression({
    admissionDate: "2026-08-01",
    courseConfig: {
      programName: "M. Sc. Toxicology",
      programCode: "MSC-TOX",
      totalSemesters: 4,
      semesterDuration: 6,
      semesterDurationUnit: "months"
    }
  });
  assert(pgProgression.totalSemesters === 4, "PG progression has 4 total semesters");
  assert(pgProgression.expectedGraduationDateISO === "2028-08-01", "2-year PG expected graduation is 2028-08-01");

  const intProgression = AcademicProgressionEngine.calculateProgression({
    admissionDate: "2026-08-01",
    courseConfig: {
      programName: "Integrated B.A. + M.A. Criminology",
      programCode: "INT-BA-MA-CRIM",
      totalSemesters: 10,
      semesterDuration: 6,
      semesterDurationUnit: "months"
    }
  });
  assert(intProgression.totalSemesters === 10, "Integrated progression has 10 total semesters");
  assert(intProgression.expectedGraduationDateISO === "2031-08-01", "5-year Integrated expected graduation is 2031-08-01");

  // Test Case 9: Master Fallback Integrity
  console.log("\n--- Test Case 9: Master Fallback Integrity ---");
  const expectedCodes = [
    "MSC-TOX", "MSC-FS", "MSC-CS", "MSC-DFIS", "MTECH-CS", "MA-PSS",
    "MBA-CS", "BSC-CRIM", "BSC-FS", "BTECH-CSE", "BTECH-AIDS",
    "INT-BA-MA-CRIM", "BTECH-MTECH-CSE", "PHD", "PGD-FPS", "PGD-FDE"
  ];
  for (const code of expectedCodes) {
    const found = DEFAULT_FALLBACK_PROGRAMS.find(p => p.programCode === code);
    assert(found !== undefined, `Course code '${code}' exists in DEFAULT_FALLBACK_PROGRAMS`);
    assert((found?.programName.length || 0) > 5, `Course code '${code}' has complete full name '${found?.programName}'`);
    assert(found?.academicLevel !== null && found?.academicLevel !== undefined, `Course code '${code}' has academicLevel`);
    assert(found?.schoolName !== null && found?.schoolName !== undefined, `Course code '${code}' has schoolName`);
  }

  console.log("\n=================================================================");
  console.log("  🎉 ALL 9 TEST SUITE GROUPS PASSED WITH 100% SUCCESS");
  console.log("=================================================================");
}

runAcademicProgramIntegrityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
