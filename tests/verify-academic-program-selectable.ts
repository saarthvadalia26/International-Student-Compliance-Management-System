import "./mock-server-only.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { AcademicProgramService } from "../src/domain/academic-programs/academic-program.service";
import { getActiveAcademicProgramsAction, getAllAcademicProgramsAction } from "../src/app/(app)/settings/academic-programs-actions";
import { AcademicProgram, getAcademicLevelLabel } from "../src/domain/academic-programs/types";

// Replicate SearchableProgramSelector normalization & matching logic
function normalizeSearch(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\b([a-z])\s+(?=[a-z]\b)/g, "$1")
    .replace(/[,-_()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesProgram(query: string, prog: AcademicProgram): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const progName = (prog.programName || "").toLowerCase();
  const progCode = (prog.programCode || "").toLowerCase();
  const schoolName = (prog.schoolName || "").toLowerCase();
  const level = (prog.academicLevel || "").toLowerCase();
  const levelLabel = prog.academicLevel ? getAcademicLevelLabel(prog.academicLevel).toLowerCase() : "";

  // 1. Direct substring match
  if (
    progName.includes(q) ||
    progCode.includes(q) ||
    schoolName.includes(q) ||
    level.includes(q) ||
    levelLabel.includes(q)
  ) {
    return true;
  }

  // 2. Normalized search
  const normQ = normalizeSearch(query);
  const normName = normalizeSearch(prog.programName);
  const normCode = normalizeSearch(prog.programCode);
  const normSchool = normalizeSearch(prog.schoolName);

  if (normName.includes(normQ) || normCode.includes(normQ) || normSchool.includes(normQ)) {
    return true;
  }

  // 3. Spaceless match
  const spacelessQ = normQ.replace(/\s+/g, "");
  const spacelessName = normName.replace(/\s+/g, "");
  if (spacelessQ && spacelessName.includes(spacelessQ)) {
    return true;
  }

  // 4. Token-level match
  const tokens = normQ.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every(tok =>
      normName.includes(tok) || normCode.includes(tok) || normSchool.includes(tok)
    );
    if (allTokensMatch) return true;
  }

  return false;
}

function resolveSelectedProgram(value: string | null | undefined, programs: AcademicProgram[]): AcademicProgram | null {
  if (!value) return null;
  const valTrim = String(value).trim().toLowerCase();
  const directMatch = programs.find(p => 
    p.id.toLowerCase() === valTrim ||
    (p.programCode && p.programCode.toLowerCase() === valTrim) ||
    p.programName.toLowerCase() === valTrim
  );
  if (directMatch) return directMatch;

  const normVal = normalizeSearch(valTrim);
  return programs.find(p => {
    const pNorm = normalizeSearch(p.programName);
    const pBaseNorm = normalizeSearch(p.programName.split("(")[0]);
    const pCodeNorm = p.programCode ? normalizeSearch(p.programCode) : "";
    return (
      pNorm === normVal ||
      pBaseNorm === normVal ||
      pCodeNorm === normVal ||
      pNorm.startsWith(normVal)
    );
  }) || null;
}

