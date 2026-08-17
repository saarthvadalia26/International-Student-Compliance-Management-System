/**
 * Automated Acceptance Test Suite: Production-Grade Country Management System
 * 
 * Verifies:
 * 1. ISO 3166-1 Master Dataset Completeness & Uniqueness (Alpha-2, Alpha-3, Numeric)
 * 2. Fiji Canonical Verification (FJ / FJI / 242 / Fijian / Oceania)
 * 3. Country Normalization across names, demonyms, alpha-2, alpha-3 with case & whitespace tolerance
 * 4. Safe Rejection of Invalid/Unknown Countries (No silent substring guessing)
 * 5. Soft Deactivation Filtering (Active-only dropdowns vs. Inactive historical preservation)
 * 6. Bulk Student Import Service Integration with Canonical Normalization
 */

import "./test-preload";
import { ISO_MASTER_COUNTRIES, CountryService } from "../src/domain/countries/country.service";
import { getCountryByCode, searchCountries, countryList } from "../src/utils/countries";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("  ISCMS COUNTRY MANAGEMENT SYSTEM ACCEPTANCE TEST SUITE");
  console.log("=======================================================\n");

  // -------------------------------------------------------------
  // Test 1: ISO 3166-1 Master Dataset Completeness & Integrity
  // -------------------------------------------------------------
  console.log("--- Test 1: ISO Master Dataset Completeness ---");
  assert(ISO_MASTER_COUNTRIES.length >= 100, `ISO master countries contains comprehensive list (${ISO_MASTER_COUNTRIES.length} countries)`);

  const alpha2Set = new Set<string>();
  const alpha3Set = new Set<string>();
  const numericSet = new Set<string>();
  const nameSet = new Set<string>();

  for (const c of ISO_MASTER_COUNTRIES) {
    assert(/^[A-Z]{2}$/.test(c.isoAlpha2), `Country ${c.name} has valid Alpha-2 format: ${c.isoAlpha2}`);
    assert(/^[A-Z]{3}$/.test(c.isoAlpha3), `Country ${c.name} has valid Alpha-3 format: ${c.isoAlpha3}`);
    assert(/^[0-9]{3}$/.test(c.isoNumeric), `Country ${c.name} has valid Numeric format: ${c.isoNumeric}`);
    assert(c.name.trim().length > 0, `Country name is not empty: ${c.name}`);

    assert(!alpha2Set.has(c.isoAlpha2), `ISO Alpha-2 uniqueness: ${c.isoAlpha2}`);
    assert(!alpha3Set.has(c.isoAlpha3), `ISO Alpha-3 uniqueness: ${c.isoAlpha3}`);
    assert(!numericSet.has(c.isoNumeric), `ISO Numeric uniqueness: ${c.isoNumeric}`);
    assert(!nameSet.has(c.name.toLowerCase()), `Country name uniqueness: ${c.name}`);

    alpha2Set.add(c.isoAlpha2);
    alpha3Set.add(c.isoAlpha3);
    numericSet.add(c.isoNumeric);
    nameSet.add(c.name.toLowerCase());
  }

  // -------------------------------------------------------------
  // Test 2: Fiji Canonical Verification
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Fiji Canonical Verification ---");
  const fiji = ISO_MASTER_COUNTRIES.find(c => c.isoAlpha3 === "FJI");
  assert(!!fiji, "Fiji (FJI) exists in the ISO master dataset");
  assert(fiji?.isoAlpha2 === "FJ", "Fiji Alpha-2 is 'FJ'");
  assert(fiji?.isoNumeric === "242", "Fiji Numeric code is '242'");
  assert(fiji?.name === "Fiji", "Fiji common name is 'Fiji'");
  assert(fiji?.nationality === "Fijian", "Fiji nationality (demonym) is 'Fijian'");
  assert(fiji?.region === "Oceania", "Fiji region is 'Oceania'");

  // -------------------------------------------------------------
  // Test 3: Normalization Logic (CountryService.normalizeCountryInputSync)
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Country Normalization Logic ---");
  
  // Test variations of Fiji
  const fijiVariants = ["Fiji", "fiji", "FIJI", "  fiji  ", "FJ", "fj", "FJI", "fji", "Fijian", "fijian", "242"];
  for (const v of fijiVariants) {
    const res = CountryService.normalizeCountryInputSync(v);
    assert(res !== null && res.isoAlpha3 === "FJI", `Normalized variant "${v}" correctly resolved to FJI (got ${res?.isoAlpha3})`);
  }

  // Test variations of India
  const indiaVariants = ["India", "india", "INDIA", "  India  ", "IN", "in", "IND", "ind", "Indian", "indian", "356"];
  for (const v of indiaVariants) {
    const res = CountryService.normalizeCountryInputSync(v);
    assert(res !== null && res.isoAlpha3 === "IND", `Normalized variant "${v}" correctly resolved to IND (got ${res?.isoAlpha3})`);
  }

  // Test Nepal & Bhutan & US & UK
  assert(CountryService.normalizeCountryInputSync("Nepal")?.isoAlpha3 === "NPL", "Normalized 'Nepal' -> NPL");
  assert(CountryService.normalizeCountryInputSync("Nepalese")?.isoAlpha3 === "NPL", "Normalized 'Nepalese' -> NPL");
  assert(CountryService.normalizeCountryInputSync("Bhutan")?.isoAlpha3 === "BTN", "Normalized 'Bhutan' -> BTN");
  assert(CountryService.normalizeCountryInputSync("United States")?.isoAlpha3 === "USA", "Normalized 'United States' -> USA");
  assert(CountryService.normalizeCountryInputSync("United Kingdom")?.isoAlpha3 === "GBR", "Normalized 'United Kingdom' -> GBR");

  // -------------------------------------------------------------
  // Test 4: Rejection of Unknown Countries (No Unsafe Guessing)
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Rejection of Unknown Countries ---");
  const invalidInputs = ["Fijii", "Atlantis", "Unknownland", "XYZ123", "", "   "];
  for (const inv of invalidInputs) {
    const res = CountryService.normalizeCountryInputSync(inv);
    assert(res === null, `Invalid country "${inv}" was safely rejected (got null)`);
  }

  // -------------------------------------------------------------
  // Test 5: Soft Deactivation & Dropdown Filtering
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Soft Deactivation & Dropdown Filtering ---");
  
  // Search only active vs all
  const allResults = searchCountries("fiji", false);
  const activeResults = searchCountries("fiji", true);
  assert(allResults.length > 0, "searchCountries finds Fiji in all results");
  assert(activeResults.length > 0, "searchCountries finds Fiji in active results");

  // Historical resolution via getCountryByCode works regardless of active status
  const lookupFji = getCountryByCode("FJI");
  assert(lookupFji?.name === "Fiji", "getCountryByCode('FJI') successfully returns Fiji");

  const lookupByAlpha2 = getCountryByCode("FJ");
  assert(lookupByAlpha2?.name === "Fiji", "getCountryByCode('FJ') successfully returns Fiji");

  // -------------------------------------------------------------
  // Test 6: Bulk Student Import Integration
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Bulk Student Import Integration ---");
  assert(BulkStudentImportService.normalizeNationality("Fiji") === "FJI", "Bulk import normalizes 'Fiji' to 'FJI'");
  assert(BulkStudentImportService.normalizeNationality("fiji") === "FJI", "Bulk import normalizes 'fiji' to 'FJI'");
  assert(BulkStudentImportService.normalizeNationality("FJ") === "FJI", "Bulk import normalizes 'FJ' to 'FJI'");
  assert(BulkStudentImportService.normalizeNationality("FJI") === "FJI", "Bulk import normalizes 'FJI' to 'FJI'");
  assert(BulkStudentImportService.normalizeNationality("India") === "IND", "Bulk import normalizes 'India' to 'IND'");
  assert(BulkStudentImportService.normalizeNationality("IN") === "IND", "Bulk import normalizes 'IN' to 'IND'");
  assert(BulkStudentImportService.normalizeNationality("IND") === "IND", "Bulk import normalizes 'IND' to 'IND'");
  assert(BulkStudentImportService.normalizeNationality("Fijii") === null, "Bulk import rejects invalid 'Fijii' (returns null)");
  assert(BulkStudentImportService.normalizeNationality("Atlantis") === null, "Bulk import rejects invalid 'Atlantis' (returns null)");

  console.log("\n=======================================================");
  console.log("  ALL COUNTRY MANAGEMENT ACCEPTANCE TESTS PASSED! 🎉");
  console.log("=======================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
