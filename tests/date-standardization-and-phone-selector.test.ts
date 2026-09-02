import "./test-preload";
import assert from "node:assert/strict";
import { formatDate, formatDateTime, formatDateForExcel, parseDateOnlyString } from "../src/lib/utils/date";
import { AcademicProgressionEngine } from "../src/domain/academic/services/semester-progression.service";
import { 
  getCountryByIso2, 
  getCountryByCode, 
  getCountryByPhoneCode, 
  searchCountries, 
  formatE164Phone 
} from "../src/utils/countries";

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
console.log(" ISCMS TEST SUITE: GLOBAL DATE STANDARDIZATION & PHONE FIX");
console.log("============================================================\n");

console.log("--- 1. Global Date Format Standardization (DD/MM/YYYY) ---");

test("formatDate strictly outputs DD/MM/YYYY for standard ISO dates", () => {
  assert.equal(formatDate("2026-09-05"), "05/09/2026");
  assert.equal(formatDate("2026-01-01"), "01/01/2026");
  assert.equal(formatDate("2026-12-31"), "31/12/2026");
  assert.equal(formatDate("2026-08-15"), "15/08/2026");
});

test("CRITICAL TIMEZONE SAFETY: Date-only strings never shift day in any timezone", () => {
  // Dates stored as YYYY-MM-DD or with ISO midnight string
  const dates = ["2026-09-05", "2026-01-01", "2026-02-28", "2026-12-31"];
  for (const d of dates) {
    const parsed = parseDateOnlyString(d);
    assert.ok(parsed !== null, `Failed to parse date-only ${d}`);
    const formatted = formatDate(d);
    const expectedDay = d.split("-")[2];
    const expectedMonth = d.split("-")[1];
    const expectedYear = d.split("-")[0];
    assert.equal(formatted, `${expectedDay}/${expectedMonth}/${expectedYear}`);
  }
});

test("formatDateTime outputs DD/MM/YYYY, HH:mm", () => {
  const dt = new Date(2026, 8, 5, 14, 30, 0); // Sep 5, 2026, 14:30
  assert.equal(formatDateTime(dt), "05/09/2026, 14:30");
});

test("formatDateForExcel outputs strictly DD/MM/YYYY for human viewing", () => {
  assert.equal(formatDateForExcel("2026-09-05"), "05/09/2026");
  assert.equal(formatDateForExcel(new Date(2026, 7, 15)), "15/08/2026");
  assert.equal(formatDateForExcel(null), "N/A");
  assert.equal(formatDateForExcel(""), "N/A");
});

test("AcademicProgressionEngine.formatDisplayDate delegates to DD/MM/YYYY", () => {
  assert.equal(AcademicProgressionEngine.formatDisplayDate("2026-09-05"), "05/09/2026");
  assert.equal(AcademicProgressionEngine.formatDisplayDate("2025-08-01"), "01/08/2025");
  assert.equal(AcademicProgressionEngine.formatDisplayDate(null), "Not Recorded");
});

console.log("\n--- 2. Phone Country Code Selector & Resolution Fix ---");

test("Direct canonical ISO Alpha-2 lookup works for all requested countries", () => {
  const india = getCountryByIso2("IN");
  assert.equal(india?.name, "India");
  assert.equal(india?.phoneCode, "+91");

  const usa = getCountryByIso2("US");
  assert.equal(usa?.name, "United States");
  assert.equal(usa?.phoneCode, "+1");

  const canada = getCountryByIso2("CA");
  assert.equal(canada?.name, "Canada");
  assert.equal(canada?.phoneCode, "+1");

  const uk = getCountryByIso2("GB");
  assert.equal(uk?.name, "United Kingdom");
  assert.equal(uk?.phoneCode, "+44");

  const uae = getCountryByIso2("AE");
  assert.equal(uae?.name, "United Arab Emirates");
  assert.equal(uae?.phoneCode, "+971");

  const yemen = getCountryByIso2("YE");
  assert.equal(yemen?.name, "Yemen");
  assert.equal(yemen?.phoneCode, "+967");

  const tanzania = getCountryByIso2("TZ");
  assert.equal(tanzania?.name, "Tanzania");
  assert.equal(tanzania?.phoneCode, "+255");

  const maldives = getCountryByIso2("MV");
  assert.equal(maldives?.name, "Maldives");
  assert.equal(maldives?.phoneCode, "+960");
});

test("SHARED CALLING CODE RESOLUTION: Canada (+1) is distinguishable from United States (+1)", () => {
  // Canada lookup with preferredIso2="CA"
  const canada = getCountryByPhoneCode("+1", "CA");
  assert.equal(canada?.alpha2, "CA");
  assert.equal(canada?.name, "Canada");

  // United States lookup with preferredIso2="US"
  const us = getCountryByPhoneCode("+1", "US");
  assert.equal(us?.alpha2, "US");
  assert.equal(us?.name, "United States");

  // Default fallback for +1 without specified country resolves to US primary
  const defaultOne = getCountryByPhoneCode("+1");
  assert.equal(defaultOne?.alpha2, "US");
});

test("SHARED CALLING CODE RESOLUTION: Russia vs Kazakhstan (+7)", () => {
  const kz = getCountryByPhoneCode("+7", "KZ");
  assert.equal(kz?.alpha2, "KZ");
  assert.equal(kz?.name, "Kazakhstan");

  const ru = getCountryByPhoneCode("+7", "RU");
  assert.equal(ru?.alpha2, "RU");
  assert.equal(ru?.name, "Russia");
});

test("SEARCH RELEVANCE: Searching 'in' prioritizes India as top match", () => {
  const results = searchCountries("in");
  assert.ok(results.length > 0);
  assert.equal(results[0].alpha2, "IN");
  assert.equal(results[0].name, "India");
});

test("SEARCH RELEVANCE: Searching '+91' or '91' resolves India as top match", () => {
  const res1 = searchCountries("+91");
  assert.equal(res1[0].name, "India");

  const res2 = searchCountries("91");
  assert.equal(res2[0].name, "India");
});

test("SEARCH RELEVANCE: Searching 'United States' and 'Canada'", () => {
  const usRes = searchCountries("United States");
  assert.equal(usRes[0].alpha2, "US");

  const caRes = searchCountries("Canada");
  assert.equal(caRes[0].alpha2, "CA");
});

test("SEARCH RELEVANCE: Searching international countries", () => {
  assert.equal(searchCountries("Yemen")[0].alpha2, "YE");
  assert.equal(searchCountries("Tanzania")[0].alpha2, "TZ");
  assert.equal(searchCountries("Maldives")[0].alpha2, "MV");
  assert.equal(searchCountries("AE")[0].alpha2, "AE");
});

test("formatE164Phone concatenates dial code and number safely", () => {
  assert.equal(formatE164Phone("+91", "9876543210"), "+919876543210");
  assert.equal(formatE164Phone("+1", "5551234567"), "+15551234567");
  assert.equal(formatE164Phone("+44", "7911123456"), "+447911123456");
  assert.equal(formatE164Phone("+967", "712345678"), "+967712345678");
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
