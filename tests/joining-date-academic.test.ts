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
console.log(" ISCMS TEST SUITE: JOINING DATE IN ACADEMIC PROFILE");
console.log("============================================================\n");

console.log("--- 1. RegisterStudentValidationSchema with joiningDate ---");

test("Accepts valid ISO joiningDate", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationality: "RUS",
    admissionDate: "2026-08-01",
    joiningDate: "2026-08-15"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.joiningDate, "2026-08-15");
  }
});

test("Accepts null/empty joiningDate as optional", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationality: "RUS",
    joiningDate: null
  });
  assert.equal(result.success, true);
});

test("Rejects malformed joiningDate string", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationality: "RUS",
    joiningDate: "not-a-date"
  });
  assert.equal(result.success, false);
});

console.log("\n--- 2. UpdateStudentValidationSchema with joiningDate ---");

test("Accepts joiningDate update", () => {
  const result = UpdateStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    joiningDate: "2026-09-01"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.joiningDate, "2026-09-01");
  }
});

test("Allows resetting joiningDate to null", () => {
  const result = UpdateStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    joiningDate: null
  });
  assert.equal(result.success, true);
});

console.log("\n--- 3. Joining Date Academic Validation and Mapping ---");

test("Joining date accepts and preserves valid calendar date strings", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationality: "RUS",
    admissionDate: "2026-08-01",
    joiningDate: "2026-08-15"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.joiningDate, "2026-08-15");
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
