import "./test-preload";
import { ISO_MASTER_COUNTRIES } from "../src/domain/countries/iso-countries.data";
import { getCountryByPhoneCode, formatE164Phone } from "../src/utils/countries";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";
import { RegisterStudentValidationSchema } from "../src/services/validation/student-validation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("  ISCMS v0.2.0: INTERNATIONAL PHONE NUMBERS TEST SUITE ");
  console.log("=======================================================\n");

  console.log("--- Section 1: ISO Master Countries Calling Dial Codes ---");
  assert(ISO_MASTER_COUNTRIES.length >= 100, `Master countries count: ${ISO_MASTER_COUNTRIES.length}`);

  const india = ISO_MASTER_COUNTRIES.find(c => c.isoAlpha3 === "IND");
  assert(india?.phoneCode === "+91", "India phoneCode is +91");

  const fiji = ISO_MASTER_COUNTRIES.find(c => c.isoAlpha3 === "FJI");
  assert(fiji?.phoneCode === "+679", "Fiji phoneCode is +679");

  const usa = ISO_MASTER_COUNTRIES.find(c => c.isoAlpha3 === "USA");
  assert(usa?.phoneCode === "+1", "USA phoneCode is +1");

  const uk = ISO_MASTER_COUNTRIES.find(c => c.isoAlpha3 === "GBR");
  assert(uk?.phoneCode === "+44", "UK phoneCode is +44");

  const allHaveValidCodes = ISO_MASTER_COUNTRIES.every(c => c.phoneCode && /^\+[\d\-]{1,8}$/.test(c.phoneCode));
  assert(allHaveValidCodes === true, "All master countries have valid E.164 dial codes");

  console.log("\n--- Section 2: Country Lookup by Dial Code ---");
  const lookupIndia = getCountryByPhoneCode("+91");
  assert(lookupIndia?.code === "IND", "Resolved +91 to IND");

  const lookupFiji = getCountryByPhoneCode("+679");
  assert(lookupFiji?.code === "FJI", "Resolved +679 to FJI");

  const lookupFijiRaw = getCountryByPhoneCode("679");
  assert(lookupFijiRaw?.code === "FJI", "Resolved 679 without plus to FJI");

  console.log("\n--- Section 3: E.164 Normalization ---");
  assert(formatE164Phone("+91", "9876543210") === "+919876543210", "Formatted India number");
  assert(formatE164Phone("+679", "1234567") === "+6791234567", "Formatted Fiji number");
  assert(formatE164Phone("91", "98765-43210") === "+919876543210", "Formatted number with punctuation and un-prefixed code");

  console.log("\n--- Section 4: Bulk Import Phone Component Parsing ---");
  const combined = BulkStudentImportService.parsePhoneComponents("+679 1234567");
  assert(combined.countryCode === "+679", "Parsed combined countryCode: +679");
  assert(combined.number === "1234567", "Parsed combined number: 1234567");
  assert(combined.formattedE164 === "+6791234567", "Parsed combined E.164: +6791234567");

  const separate = BulkStudentImportService.parsePhoneComponents("1234567", "+679");
  assert(separate.countryCode === "+679", "Parsed separate countryCode: +679");
  assert(separate.number === "1234567", "Parsed separate number: 1234567");
  assert(separate.formattedE164 === "+6791234567", "Parsed separate E.164: +6791234567");

  console.log("\n--- Section 5: Student Registration Validation with Structured Phone ---");
  const validData = {
    fullName: "Rahul Sharma",
    phoneHome: "+919876543210",
    phoneHomeCountryCode: "+91",
    phoneHomeNumber: "9876543210",
    phoneLocal: "+919876543210",
    phoneLocalCountryCode: "+91",
    phoneLocalNumber: "9876543210"
  };

  const parsed = RegisterStudentValidationSchema.safeParse(validData);
  assert(parsed.success === true, "RegisterStudentValidationSchema accepts structured phone fields");

  console.log("\n=======================================================");
  console.log("  ALL INTERNATIONAL PHONE TESTS PASSED SUCCESSFULLY!   ");
  console.log("=======================================================\n");
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
