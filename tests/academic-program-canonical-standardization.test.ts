/**
 * ISCMS Academic Program Canonical Standardization Test Suite
 * Validates deterministic multi-tier program resolution, legacy alias dictionaries,
 * dashboard aggregation deduplication, bulk import validation, and cross-module consistency.
 */

import { 
  AcademicProgramService, 
  DEFAULT_FALLBACK_PROGRAMS, 
  LEGACY_PROGRAM_ALIASES 
} from "../src/domain/academic-programs/academic-program.service";
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
  console.log(" ISCMS ACADEMIC PROGRAM CANONICAL STANDARDIZATION TEST SUITE");
  console.log("============================================================\n");

  const programService = new AcademicProgramService();

  // --------------------------------------------------------------------------
  // 1. CANONICAL DEFAULT FALLBACK PROGRAMS
  // --------------------------------------------------------------------------
  console.log("[1] Canonical Default Fallback Programs");

  const foodProg = DEFAULT_FALLBACK_PROGRAMS.find(p => p.programCode === "MSC-FOOD");
  assert(
    !!foodProg && foodProg.programName === "M.Sc. Food Technology",
    "MSC-FOOD is present with canonical name 'M.Sc. Food Technology'"
  );

  const bbiProg = DEFAULT_FALLBACK_PROGRAMS.find(p => p.programCode === "MSC-BBI");
  assert(
    !!bbiProg && bbiProg.programName === "M.Sc. Forensic Biotechnology & Bioinformatics",
    "MSC-BBI is present with canonical name 'M.Sc. Forensic Biotechnology & Bioinformatics'"
  );

  const crimProg = DEFAULT_FALLBACK_PROGRAMS.find(p => p.programCode === "MA-CRIM");
  assert(
    !!crimProg && crimProg.programName === "M.A. Criminology",
    "MA-CRIM is present with canonical name 'M.A. Criminology'"
  );

  const praProg = DEFAULT_FALLBACK_PROGRAMS.find(p => p.programCode === "MA-PRA");
  assert(
    !!praProg && praProg.programName === "M.A. Police Administration",
    "MA-PRA is present with canonical name 'M.A. Police Administration'"
  );

  const toxProg = DEFAULT_FALLBACK_PROGRAMS.find(p => p.programCode === "MSC-TOX");
  assert(
    !!toxProg && toxProg.programName === "M. Sc. Toxicology",
    "MSC-TOX is present with canonical name 'M. Sc. Toxicology'"
  );

  // --------------------------------------------------------------------------
  // 2. AUTHORITATIVE LEGACY ALIAS DICTIONARY
  // --------------------------------------------------------------------------
  console.log("\n[2] Authoritative Legacy Alias Dictionary");

  assert(
    LEGACY_PROGRAM_ALIASES["MAPSS"] === "MA-PSS",
    "Alias 'MAPSS' maps to canonical code 'MA-PSS'"
  );
  assert(
    LEGACY_PROGRAM_ALIASES["MBBI"] === "MSC-BBI",
    "Alias 'MBBI' maps to canonical code 'MSC-BBI'"
  );
  assert(
    LEGACY_PROGRAM_ALIASES["MAC"] === "MA-CRIM",
    "Alias 'MAC' maps to canonical code 'MA-CRIM'"
  );
  assert(
    LEGACY_PROGRAM_ALIASES["MPRA"] === "MA-PRA",
    "Alias 'MPRA' maps to canonical code 'MA-PRA'"
  );
  assert(
    LEGACY_PROGRAM_ALIASES["M.SC. FOOD"] === "MSC-FOOD" || LEGACY_PROGRAM_ALIASES["M. SC. FOOD"] === "MSC-FOOD",
    "Alias 'M.Sc. Food' maps to canonical code 'MSC-FOOD'"
  );
  assert(
    LEGACY_PROGRAM_ALIASES["MSC_TOX"] === "MSC-TOX",
    "Alias 'MSC_TOX' maps to canonical code 'MSC-TOX'"
  );

  // --------------------------------------------------------------------------
  // 3. DETERMINISTIC MULTI-TIER CANONICAL RESOLVER
  // --------------------------------------------------------------------------
  console.log("\n[3] Deterministic Multi-Tier Canonical Resolver");

  // A. Resolution by exact code
  const resByCode = await programService.resolveCanonicalProgram("MSC-TOX");
  assert(
    resByCode?.programName === "M. Sc. Toxicology" && resByCode.programCode === "MSC-TOX",
    "Resolves exact program_code 'MSC-TOX' to 'M. Sc. Toxicology'"
  );

  // B. Resolution by code variation (hyphen/underscore)
  const resByUnderscore = await programService.resolveCanonicalProgram("MSC_TOX");
  assert(
    resByUnderscore?.programName === "M. Sc. Toxicology",
    "Resolves underscore variation 'MSC_TOX' to 'M. Sc. Toxicology'"
  );

  // C. Resolution by legacy abbreviation / acronym
  const resMapss = await programService.resolveCanonicalProgram("MAPSS");
  assert(
    resMapss?.programName === "M.A. Police & Security Studies" && resMapss.programCode === "MA-PSS",
    "Resolves legacy acronym 'MAPSS' to canonical 'M.A. Police & Security Studies' (MA-PSS)"
  );

  const resMbbi = await programService.resolveCanonicalProgram("MBBI");
  assert(
    resMbbi?.programName === "M.Sc. Forensic Biotechnology & Bioinformatics" && resMbbi.programCode === "MSC-BBI",
    "Resolves legacy acronym 'MBBI' to canonical 'M.Sc. Forensic Biotechnology & Bioinformatics' (MSC-BBI)"
  );

  const resMac = await programService.resolveCanonicalProgram("MAC");
  assert(
    resMac?.programName === "M.A. Criminology" && resMac.programCode === "MA-CRIM",
    "Resolves legacy acronym 'MAC' to canonical 'M.A. Criminology' (MA-CRIM)"
  );

  const resMpra = await programService.resolveCanonicalProgram("MPRA");
  assert(
    resMpra?.programName === "M.A. Police Administration" && resMpra.programCode === "MA-PRA",
    "Resolves legacy acronym 'MPRA' to canonical 'M.A. Police Administration' (MA-PRA)"
  );

  const resFoodShorthand = await programService.resolveCanonicalProgram("M.Sc. Food");
  assert(
    resFoodShorthand?.programName === "M.Sc. Food Technology" && resFoodShorthand.programCode === "MSC-FOOD",
    "Resolves shorthand 'M.Sc. Food' to canonical 'M.Sc. Food Technology' (MSC-FOOD)"
  );

  // D. Resolution by exact name and punctuation normalization
  const resByName = await programService.resolveCanonicalProgram("M. Sc. Toxicology");
  assert(
    resByName?.programCode === "MSC-TOX",
    "Resolves full exact name 'M. Sc. Toxicology' to 'MSC-TOX'"
  );

  const resByNameNormalized = await programService.resolveCanonicalProgram("M.Sc. Toxicology");
  assert(
    resByNameNormalized?.programCode === "MSC-TOX",
    "Resolves period/space normalized name 'M.Sc. Toxicology' to 'MSC-TOX'"
  );

  // E. Fallback for unresolvable program (must not hallucinate)
  const resUnknown = await programService.resolveCanonicalProgram("Non-Existent Degree Program 12345");
  assert(
    resUnknown === null,
    "Returns null for unresolvable program string without guessing"
  );

  // --------------------------------------------------------------------------
  // 4. BULK IMPORT PROGRAM VALIDATION & ALIAS RECOGNITION
  // --------------------------------------------------------------------------
  console.log("\n[4] Bulk Import Program Validation & Alias Recognition");

  // Valid Excel rows with canonical, legacy abbreviations, and full names
  const testRows = [
    { registration_number: "TEST-001", full_name: "Student One", email: "s1@test.edu", academic_program: "MAPSS", nationality: "IND" },
    { registration_number: "TEST-002", full_name: "Student Two", email: "s2@test.edu", academic_program: "MBBI", nationality: "IND" },
    { registration_number: "TEST-003", full_name: "Student Three", email: "s3@test.edu", academic_program: "M.Sc. Food", nationality: "IND" },
    { registration_number: "TEST-004", full_name: "Student Four", email: "s4@test.edu", academic_program: "M. Sc. Toxicology", nationality: "IND" },
    { registration_number: "TEST-005", full_name: "Student Five", email: "s5@test.edu", academic_program: "MSC-TOX", nationality: "IND" },
  ];

  const validationResult = await BulkStudentImportService.validateSpreadsheetData(
    testRows,
    {
      registration_number: "registration_number",
      full_name: "full_name",
      email: "email",
      academic_program: "academic_program",
      nationality: "nationality"
    }
  );

  const progErrors = validationResult.rows.flatMap(r => r.errors).filter(e => e.field === "academic_program");
  assert(
    progErrors.length === 0,
    `Excel bulk import accepts canonical, legacy alias, and full names without errors (found ${progErrors.length} errors)`
  );

  // --------------------------------------------------------------------------
  // 5. DASHBOARD COURSE AGGREGATION & DEDUPLICATION SIMULATION
  // --------------------------------------------------------------------------
  console.log("\n[5] Dashboard Course Aggregation & Deduplication Simulation");

  // Simulated student_academic records with mixed codes, aliases, names, and program_ids
  const sampleAcademicRecords = [
    { program_id: "prog-msc-tox", program_code: "MSC-TOX" },
    { program_id: null, program_code: "MSC_TOX" },
    { program_id: null, program_code: "M. Sc. Toxicology" },
    { program_id: null, program_code: "M.Sc. Toxicology" },
    { program_id: null, program_code: "MAPSS" },
    { program_id: "prog-ma-pss", program_code: "MA-PSS" },
    { program_id: null, program_code: "MBBI" },
    { program_id: null, program_code: "M.Sc. Food" },
    { program_id: "prog-msc-food", program_code: "MSC-FOOD" },
  ];

  // Emulate the dashboard aggregation logic
  const programMap: Record<string, { id: string; name: string }> = {};
  const normMap: Record<string, { id: string; name: string }> = {};

  function norm(n: string): string {
    return n.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  DEFAULT_FALLBACK_PROGRAMS.forEach(p => {
    const meta = { id: p.id, name: p.programName };
    if (p.id) programMap[p.id.toLowerCase()] = meta;
    if (p.programCode) {
      programMap[p.programCode.toLowerCase()] = meta;
      programMap[p.programCode.replace(/_/g, "-").toLowerCase()] = meta;
    }
    if (p.programName) {
      programMap[p.programName.toLowerCase()] = meta;
      normMap[norm(p.programName)] = meta;
    }
  });

  Object.entries(LEGACY_PROGRAM_ALIASES).forEach(([alias, targetCode]) => {
    const meta = programMap[targetCode.toLowerCase()];
    if (meta) {
      programMap[alias.toLowerCase()] = meta;
    }
  });

  const courseCounts: Record<string, number> = {};

  sampleAcademicRecords.forEach(row => {
    const rawId = (row.program_id || "").toLowerCase();
    const rawCode = (row.program_code || "").trim();

    let meta = rawId ? programMap[rawId] : undefined;
    if (!meta && rawCode) {
      meta = programMap[rawCode.toLowerCase()] 
        || programMap[rawCode.replace(/_/g, "-").toLowerCase()]
        || normMap[norm(rawCode)];
    }

    const courseName = meta?.name || row.program_code || "General Studies";
    courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
  });

  // All 4 Toxicology representations must merge into 1 entry with value 4
  assert(
    courseCounts["M. Sc. Toxicology"] === 4,
    `Tox records (MSC-TOX, MSC_TOX, M. Sc. Toxicology, M.Sc. Toxicology) aggregated into single 'M. Sc. Toxicology' entry with count 4 (got ${courseCounts["M. Sc. Toxicology"]})`
  );

  // Both MAPSS & MA-PSS merge into 1 entry with value 2
  assert(
    courseCounts["M.A. Police & Security Studies"] === 2,
    `MAPSS and MA-PSS records aggregated into single 'M.A. Police & Security Studies' with count 2 (got ${courseCounts["M.A. Police & Security Studies"]})`
  );

  // MBBI resolves to canonical name
  assert(
    courseCounts["M.Sc. Forensic Biotechnology & Bioinformatics"] === 1,
    `MBBI record aggregated into 'M.Sc. Forensic Biotechnology & Bioinformatics'`
  );

  // M.Sc. Food and MSC-FOOD merge into 1 entry with value 2
  assert(
    courseCounts["M.Sc. Food Technology"] === 2,
    `M.Sc. Food and MSC-FOOD records aggregated into single 'M.Sc. Food Technology' with count 2 (got ${courseCounts["M.Sc. Food Technology"]})`
  );

  // There should be NO raw code entries in the aggregated map keys
  const keys = Object.keys(courseCounts);
  assert(
    !keys.includes("MSC-TOX") && !keys.includes("MAPSS") && !keys.includes("MBBI") && !keys.includes("MSC_TOX"),
    "No raw codes (MSC-TOX, MAPSS, MBBI, MSC_TOX) present as primary dashboard labels"
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
  console.error("Test execution failed:", err);
  process.exit(1);
});
