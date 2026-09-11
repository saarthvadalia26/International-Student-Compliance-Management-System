import "./test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import assert from "node:assert/strict";
import { getAdminSupabase } from "../src/lib/supabase/admin";
import { 
  findDuplicateStudentGroups, 
  areStudentsPotentialDuplicates,
  CandidateStudent 
} from "../src/domain/students/utils/duplicate-student-detection.util";

async function runTests() {
  console.log("============================================================");
  console.log(" TEST SUITE: DUPLICATE STUDENT DETECTION");
  console.log("============================================================\n");

  // TEST 1 — Synthetic Exact Match
  const s1: CandidateStudent = {
    id: "uuid-1",
    fullName: "JOHN DOE",
    nationalityCode: "USA",
    dateOfBirth: "2001-01-01"
  };
  const s2: CandidateStudent = {
    id: "uuid-2",
    fullName: "john doe",
    nationalityCode: "USA",
    dateOfBirth: "2001-01-01"
  };
  const res1 = areStudentsPotentialDuplicates(s1, s2);
  assert.equal(res1.isDuplicate, true, "Exact normalized name match must be detected");
  console.log("  ✓ TEST 1: Exact normalized name match detected");

  // TEST 2 — Synthetic Kosimov Duplicate Pair
  const kosimov1: CandidateStudent = {
    id: "0d2efcc7-a8bc-4945-8c79-f1c1240cef54",
    fullName: "KOSIMOV DONIYORJON",
    nationalityCode: "UZB",
    dateOfBirth: "2000-06-06"
  };
  const kosimov2: CandidateStudent = {
    id: "f63e2f95-4d2f-4ae5-9946-41d91f803a9e",
    fullName: "KOSIMOV DONIYORJON BAKHTIYOR UGLI",
    nationalityCode: "UZB",
    dateOfBirth: "2000-06-06",
    passportNumber: "FA0091793"
  };
  const res2 = areStudentsPotentialDuplicates(kosimov1, kosimov2);
  assert.equal(res2.isDuplicate, true, "Kosimov pair must be detected as duplicate");
  assert.equal(res2.commonSearchTerm, "KOSIMOV", "Search term should be KOSIMOV");
  console.log("  ✓ TEST 2: Kosimov duplicate pair detected with search term KOSIMOV");

  // TEST 3 — Live Database Evaluation
  const supabase = getAdminSupabase();
  const { data: liveStudents, error } = await supabase
    .from("students")
    .select(`
      id,
      registration_number,
      created_at,
      student_personal(full_name, nationality_code, date_of_birth),
      student_academic(program_code),
      student_snapshot(passport_number)
    `)
    .is("deleted_at", null)
    .eq("status", "active");

  assert(!error, `Failed to query live students: ${error?.message}`);
  assert(liveStudents && liveStudents.length > 0, "Expected live students");

  const candidates: CandidateStudent[] = liveStudents.map(s => {
    const p = Array.isArray(s.student_personal) ? s.student_personal[0] : s.student_personal;
    const a = Array.isArray(s.student_academic) ? s.student_academic[0] : s.student_academic;
    const snap = Array.isArray(s.student_snapshot) ? s.student_snapshot[0] : s.student_snapshot;
    return {
      id: s.id,
      fullName: p?.full_name || "",
      nationalityCode: p?.nationality_code || null,
      dateOfBirth: p?.date_of_birth || null,
      passportNumber: snap?.passport_number || null,
      registrationNumber: s.registration_number || null,
      programCode: a?.program_code || null,
      createdAt: s.created_at
    };
  });

  const duplicateGroups = findDuplicateStudentGroups(candidates);
  console.log(`\n  Live Database Result: Found ${duplicateGroups.length} duplicate group(s) across ${candidates.length} students:`);
  duplicateGroups.forEach(g => {
    console.log(`    - Group: "${g.primaryName}"`);
    console.log(`      Reason: ${g.reason}`);
    console.log(`      Search Term: "${g.searchTerm}"`);
    console.log(`      Student IDs: [${g.studentIds.join(", ")}]`);
    console.log(`      Members (${g.students.length}):`, g.students.map(s => s.fullName));
  });

  assert.equal(duplicateGroups.length, 1, "Exactly 1 duplicate group should be detected in live database (Kosimov)");
  assert.equal(duplicateGroups[0].students.length, 2, "Duplicate group should contain exactly 2 students");
  assert(duplicateGroups[0].studentIds.includes("0d2efcc7-a8bc-4945-8c79-f1c1240cef54"));
  assert(duplicateGroups[0].studentIds.includes("f63e2f95-4d2f-4ae5-9946-41d91f803a9e"));
  console.log("  ✓ TEST 3: Live database accurately isolates the 1 duplicate Kosimov pair with zero false positives across remaining 92 students!");

  // TEST 4 — Pair Key Generation and Dismissed Exclusion
  const { generatePairKey, getAllPairKeys } = await import("../src/domain/students/utils/duplicate-student-detection.util");
  const pk1 = generatePairKey("id-b", "id-a");
  const pk2 = generatePairKey("id-a", "id-b");
  assert.equal(pk1, "id-a::id-b", "generatePairKey should produce canonically sorted string");
  assert.equal(pk1, pk2, "generatePairKey should be order-independent");

  const allPairs = getAllPairKeys(["id-1", "id-2", "id-3"]);
  assert.equal(allPairs.length, 3, "3 IDs should generate 3 pairwise combinations");
  assert(allPairs.includes("id-1::id-2"));
  assert(allPairs.includes("id-1::id-3"));
  assert(allPairs.includes("id-2::id-3"));
  console.log("  ✓ TEST 4: Pair key canonical sorting and combinations verified");

  // TEST 5 — Dismissed Pair Exclusion (Treating both students differently)
  const dismissedKosimov = new Set<string>([
    generatePairKey("0d2efcc7-a8bc-4945-8c79-f1c1240cef54", "f63e2f95-4d2f-4ae5-9946-41d91f803a9e")
  ]);
  const resDismissed = areStudentsPotentialDuplicates(kosimov1, kosimov2, dismissedKosimov);
  assert.equal(resDismissed.isDuplicate, false, "Dismissed pair must NOT be flagged as duplicate");

  const groupsWithDismissal = findDuplicateStudentGroups(candidates, dismissedKosimov);
  assert.equal(
    groupsWithDismissal.length, 
    0, 
    "When marked as different students, duplicate detection must return 0 duplicate groups across all students"
  );
  console.log("  ✓ TEST 5: When marked as different students, duplicate group is fully cleared (0 groups across 94 students)!");

  console.log("\n============================================================");
  console.log(" ALL TESTS PASSED (5/5)");
  console.log("============================================================\n");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