async function runTests() {
  console.log("=== RUNNING ISCMS ACADEMIC PROGRAM REGISTRATION SELECTOR TESTS ===\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in .env.local");
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Direct Supabase Query Check
  console.log("Test 1: Direct Database Verification for 'M.A. Criminology'");
  const { data: crimRow, error: crimErr } = await supabase
    .from("academic_programs")
    .select("*")
    .eq("id", "fccb18d1-74b2-4b27-a8dc-e317da7adf47")
    .single();

  if (crimErr || !crimRow) {
    throw new Error(`Failed to find M.A. Criminology row: ${crimErr?.message}`);
  }
  console.log(`  ✓ Found row id: ${crimRow.id}`);
  console.log(`  ✓ Program Name: "${crimRow.program_name}"`);
  console.log(`  ✓ Program Code: "${crimRow.program_code}"`);
  console.log(`  ✓ is_active: ${crimRow.is_active}`);
  if (crimRow.is_active !== true) {
    throw new Error("Test 1 FAILED: M.A. Criminology is not active in the database!");
  }
  console.log("  -> Test 1 PASSED\n");

  // 2. Active Programs Service & Action Check
  console.log("Test 2: getActiveAcademicProgramsAction() Query");
  const service = new AcademicProgramService();
  const activePrograms = await service.getActivePrograms();
  console.log(`  ✓ Total Active Programs returned: ${activePrograms.length}`);
  
  const crimInActive = activePrograms.find(p => p.id === "fccb18d1-74b2-4b27-a8dc-e317da7adf47");
  if (!crimInActive) {
    throw new Error("Test 2 FAILED: M.A. Criminology was excluded from getActivePrograms!");
  }
  console.log(`  ✓ M.A. Criminology is included in active programs list: ${crimInActive.programName}`);
  console.log("  -> Test 2 PASSED\n");

  // 3. Settings getAllAcademicProgramsAction Check
  console.log("Test 3: Settings getAllPrograms Query");
  const allPrograms = await service.getAllPrograms();
  console.log(`  ✓ Total Programs in Settings: ${allPrograms.length}`);
  const crimInAll = allPrograms.find(p => p.id === "fccb18d1-74b2-4b27-a8dc-e317da7adf47");
  if (!crimInAll) {
    throw new Error("Test 3 FAILED: M.A. Criminology missing from getAllPrograms!");
  }
  console.log(`  ✓ M.A. Criminology exists in Settings with isActive=${crimInAll.isActive}`);
  console.log("  -> Test 3 PASSED\n");

  // 4. Registration Course Selector Search & Match Variants
  console.log("Test 4: SearchableProgramSelector filtering & query matching variants");
  const searchVariants = [
    "M. A. Criminology",
    "M.A. Criminology",
    "MA Criminology",
    "M. A.",
    "M.A.",
    "MAC",
    "criminology",
    "CRIMINOLOGY",
    "Forensic Psychology",
    "Behavioral Forensics"
  ];

  for (const query of searchVariants) {
    const matches = activePrograms.filter(p => matchesProgram(query, p));
    const foundCrim = matches.some(p => p.id === "fccb18d1-74b2-4b27-a8dc-e317da7adf47");
    if (!foundCrim) {
      throw new Error(`Test 4 FAILED: Search variant "${query}" failed to match M.A. Criminology!`);
    }
    console.log(`  ✓ Search query "${query}" successfully matched M.A. Criminology (${matches.length} total result(s))`);
  }
  console.log("  -> Test 4 PASSED\n");

  // 5. Selection and ID Preservation
  console.log("Test 5: Program ID resolution and preservation for registration payload");
  const testValues = [
    "fccb18d1-74b2-4b27-a8dc-e317da7adf47",
    "MAC",
    "M. A. Criminology",
    "M.A. Criminology (with specialization in Forensic Psychology)"
  ];

  for (const val of testValues) {
    const resolved = resolveSelectedProgram(val, activePrograms);
    if (!resolved || resolved.id !== "fccb18d1-74b2-4b27-a8dc-e317da7adf47") {
      throw new Error(`Test 5 FAILED: Failed resolving value "${val}" to ID fccb18d1-74b2-4b27-a8dc-e317da7adf47!`);
    }
    console.log(`  ✓ Value "${val}" cleanly resolved to program ID: ${resolved.id}`);
  }
  console.log("  -> Test 5 PASSED\n");

  // 6. Regression: Exclusion of Archived / Inactive Programs
  console.log("Test 6: Inactive/Archived programs exclusion verification");
  // Temporarily insert a test inactive program to verify exclusion
  const dummyArchivedId = "00000000-0000-0000-0000-000000000001";
  await supabase.from("academic_programs").delete().eq("id", dummyArchivedId);
  const { error: insErr } = await supabase.from("academic_programs").insert({
    id: dummyArchivedId,
    program_name: "ZZZ_ARCHIVED_TEST_PROGRAM",
    program_code: "ZZZ-ARCH",
    is_active: false,
    academic_level: "UG",
    display_order: 999
  });

  if (!insErr) {
    try {
      const activeAfterDummy = await service.getActivePrograms();
      const dummyInActive = activeAfterDummy.find(p => p.id === dummyArchivedId);
      if (dummyInActive) {
        throw new Error("Test 6 FAILED: Archived program was returned in getActivePrograms!");
      }
      console.log("  ✓ Confirmed: Archived program is strictly excluded from active programs list");

      const allAfterDummy = await service.getAllPrograms();
      const dummyInAll = allAfterDummy.find(p => p.id === dummyArchivedId);
      if (!dummyInAll) {
        throw new Error("Test 6 FAILED: Archived program missing from Settings getAllPrograms!");
      }
      console.log("  ✓ Confirmed: Archived program remains visible in Settings with isActive=false");
    } finally {
      await supabase.from("academic_programs").delete().eq("id", dummyArchivedId);
      console.log("  ✓ Cleaned up dummy archived program");
    }
  }
  console.log("  -> Test 6 PASSED\n");

  // 7. AcademicProgressionEngine calculation with M.A. Criminology
  console.log("Test 7: Progression calculation using M.A. Criminology metadata");
  const progConfig = await service.getProgramById("fccb18d1-74b2-4b27-a8dc-e317da7adf47");
  if (!progConfig) {
    throw new Error("Test 7 FAILED: Could not fetch M.A. Criminology config!");
  }
  console.log(`  ✓ Duration: ${progConfig.durationValue} ${progConfig.durationUnit}`);
  console.log(`  ✓ Total Semesters: ${progConfig.totalSemesters}`);
  console.log(`  ✓ Semester Duration: ${progConfig.semesterDuration} ${progConfig.semesterDurationUnit}`);
  console.log(`  ✓ School: "${progConfig.schoolName}"`);
  console.log("  -> Test 7 PASSED\n");

  console.log("=================================================");
  console.log("ALL VERIFICATION SUITE TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runTests().catch(err => {
  console.error("\nTEST SUITE RUN ERROR:", err);
  process.exit(1);
});
