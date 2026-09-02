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
console.log(" ISCMS TEST SUITE: EXPANDED VISA CLASSIFICATIONS");
console.log("============================================================\n");

console.log("--- 1. All Expanded Visa Classifications Validation ---");

const EXPANDED_VISA_TYPES = [
  "Student (S-1)",
  "Student (S-2)",
  "Student (S-3)",
  "Student (S-4)",
  "Student (S-5)",
  "Research (R-1)",
  "Intern (I-1)",
  "Other"
];

for (const visaType of EXPANDED_VISA_TYPES) {
  test(`Registration accepts visa classification: ${visaType}`, () => {
    const result = RegisterStudentValidationSchema.safeParse({
      fullName: `Visa Student ${visaType}`,
      nationality: "FRA",
      visaType: visaType
    });
    assert.equal(result.success, true, `Failed for visa type: ${visaType}`);
    if (result.success) {
      assert.equal(result.data.visaType, visaType);
    }
  });
}

test("Registration accepts custom category in other options", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Diplomatic Scholar",
    nationality: "FRA",
    visaType: "Diplomatic (D-1)"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.visaType, "Diplomatic (D-1)");
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
