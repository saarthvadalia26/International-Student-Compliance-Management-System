import "./test-preload";
import assert from "node:assert/strict";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { CountryService } from "../src/domain/countries/country.service";

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
console.log(" ISCMS TEST SUITE: NATIONALITY VALIDATION ROBUSTNESS & BUG FIX");
console.log("============================================================\n");

console.log("--- 1. CountryService Synchronous Normalization ---");

test("Normalizes ISO Alpha-3 codes accurately", () => {
  const c1 = CountryService.normalizeCountryInputSync("IND");
  assert.equal(c1?.isoAlpha3, "IND");
  assert.equal(c1?.country.name, "India");

  const c2 = CountryService.normalizeCountryInputSync("USA");
  assert.equal(c2?.isoAlpha3, "USA");
  assert.equal(c2?.country.name, "United States");

  const c3 = CountryService.normalizeCountryInputSync("FJI");
  assert.equal(c3?.isoAlpha3, "FJI");
  assert.equal(c3?.country.name, "Fiji");
});

test("BUG REPRODUCTION PREVENTION: Month-abbreviation country codes (MAR, DEU, NPL) never get corrupted into dates", () => {
  // Previously, new Date('MAR') parsed as March 1 and corrupted nationality into an ISO timestamp
  const mar = CountryService.normalizeCountryInputSync("MAR");
  assert.equal(mar?.isoAlpha3, "MAR");
  assert.equal(mar?.country.name, "Morocco");

  const deu = CountryService.normalizeCountryInputSync("DEU");
  assert.equal(deu?.isoAlpha3, "DEU");
  assert.equal(deu?.country.name, "Germany");

  const aug = CountryService.normalizeCountryInputSync("NPL");
  assert.equal(aug?.isoAlpha3, "NPL");
  assert.equal(aug?.country.name, "Nepal");
});

test("Normalizes full country names to ISO Alpha-3", () => {
  const c1 = CountryService.normalizeCountryInputSync("Nepal");
  assert.equal(c1?.isoAlpha3, "NPL");

  const c2 = CountryService.normalizeCountryInputSync("Germany");
  assert.equal(c2?.isoAlpha3, "DEU");

  const c3 = CountryService.normalizeCountryInputSync("United Kingdom");
  assert.equal(c3?.isoAlpha3, "GBR");
});

test("Normalizes ISO Alpha-2 codes to ISO Alpha-3", () => {
  const c1 = CountryService.normalizeCountryInputSync("IN");
  assert.equal(c1?.isoAlpha3, "IND");

  const c2 = CountryService.normalizeCountryInputSync("NP");
  assert.equal(c2?.isoAlpha3, "NPL");
});

console.log("\n--- 2. RegisterStudentValidationSchema Nationality Validation ---");

test("Accepts ISO Alpha-3 code in nationalityCode field", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Tenzing Norgay",
    nationalityCode: "NPL"
  });
  assert.equal(result.success, true);
});

test("Accepts full country name in nationalityCode field and validates successfully", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "John Doe",
    nationalityCode: "United States"
  });
  assert.equal(result.success, true);
});

test("Rejects completely invalid nationality inputs", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Invalid Test",
    nationalityCode: "ZZZ_UNKNOWN_PLANET_999"
  });
  assert.equal(result.success, false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
