/**
 * ISCMS Integrated Academic Level & Course Progression Test Suite
 * Tests canonical Academic Level domain module, normalization, course configuration,
 * dynamic progression without hardcoded durations, Excel bulk import, and report exports.
 */

import { 
  normalizeAcademicLevel, 
  getAcademicLevelLabel, 
  isValidAcademicLevel, 
  ACADEMIC_LEVEL_OPTIONS 
} from "../src/domain/academic-programs/academic-level";
import { AcademicProgressionEngine } from "../src/domain/academic/services/semester-progression.service";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";
import { ExporterService } from "../src/domain/reports/services/exporters";

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
  console.log(" ISCMS INTEGRATED (UG + PG) ACADEMIC LEVEL TEST SUITE");
  console.log("============================================================\n");

  // --------------------------------------------------------------------------
  // 1. CANONICAL ACADEMIC LEVEL OPTIONS & LABELS
  // --------------------------------------------------------------------------
  console.log("[1] Canonical Academic Level Options & Labels");

  assert(
    ACADEMIC_LEVEL_OPTIONS.length === 5,
    "ACADEMIC_LEVEL_OPTIONS contains exactly 5 canonical levels"
  );

  const integratedOpt = ACADEMIC_LEVEL_OPTIONS.find(o => o.canonicalCode === "INTEGRATED");
  assert(
    !!integratedOpt && integratedOpt.label === "Integrated (UG + PG)",
    "Integrated option has canonicalCode 'INTEGRATED' and label 'Integrated (UG + PG)'"
  );

  assert(
    getAcademicLevelLabel("INTEGRATED") === "Integrated (UG + PG)",
    "getAcademicLevelLabel('INTEGRATED') returns 'Integrated (UG + PG)'"
  );

  assert(
    getAcademicLevelLabel("UG") === "Undergraduate (UG)",
    "getAcademicLevelLabel('UG') returns 'Undergraduate (UG)'"
  );

  assert(
    getAcademicLevelLabel("PG") === "Postgraduate (PG)",
    "getAcademicLevelLabel('PG') returns 'Postgraduate (PG)'"
  );

  assert(
    getAcademicLevelLabel("PhD") === "Doctorate (PhD)",
    "getAcademicLevelLabel('PhD') returns 'Doctorate (PhD)'"
  );

  assert(
    getAcademicLevelLabel("Diploma") === "Diploma / Cert",
    "getAcademicLevelLabel('Diploma') returns 'Diploma / Cert'"
  );

  // --------------------------------------------------------------------------
  // 2. NORMALIZATION & ALIAS RESOLUTION
  // --------------------------------------------------------------------------
  console.log("\n[2] Normalization & Alias Resolution");

  const integratedAliases = [
    "Integrated (UG + PG)",
    "Integrated",
    "Integrated UG PG",
    "Integrated (UG+PG)",
    "integrated ug+pg",
    "UG + PG",
    "UG+PG",
    "ug pg",
    "integrated course",
    "integrated program",
    "INTEGRATED"
  ];

  for (const alias of integratedAliases) {
    assert(
      normalizeAcademicLevel(alias) === "INTEGRATED",
      `Alias "${alias}" normalizes to "INTEGRATED"`
    );
    assert(
      isValidAcademicLevel(alias) === true,
      `Alias "${alias}" is recognized as valid`
    );
  }

  // UG Aliases
  assert(normalizeAcademicLevel("Undergraduate") === "UG", "Undergraduate normalizes to UG");
  assert(normalizeAcademicLevel("Bachelors") === "UG", "Bachelors normalizes to UG");
  assert(normalizeAcademicLevel("undergrad") === "UG", "undergrad normalizes to UG");

  // PG Aliases
  assert(normalizeAcademicLevel("Postgraduate") === "PG", "Postgraduate normalizes to PG");
  assert(normalizeAcademicLevel("Masters") === "PG", "Masters normalizes to PG");
  assert(normalizeAcademicLevel("postgrad") === "PG", "postgrad normalizes to PG");

  // PhD Aliases
  assert(normalizeAcademicLevel("Doctorate") === "PhD", "Doctorate normalizes to PhD");
  assert(normalizeAcademicLevel("Doctor of Philosophy") === "PhD", "Doctor of Philosophy normalizes to PhD");

  // Diploma Aliases
  assert(normalizeAcademicLevel("Diploma / Cert") === "Diploma", "Diploma / Cert normalizes to Diploma");
  assert(normalizeAcademicLevel("Certificate") === "Diploma", "Certificate normalizes to Diploma");

  // Invalid values
  const invalidLevels = ["High School", "Primary", "Kindergarten", "Random String", "12345", ""];
  for (const invalid of invalidLevels) {
    assert(
      normalizeAcademicLevel(invalid) === null,
      `Invalid level "${invalid}" normalizes to null`
    );
    assert(
      isValidAcademicLevel(invalid) === false,
      `Invalid level "${invalid}" is recognized as invalid`
    );
  }

  // --------------------------------------------------------------------------
  // 3. COURSE MANAGEMENT & DYNAMIC PROGRESSION (NO HARDCODED DURATIONS)
  // --------------------------------------------------------------------------
  console.log("\n[3] Dynamic Semester Progression for Integrated Courses");

  // Scenario A: 5-Year (10-Semester) Integrated B.Tech + M.Tech Program
  const fiveYearProgConfig = {
    programName: "B.Tech + M.Tech Computer Science & Engineering",
    programCode: "BTECH_MTECH_CSE",
    totalSemesters: 10,
    semesterDuration: 6,
    semesterDurationUnit: "months" as const
  };

  // Student admitted 2 years ago (should be in Semester 5 of 10)
  const admissionDateA = new Date();
  admissionDateA.setMonth(admissionDateA.getMonth() - 24); // 24 months = 4 semesters completed, now in sem 5

  const progressionA = AcademicProgressionEngine.calculateProgression({
    admissionDate: admissionDateA.toISOString(),
    courseConfig: fiveYearProgConfig
  });

  assert(
    progressionA.totalSemesters === 10,
    "5-Year Integrated course correctly reports totalSemesters = 10"
  );
  assert(
    progressionA.currentSemester === 5,
    `Admitted 24 months ago calculates to Semester 5 of 10 (actual: Semester ${progressionA.currentSemester})`
  );
  assert(
    !progressionA.isCompleted,
    "Semester 5 of 10 is not completed"
  );

  // Scenario B: 6-Year (12-Semester) Dual Degree Program
  const sixYearProgConfig = {
    programName: "B.Sc + M.Sc + Research in Cyber Forensics",
    programCode: "BSC_MSC_RESEARCH",
    totalSemesters: 12,
    semesterDuration: 6,
    semesterDurationUnit: "months" as const
  };

  const admissionDateB = new Date();
  admissionDateB.setMonth(admissionDateB.getMonth() - 66); // 66 months = 11 semesters completed, in final semester 12

  const progressionB = AcademicProgressionEngine.calculateProgression({
    admissionDate: admissionDateB.toISOString(),
    courseConfig: sixYearProgConfig
  });

  assert(
    progressionB.totalSemesters === 12,
    "6-Year Integrated course correctly reports totalSemesters = 12"
  );
  assert(
    progressionB.currentSemester === 12,
    `Admitted 66 months ago calculates to final Semester 12 of 12 (actual: Semester ${progressionB.currentSemester})`
  );
  assert(
    progressionB.isFinalSemester === true,
    "Semester 12 of 12 is correctly marked as isFinalSemester"
  );

  // Scenario C: 4-Year (8-Semester) Standard UG Program (Existing Courses Preserved)
  const fourYearProgConfig = {
    programName: "B.Tech in Computer Science & Engineering",
    programCode: "BTECH_CSE",
    totalSemesters: 8,
    semesterDuration: 6,
    semesterDurationUnit: "months" as const
  };

  const admissionDateC = new Date();
  admissionDateC.setMonth(admissionDateC.getMonth() - 12); // 12 months = in Semester 3

  const progressionC = AcademicProgressionEngine.calculateProgression({
    admissionDate: admissionDateC.toISOString(),
    courseConfig: fourYearProgConfig
  });

  assert(
    progressionC.totalSemesters === 8 && progressionC.currentSemester === 3,
    "Existing 4-Year UG Course behaves consistently without alteration"
  );

  // --------------------------------------------------------------------------
  // 4. EXCEL BULK IMPORT VALIDATION & NORMALIZATION
  // --------------------------------------------------------------------------
  console.log("\n[4] Excel Bulk Import Validation & Normalization");

  const mockPrograms = [
    {
      programName: "B.Tech + M.Tech in Computer Science & Engineering",
      programCode: "BTECH_MTECH_CSE",
      totalSemesters: 10,
      semesterDuration: 6,
      semesterDurationUnit: "months",
      academicLevel: "INTEGRATED"
    },
    {
      programName: "B.Tech in Computer Science & Engineering",
      programCode: "BTECH_CSE",
      totalSemesters: 8,
      semesterDuration: 6,
      semesterDurationUnit: "months",
      academicLevel: "UG"
    }
  ];

  // Case 1: Valid Import with explicit Academic Level "Integrated (UG + PG)"
  const validIntegratedRows = [
    {
      registration_number: "NFSU-INT-2026-001",
      full_name: "Alice International",
      nationality: "Nepal",
      academic_program: "BTECH_MTECH_CSE",
      academic_level: "Integrated (UG + PG)",
      admission_date: "2024-08-01",
      email: "alice.int@nfsu.ac.in",
      phone_home: "+977-9801234567"
    }
  ];

  const report1 = await BulkStudentImportService.validateSpreadsheetData(
    validIntegratedRows,
    {
      registration_number: "registration_number",
      full_name: "full_name",
      nationality: "nationality",
      academic_program: "academic_program",
      academic_level: "academic_level",
      admission_date: "admission_date",
      email: "email",
      phone_home: "phone_home"
    },
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: mockPrograms
    }
  );

  assert(
    report1.validCount === 1 && report1.errorCount === 0,
    "Valid row with 'Integrated (UG + PG)' passes validation with 0 errors"
  );
  assert(
    report1.rows[0].mappedData.academic_level === "INTEGRATED",
    "Imported row academic_level is normalized to 'INTEGRATED'"
  );

  // Case 2: Import with Alias "UG + PG"
  const aliasRows = [
    {
      registration_number: "NFSU-INT-2026-002",
      full_name: "Bob International",
      nationality: "Bhutan",
      academic_program: "BTECH_MTECH_CSE",
      academic_level: "UG + PG",
      admission_date: "2024-08-01",
      email: "bob.int@nfsu.ac.in",
      phone_home: "+975-17123456"
    }
  ];

  const report2 = await BulkStudentImportService.validateSpreadsheetData(
    aliasRows,
    {
      registration_number: "registration_number",
      full_name: "full_name",
      nationality: "nationality",
      academic_program: "academic_program",
      academic_level: "academic_level",
      admission_date: "admission_date",
      email: "email",
      phone_home: "phone_home"
    },
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: mockPrograms
    }
  );

  assert(
    report2.validCount === 1 && report2.rows[0].mappedData.academic_level === "INTEGRATED",
    "Alias 'UG + PG' in bulk import resolves and normalizes to 'INTEGRATED'"
  );

  // Case 3: Invalid Academic Level in spreadsheet should throw a clear validation error
  const invalidRows = [
    {
      registration_number: "NFSU-INT-2026-003",
      full_name: "Charlie Invalid",
      nationality: "Sri Lanka",
      academic_program: "BTECH_MTECH_CSE",
      academic_level: "HighSchool Certificate",
      admission_date: "2024-08-01",
      email: "charlie.inv@nfsu.ac.in",
      phone_home: "+94-771234567"
    }
  ];

  const report3 = await BulkStudentImportService.validateSpreadsheetData(
    invalidRows,
    {
      registration_number: "registration_number",
      full_name: "full_name",
      nationality: "nationality",
      academic_program: "academic_program",
      academic_level: "academic_level",
      admission_date: "admission_date",
      email: "email",
      phone_home: "phone_home"
    },
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: mockPrograms
    }
  );

  assert(
    report3.errorCount === 1,
    "Invalid academic level 'HighSchool Certificate' triggers validation error"
  );
  const errorItem = report3.rows[0].errors.find(e => e.field === "academic_level");
  assert(
    !!errorItem && errorItem.problem.includes("Unsupported academic level"),
    `Error message clearly informs user: "${errorItem?.problem}"`
  );

  // Case 4: Omitted academic_level inherits matched program's level
  const omittedLevelRows = [
    {
      registration_number: "NFSU-INT-2026-004",
      full_name: "David Omitted",
      nationality: "Mauritius",
      academic_program: "BTECH_MTECH_CSE",
      admission_date: "2024-08-01",
      email: "david.omitted@nfsu.ac.in",
      phone_home: "+230-58123456"
    }
  ];

  const report4 = await BulkStudentImportService.validateSpreadsheetData(
    omittedLevelRows,
    {
      registration_number: "registration_number",
      full_name: "full_name",
      nationality: "nationality",
      academic_program: "academic_program",
      admission_date: "admission_date",
      email: "email",
      phone_home: "phone_home"
    },
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: mockPrograms
    }
  );

  assert(
    report4.validCount === 1 && report4.rows[0].mappedData.academic_level === "INTEGRATED",
    "Omitted academic_level column correctly defaults to matched program's 'INTEGRATED' level"
  );

  // --------------------------------------------------------------------------
  // 5. REPORTING & EXPORT FORMATTING
  // --------------------------------------------------------------------------
  console.log("\n[5] Reporting & Export Formatting");

  const reportHeaders = [
    "Registration Number",
    "Full Name",
    "Nationality",
    "School",
    "Programme",
    "Academic Level",
    "Expected Graduation",
    "Status",
    "Compliance Status"
  ];

  const reportRows = [
    [
      "NFSU-2026-001",
      "Alice International",
      "Nepal",
      "School of Cyber Security",
      "B.Tech + M.Tech Computer Science",
      getAcademicLevelLabel("INTEGRATED"),
      "2029-06-30",
      "active",
      "COMPLIANT"
    ],
    [
      "NFSU-2026-002",
      "Bob Undergrad",
      "Bhutan",
      "School of Engineering",
      "B.Tech CSE",
      getAcademicLevelLabel("UG"),
      "2028-06-30",
      "active",
      "COMPLIANT"
    ]
  ];

  const csvContent = ExporterService.exportToCsv(reportHeaders, reportRows);
  assert(
    csvContent.includes("Academic Level") && csvContent.includes("Integrated (UG + PG)"),
    "CSV export output includes 'Academic Level' header and 'Integrated (UG + PG)' row values"
  );

  const excelContent = ExporterService.exportToExcel(reportHeaders, reportRows);
  assert(
    excelContent.includes("Integrated (UG + PG)") && excelContent.includes("Undergraduate (UG)"),
    "Excel export output contains properly formatted academic level display labels"
  );

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
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
