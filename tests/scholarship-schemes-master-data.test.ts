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
console.log(" ISCMS TEST SUITE: SCHOLARSHIP SCHEMES MASTER DATA & STUDENT ASSIGNMENT");
console.log("============================================================\n");

console.log("--- 1. Registration with Scholarship Schemes ---");

test("Accepts canonical scholarship schemes from master data", () => {
  const schemes = [
    "General Scholarship Scheme (GSS)",
    "Silver Jubilee Scholarship Scheme",
    "Africa Scholarship Scheme",
    "Commonwealth Scholarship Scheme",
    "Mekong Ganga Cooperation Scholarship Scheme",
    "Direct Admission / Self Financed"
  ];

  for (const scheme of schemes) {
    const result = RegisterStudentValidationSchema.safeParse({
      fullName: "Student " + scheme.slice(0, 5),
      nationality: "IND",
      iccrScholarshipSchemeName: scheme,
      scholarshipSchemeName: scheme
    });
    assert.equal(result.success, true, `Failed for scheme: ${scheme}`);
    if (result.success) {
      assert.equal(result.data.iccrScholarshipSchemeName, scheme);
      assert.equal(result.data.scholarshipSchemeName, scheme);
    }
  }
});

test("Allows null or omitted scholarship scheme for direct admission", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Independent Student",
    nationality: "IND",
    iccrScholarshipSchemeName: null
  });
  assert.equal(result.success, true);
});

console.log("\n--- 2. Update Student with Scholarship Schemes ---");

test("Accepts scholarship scheme update", () => {
  const result = UpdateStudentValidationSchema.safeParse({
    fullName: "Updated Student",
    iccrScholarshipSchemeName: "Bilateral Cultural Exchange Programme",
    scholarshipSchemeName: "Bilateral Cultural Exchange Programme"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.iccrScholarshipSchemeName, "Bilateral Cultural Exchange Programme");
    assert.equal(result.data.scholarshipSchemeName, "Bilateral Cultural Exchange Programme");
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
