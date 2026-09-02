import "./test-preload";
import assert from "node:assert/strict";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

console.log("\n============================================================");
console.log(" ISCMS TEST SUITE: NFSU CAMPUSES MASTER DATA & PROFILE ASSIGNMENT");
console.log("============================================================\n");

console.log("--- 1. Registration with NFSU Campuses ---");

test("Accepts canonical NFSU campuses from master data", () => {
  const campuses = [
    "Gandhinagar Campus (Main)",
    "Delhi Campus",
    "Goa Campus",
    "Tripura Campus",
    "Bhopal Campus",
    "Pune Campus",
    "Guwahati Campus",
    "Manipur Campus",
    "Dharwad Campus",
    "Uganda Campus (International)"
  ];

  for (const campus of campuses) {
    const result = RegisterStudentValidationSchema.safeParse({
      fullName: "Student at " + campus.slice(0, 5),
      nationality: "IND",
      nfsuCampus: campus
    });
    assert.equal(result.success, true, `Failed for campus: ${campus}`);
    if (result.success) {
      assert.equal(result.data.nfsuCampus, campus);
    }
  }
});

test("Allows null/empty campus for distance or unassigned student", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Remote Student",
    nationality: "IND",
    nfsuCampus: null
  });
  assert.equal(result.success, true);
});

console.log("\n--- 2. Update Student with NFSU Campus ---");

test("Accepts NFSU campus update", () => {
  const result = UpdateStudentValidationSchema.safeParse({
    fullName: "Transferred Student",
    nfsuCampus: "Goa Campus"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.nfsuCampus, "Goa Campus");
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
