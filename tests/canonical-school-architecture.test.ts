/**
 * ISCMS Canonical School / Department Architecture Test Suite
 * Validates canonical School master data, academic program linkage,
 * student school inheritance, administrative overrides, bulk import resolution,
 * and report/dashboard consistency.
 */

import { SchoolService, DEFAULT_FALLBACK_SCHOOLS } from "../src/domain/schools/school.service";
import { AcademicProgramService, DEFAULT_FALLBACK_PROGRAMS } from "../src/domain/academic-programs/academic-program.service";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";

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
  console.log(" ISCMS CANONICAL SCHOOL / DEPARTMENT ARCHITECTURE TEST SUITE");
  console.log("============================================================\n");

  const schoolService = new SchoolService();
  const programService = new AcademicProgramService();

  // --------------------------------------------------------------------------
  // 1. CANONICAL SCHOOL MASTER DATA & FALLBACKS
  // --------------------------------------------------------------------------
  console.log("[1] Canonical University Schools Master Data");

  assert(
    DEFAULT_FALLBACK_SCHOOLS.length >= 8,
    `Seeded at least 8 canonical schools (found: ${DEFAULT_FALLBACK_SCHOOLS.length})`
  );

  const schoolCodes = DEFAULT_FALLBACK_SCHOOLS.map(s => s.code);
  assert(schoolCodes.includes("SPES"), "Contains 'SPES' (School of Pharmacy & Emerging Sciences)");
  assert(schoolCodes.includes("SFS"), "Contains 'SFS' (School of Forensic Sciences)");
  assert(schoolCodes.includes("SCSDF"), "Contains 'SCSDF' (School of Cyber Security & Digital Forensics)");
  assert(schoolCodes.includes("SMS"), "Contains 'SMS' (School of Management Studies)");
  assert(schoolCodes.includes("SCBS"), "Contains 'SCBS' (School of Criminology & Behavioral Sciences)");
  assert(schoolCodes.includes("SET"), "Contains 'SET' (School of Engineering & Technology)");
  assert(schoolCodes.includes("DRP"), "Contains 'DRP' (Doctoral Research Programme)");

  const spes = await schoolService.getSchoolByCodeOrName("SPES");
  assert(
    spes !== null && spes.name === "School of Pharmacy & Emerging Sciences",
    "SchoolService.getSchoolByCodeOrName('SPES') returns correct canonical School"
  );

  const spesByName = await schoolService.getSchoolByCodeOrName("School of Pharmacy & Emerging Sciences");
  assert(
    spesByName !== null && spesByName.code === "SPES",
    "SchoolService.getSchoolByCodeOrName by full name returns SPES"
  );

  const spesById = await schoolService.getSchoolById("school-spes");
  assert(
    spesById !== null && spesById.name === "School of Pharmacy & Emerging Sciences",
    "SchoolService.getSchoolById('school-spes') resolves correctly"
  );

  // --------------------------------------------------------------------------
  // 2. ACADEMIC PROGRAM TO CANONICAL SCHOOL LINKAGE
  // --------------------------------------------------------------------------
  console.log("\n[2] Academic Program to Canonical School Association");

  const validSchoolIds = new Set(DEFAULT_FALLBACK_SCHOOLS.map(s => s.id));
  let allLinked = true;
  DEFAULT_FALLBACK_PROGRAMS.forEach(prog => {
    if (!prog.schoolId || !validSchoolIds.has(prog.schoolId) || !prog.schoolName) {
      allLinked = false;
    }
  });
  assert(allLinked, "All fallback academic programs are linked to valid canonical schoolId & schoolName");

  const toxProg = await programService.getProgramByIdCodeOrName("MSC-TOX");
  assert(
    toxProg !== null &&
    toxProg.programName === "M. Sc. Toxicology" &&
    toxProg.schoolId === "school-spes" &&
    toxProg.schoolName === "School of Pharmacy & Emerging Sciences" &&
    toxProg.academicLevel === "PG",
    "MSC-TOX maps to 'School of Pharmacy & Emerging Sciences' (PG)"
  );

  const btechProg = await programService.getProgramByIdCodeOrName("BTECH-CSE");
  assert(
    btechProg !== null &&
    btechProg.programName === "B.Tech in Computer Science & Engineering" &&
    btechProg.schoolId === "school-set" &&
    btechProg.schoolName === "School of Engineering & Technology" &&
    btechProg.academicLevel === "UG",
    "BTECH-CSE maps to 'School of Engineering & Technology' (UG)"
  );

  // --------------------------------------------------------------------------
  // 3. STUDENT SCHOOL RESOLUTION & ADMINISTRATIVE OVERRIDE LOGIC
  // --------------------------------------------------------------------------
  console.log("\n[3] Student School Resolution & Administrative Override");

  // Standard student: No override
  const stdRecord = {
    program_id: toxProg!.id,
    program_code: toxProg!.programCode,
    override_school_id: null,
    school_override_reason: null
  };

  const stdIsOverridden = Boolean(stdRecord.override_school_id);
  let stdSchool = toxProg?.schoolName || "Not assigned yet";
  if (stdIsOverridden && stdRecord.override_school_id) {
    const custom = await schoolService.getSchoolById(stdRecord.override_school_id);
    if (custom) stdSchool = custom.name;
  }

  assert(
    stdIsOverridden === false && stdSchool === "School of Pharmacy & Emerging Sciences",
    "Standard student automatically inherits canonical school from Academic Program"
  );

  // Overridden student: Administrative override active
  const ovrRecord = {
    program_id: toxProg!.id,
    program_code: toxProg!.programCode,
    override_school_id: "school-sfs",
    school_override_reason: "Specialized Forensic Toxicology interdisciplinary lab assignment authorized by Dean"
  };

  const ovrIsOverridden = Boolean(ovrRecord.override_school_id);
  let ovrSchool = toxProg?.schoolName || "Not assigned yet";
  if (ovrIsOverridden && ovrRecord.override_school_id) {
    const custom = await schoolService.getSchoolById(ovrRecord.override_school_id);
    if (custom) ovrSchool = custom.name;
  }

  assert(
    ovrIsOverridden === true && 
    ovrSchool === "School of Forensic Sciences" &&
    ovrRecord.school_override_reason.length > 0,
    "Overridden student resolves to custom School of Forensic Sciences with audit reason"
  );

  // --------------------------------------------------------------------------
  // 4. BULK EXCEL IMPORT INTEGRATION
  // --------------------------------------------------------------------------
  console.log("\n[4] Bulk Excel Import School Derivation & Validation");

  const testRow = {
    "Registration Number": "NFSU-2026-TOX-01",
    "Full Name": "Ronesh Pal",
    "Nationality": "Nepal",
    "Program": "M. Sc. Toxicology"
  };

  const autoMapping = BulkStudentImportService.generateAutoMapping(Object.keys(testRow));
  assert(
    autoMapping["Registration Number"] === "registration_number" &&
    autoMapping["Full Name"] === "full_name" &&
    autoMapping["Program"] === "academic_program",
    "Auto-mapping detects registration_number, full_name, and academic_program"
  );

  const importValidation = await BulkStudentImportService.validateSpreadsheetData(
    [testRow],
    autoMapping,
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: DEFAULT_FALLBACK_PROGRAMS
    }
  );

  assert(importValidation.validCount === 1, "Validation passes for single test student");
  assert(
    importValidation.rows[0].mappedData.academic_program === "M. Sc. Toxicology",
    "Import maps to canonical program name 'M. Sc. Toxicology'"
  );
  assert(
    importValidation.rows[0].mappedData.school === "School of Pharmacy & Emerging Sciences",
    "Import automatically inherits canonical school 'School of Pharmacy & Emerging Sciences'"
  );
  assert(
    importValidation.rows[0].mappedData.academic_level === "PG" || importValidation.rows[0].mappedData.academic_level === "Postgraduate (PG)",
    "Import automatically inherits canonical level 'PG' / 'Postgraduate (PG)'"
  );

  // Test conflicting school column in spreadsheet
  const conflictRow = {
    "Registration Number": "NFSU-2026-TOX-02",
    "Full Name": "Jane Doe",
    "Program": "M. Sc. Toxicology",
    "School": "Arbitrary Department String"
  };

  const conflictMapping = {
    "Registration Number": "registration_number" as const,
    "Full Name": "full_name" as const,
    "Program": "academic_program" as const,
    "School": "school" as const
  };

  const conflictValidation = await BulkStudentImportService.validateSpreadsheetData(
    [conflictRow],
    conflictMapping,
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: DEFAULT_FALLBACK_PROGRAMS
    }
  );

  assert(conflictValidation.validCount === 1, "Conflict row remains valid");
  assert(
    conflictValidation.rows[0].mappedData.school === "School of Pharmacy & Emerging Sciences",
    "Conflicting school column is overridden by canonical program school"
  );
  const schoolWarn = conflictValidation.rows[0].warnings.find(w => w.field === "school");
  assert(
    schoolWarn !== undefined && schoolWarn.warning.includes("canonically mapped"),
    "Emits explanatory warning about canonical mapping"
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(` RESULTS: ${passedTests} passed, ${failedTests} failed`);
  console.log("------------------------------------------------------------\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Execution Error:", err);
  process.exit(1);
});
