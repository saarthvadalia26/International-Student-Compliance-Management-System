import "./test-preload";
import assert from "node:assert/strict";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { StudentBankDetailsSchema } from "../src/services/validation/validation.service";

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
console.log(" ISCMS TEST SUITE: STUDENT BANK DETAILS (5TH TAB & REGISTRATION)");
console.log("============================================================\n");

console.log("--- 1. StudentBankDetailsSchema Domain Validation ---");

test("Validates complete bank details successfully", () => {
  const result = StudentBankDetailsSchema.safeParse({
    bankName: "State Bank of India",
    accountNumber: "000192837465",
    ifscCode: "SBIN0001234",
    branchAddress: "Sector 9, Gandhinagar, Gujarat"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.bankName, "State Bank of India");
    assert.equal(result.data.accountNumber, "000192837465");
    assert.equal(result.data.ifscCode, "SBIN0001234");
    assert.equal(result.data.branchAddress, "Sector 9, Gandhinagar, Gujarat");
  }
});

test("CRITICAL: Preserves leading zeros in account number as TEXT", () => {
  const result = StudentBankDetailsSchema.safeParse({
    bankName: "Punjab National Bank",
    accountNumber: "0000049281928374",
    ifscCode: "PUNB0123400",
    branchAddress: "Delhi"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(typeof result.data.accountNumber, "string");
    assert.equal(result.data.accountNumber, "0000049281928374");
    assert.ok(result.data.accountNumber.startsWith("00000"));
  }
});

test("Accepts alphanumeric and international account identifiers as TEXT", () => {
  const result = StudentBankDetailsSchema.safeParse({
    bankName: "Barclays Bank",
    accountNumber: "GB29BARC20201555555555",
    ifscCode: "BARC0000001",
    branchAddress: "London City Branch"
  });
  assert.equal(result.success, true);
});

test("Accepts partial or empty optional bank fields", () => {
  const result = StudentBankDetailsSchema.safeParse({
    bankName: "HDFC Bank",
    accountNumber: null,
    ifscCode: null,
    branchAddress: null
  });
  assert.equal(result.success, true);
});

console.log("\n--- 2. RegisterStudentValidationSchema with Bank Details ---");

test("Registration schema accepts optional bank fields", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Aarav Sharma",
    nationality: "NPL",
    bankName: "Bank of Baroda",
    accountNumber: "012345678901",
    ifscCode: "BARB0GANDHI",
    branchAddress: "Sector 24, Gandhinagar"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.bankName, "Bank of Baroda");
    assert.equal(result.data.accountNumber, "012345678901");
  }
});

console.log("\n--- 3. UpdateStudentValidationSchema with Bank Details ---");

test("Update schema accepts bank details modification", () => {
  const result = UpdateStudentValidationSchema.safeParse({
    fullName: "Aarav Sharma",
    bankName: "ICICI Bank",
    accountNumber: "001122334455",
    ifscCode: "ICIC0000011",
    branchAddress: "Ahmedabad"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.bankName, "ICICI Bank");
    assert.equal(result.data.accountNumber, "001122334455");
    assert.equal(result.data.ifscCode, "ICIC0000011");
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
