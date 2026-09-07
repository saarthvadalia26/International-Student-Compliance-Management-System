import "./test-preload";
import assert from "node:assert/strict";
import { ProfileCompletionEngine } from "../src/domain/students/services/profile-completion.service";
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
console.log(" ISCMS TEST SUITE: DYNAMIC STUDENT PROFILE COMPLETENESS");
console.log("============================================================\n");

// --------------------------------------------------------------------------
// TEST 1 — Completely Empty Student (Legal Full Name Only)
// --------------------------------------------------------------------------
test("Test 1 — Completely empty student: Detects all applicable missing profile information", () => {
  const result = ProfileCompletionEngine.evaluate({
    fullName: "Aarav Sharma"
  });

  assert.ok(result.percentage < 25, `Minimal student percentage should be low (got ${result.percentage}%)`);
  assert.equal(result.status, "minimal");
  assert.equal(result.statusLabel, "Minimal Identity Profile");

  // Verify missing items include key fields from every section
  assert.ok(result.missingItems.includes("University Enrollment Number"), "Academic missing reg no");
  assert.ok(result.missingItems.includes("Academic Program"), "Academic missing program");
  assert.ok(result.missingItems.includes("Admission Date"), "Academic missing admission date");
  assert.ok(result.missingItems.includes("Bank Details"), "Bank Details missing");
  assert.ok(result.missingItems.includes("Present/Current Address"), "Present address missing");
  assert.ok(result.missingItems.includes("Permanent Address"), "Permanent address missing");
  assert.ok(result.missingItems.includes("Father Name"), "Father name missing");
  assert.ok(result.missingItems.includes("Passport Number"), "Passport missing");
  assert.ok(result.missingItems.includes("Visa Number"), "Visa missing");
  assert.ok(result.missingItems.includes("eFRRO Number"), "eFRRO missing");

  // Check section counts
  assert.equal(result.sections.length, 7, "Must contain all 7 sections");
});

// --------------------------------------------------------------------------
// TEST 2 — Partially Completed Student
// --------------------------------------------------------------------------
test("Test 2 — Partially completed student: Detects remaining missing fields accurately", () => {
  // Scenario from prompt: Filled: Name, Email, Passport, Visa.
  // Missing: Bank Details, Father Name, Present/Current Address, Academic information.
  const result = ProfileCompletionEngine.evaluate({
    fullName: "John Doe",
    email: "john.doe@example.com",
    passportNumber: "P99887766",
    passportExpiry: "2030-01-01",
    visaNumber: "V11223344",
    visaExpiry: "2028-05-01"
  });

  assert.ok(result.missingItems.includes("Bank Details"), "Should detect missing Bank Details");
  assert.ok(result.missingItems.includes("Father Name"), "Should detect missing Father Name");
  assert.ok(result.missingItems.includes("Present/Current Address"), "Should detect missing Present Address");
  assert.ok(result.missingItems.includes("University Enrollment Number"), "Should detect missing Academic info");
  assert.ok(result.missingItems.includes("Academic Program"), "Should detect missing Program");
  assert.ok(!result.missingItems.includes("Student Email"), "Email is filled, should NOT be in missing");
  assert.ok(!result.missingItems.includes("Passport Number"), "Passport is filled, should NOT be in missing");
  assert.ok(!result.missingItems.includes("Visa Number"), "Visa is filled, should NOT be in missing");
});

// --------------------------------------------------------------------------
// TEST 3 & 4 — Bank Details Missing and Added
// --------------------------------------------------------------------------
test("Test 3 & 4 — Bank Details lifecycle: Appears when missing, disappears when added, increases %", () => {
  const baseStudent = {
    fullName: "Khadija Noor",
    nationalityCode: "PAK",
    dateOfBirth: "2001-04-12",
    gender: "female",
    maritalStatus: "single",
    bloodGroup: "B+",
    registrationNumber: "NFSU/2026/CS/202",
    programCode: "MSC_CYBER",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    admissionCategory: "direct",
    admissionAcademicYear: "2026-2027",
    lastEducationalQualification: "Bachelor of Computer Science",
    lastEducationalInstitution: "Lahore University",
    email: "khadija@example.com",
    phoneHome: "+92 300 1234567",
    permanentAddress: "Lahore, Pakistan",
    presentAddress: "Campus Hostel Block B",
    fatherName: "Noor Mohammed",
    motherName: "Fatima Noor",
    emergencyContactName: "Noor Mohammed",
    emergencyContactPhone: "+92 300 1234567",
    passportNumber: "PK123456",
    passportExpiry: "2031-01-01",
    visaNumber: "V556677",
    visaExpiry: "2028-08-01",
    efrroNumber: "E998811",
    efrroExpiry: "2027-08-01"
  };

  // Test 3: Bank Details missing
  const withoutBank = ProfileCompletionEngine.evaluate({
    ...baseStudent,
    bankDetails: null
  });
  assert.ok(withoutBank.missingItems.includes("Bank Details"), "Test 3: 'Bank Details' must appear in missingItems");
  const bankSectionWithout = withoutBank.sections.find(s => s.id === "bank");
  assert.equal(bankSectionWithout?.percentage, 0, "Bank section should be 0%");
  assert.ok(withoutBank.percentage < 100, "Overall percentage without bank must be < 100%");

  // Test 4: Bank Details added
  const withBank = ProfileCompletionEngine.evaluate({
    ...baseStudent,
    bankDetails: {
      bankName: "State Bank of India",
      accountNumber: "000192837465",
      ifscCode: "SBIN0001234",
      branchAddress: "Gandhinagar"
    }
  });
  assert.ok(!withBank.missingItems.includes("Bank Details"), "Test 4: 'Bank Details' must disappear from missingItems");
  const bankSectionWith = withBank.sections.find(s => s.id === "bank");
  assert.equal(bankSectionWith?.percentage, 100, "Bank section should be 100%");
  assert.ok(withBank.percentage > withoutBank.percentage, `Test 4: Percentage must increase (was ${withoutBank.percentage}%, now ${withBank.percentage}%)`);
  assert.equal(withBank.percentage, 100, "Fully populated student reaches 100%");
});

// --------------------------------------------------------------------------
// TEST 5 — Multiple Missing Fields Detected Dynamically
// --------------------------------------------------------------------------
test("Test 5 — Multiple missing fields: Detects all relevant missing fields without arbitrary truncation", () => {
  const result = ProfileCompletionEngine.evaluate({
    fullName: "Carlos Silva",
    nationalityCode: "BRA"
  });

  // Must detect more than 2 fields (previous bug showed only 2 hardcoded fields)
  assert.ok(result.missingItems.length > 5, `Must detect all missing fields (detected ${result.missingItems.length})`);
  assert.ok(result.missingItems.includes("University Enrollment Number"));
  assert.ok(result.missingItems.includes("Father Name"));
  assert.ok(result.missingItems.includes("Bank Details"));
  assert.ok(result.missingItems.includes("Present/Current Address"));
  assert.ok(result.missingItems.includes("Last Educational Qualification"));
  assert.ok(result.missingItems.includes("University/Institute/School Name"));
});

// --------------------------------------------------------------------------
// TEST 6 — Existing Optional Fields Remain Optional For Saving
// --------------------------------------------------------------------------
test("Test 6 — Optional fields: Saving without optional fields succeeds in Zod validation schemas", () => {
  const savePayload = {
    fullName: "Tenzin Wangchuk",
    nationalityCode: "BTN"
    // Bank details, parent details, present address, qualifications are intentionally omitted
  };

  const regResult = RegisterStudentValidationSchema.safeParse(savePayload);
  assert.equal(regResult.success, true, "RegisterStudentValidationSchema allows saving without optional fields");

  const updateResult = UpdateStudentValidationSchema.safeParse({
    fullName: "Tenzin Wangchuk"
  });
  assert.equal(updateResult.success, true, "UpdateStudentValidationSchema allows partial saves");
});

// --------------------------------------------------------------------------
// TEST 7 — Category-Specific Conditional Fields
// --------------------------------------------------------------------------
test("Test 7 — Category-specific fields: Excluded from denominator when not applicable", () => {
  // Direct student (not other, not iccr)
  const directStudent = ProfileCompletionEngine.evaluate({
    fullName: "Alice Smith",
    admissionCategory: "direct"
  });
  assert.ok(!directStudent.missingItems.includes("Admission Track Specification"), "Direct student does NOT require other specification");
  assert.ok(!directStudent.missingItems.includes("ICCR Scholarship Scheme"), "Direct student does NOT require ICCR scheme");

  // Other student -> requires specification
  const otherStudent = ProfileCompletionEngine.evaluate({
    fullName: "Bob Jones",
    admissionCategory: "other",
    admissionCategoryOther: null
  });
  assert.ok(otherStudent.missingItems.includes("Admission Track Specification"), "Other category requires track specification");

  // ICCR student -> requires ICCR scholarship scheme name
  const iccrStudent = ProfileCompletionEngine.evaluate({
    fullName: "Charlie Brown",
    admissionCategory: "iccr",
    iccrScholarshipSchemeName: null
  });
  assert.ok(iccrStudent.missingItems.includes("ICCR Scholarship Scheme"), "ICCR category requires scholarship scheme name");
});

// --------------------------------------------------------------------------
// TEST 8 — 100% Completed Profile
// --------------------------------------------------------------------------
test("Test 8 — 100% completed profile: Displays 'Complete Profile (100%)' with zero missing items", () => {
  const full = ProfileCompletionEngine.evaluate({
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    dateOfBirth: "2001-09-20",
    gender: "female",
    maritalStatus: "single",
    bloodGroup: "A+",
    registrationNumber: "NFSU/2026/INT/088",
    programCode: "MSC_FORENSIC",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    admissionCategory: "direct",
    admissionAcademicYear: "2026-2027",
    lastEducationalQualification: "High School Diploma",
    lastEducationalInstitution: "Moscow Secondary School 1",
    email: "elena.rostova@university.edu",
    phoneHome: "+7-999-1234567",
    permanentAddress: "Tverskaya St 12, Moscow, Russia",
    presentAddress: "Tverskaya St 12, Moscow, Russia",
    fatherName: "Dmitry Rostov",
    motherName: "Anna Rostova",
    emergencyContactName: "Dmitry Rostov",
    emergencyContactPhone: "+7-999-7654321",
    bankDetails: {
      bankName: "Sberbank",
      accountNumber: "40817810000000000000"
    },
    passportNumber: "75N1234567",
    passportExpiry: "2030-01-01",
    visaNumber: "V98765432",
    visaExpiry: "2028-08-01",
    efrroNumber: "FRRO998877",
    efrroExpiry: "2027-08-01"
  });

  assert.equal(full.percentage, 100, "Percentage should be 100%");
  assert.equal(full.status, "complete", "Status should be 'complete'");
  assert.equal(full.statusLabel, "Complete Profile", "Label should be 'Complete Profile'");
  assert.equal(full.missingItems.length, 0, "Zero missing items");
});

// --------------------------------------------------------------------------
// TEST 9 — Zero and False Handling
// --------------------------------------------------------------------------
test("Test 9 — Zero and False values: Boolean false and number 0 are counted as complete, not empty", () => {
  assert.equal(ProfileCompletionEngine.isPresent(false), true, "Boolean false is present");
  assert.equal(ProfileCompletionEngine.isPresent(true), true, "Boolean true is present");
  assert.equal(ProfileCompletionEngine.isPresent(0), true, "Number 0 is present");
  assert.equal(ProfileCompletionEngine.isPresent(""), false, "Empty string is not present");
  assert.equal(ProfileCompletionEngine.isPresent(null), false, "null is not present");
  assert.equal(ProfileCompletionEngine.isPresent(undefined), false, "undefined is not present");
});

// --------------------------------------------------------------------------
// TEST 10 — Whitespace and Placeholder Values
// --------------------------------------------------------------------------
test("Test 10 — Whitespace and Placeholders: Unassigned placeholders treated as empty", () => {
  assert.equal(ProfileCompletionEngine.isPresent("   "), false, "Whitespace is not present");
  assert.equal(ProfileCompletionEngine.isPresent("Not provided"), false, "'Not provided' is placeholder");
  assert.equal(ProfileCompletionEngine.isPresent("Not assigned yet"), false, "'Not assigned yet' is placeholder");
  assert.equal(ProfileCompletionEngine.isPresent("Not Specified"), false, "'Not Specified' is placeholder");
  assert.equal(ProfileCompletionEngine.isPresent("Pending"), false, "'Pending' is placeholder");
});

// --------------------------------------------------------------------------
// TEST 11 — Section-Level Completeness
// --------------------------------------------------------------------------
test("Test 11 — Section-level completeness: Calculates percentages per section correctly", () => {
  const result = ProfileCompletionEngine.evaluate({
    fullName: "Li Wei",
    nationalityCode: "CHN",
    dateOfBirth: "2002-11-05",
    gender: "male",
    maritalStatus: "single",
    bloodGroup: "O+",
    // Academic completely empty
    // Contact completely empty
    // Bank completely empty
  });

  const identitySec = result.sections.find(s => s.id === "identity");
  assert.equal(identitySec?.percentage, 100, "Identity section should be 100%");

  const academicSec = result.sections.find(s => s.id === "academic");
  assert.equal(academicSec?.percentage, 0, "Academic section should be 0%");

  const bankSec = result.sections.find(s => s.id === "bank");
  assert.equal(bankSec?.percentage, 0, "Bank section should be 0%");
});

// --------------------------------------------------------------------------
// TEST 12 — Structured Missing Summary
// --------------------------------------------------------------------------
test("Test 12 — Structured missing summary: Generates section-prefixed items for auditability", () => {
  const result = ProfileCompletionEngine.evaluate({
    fullName: "Amina Yusuf"
  });

  assert.ok(result.missingSummary.some(s => s.startsWith("Academic & Admission: ")), "Includes academic section prefix");
  assert.ok(result.missingSummary.some(s => s.startsWith("Bank Details: ")), "Includes bank section prefix");
  assert.ok(result.missingSummary.some(s => s.startsWith("Contact Coordinates: ")), "Includes contact section prefix");
});

// --------------------------------------------------------------------------
// TEST 13 — System Fields Never Appear in Missing Items
// --------------------------------------------------------------------------
test("Test 13 — System fields exclusion: Internal metadata columns never appear in missingItems", () => {
  const result = ProfileCompletionEngine.evaluate({
    fullName: "Test Student"
  });

  const bannedKeywords = ["id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "student_id", "status"];
  for (const item of result.missingItems) {
    assert.ok(!bannedKeywords.includes(item.toLowerCase()), `Banned system field '${item}' must not appear in missingItems`);
  }
});

console.log("\n============================================================");
console.log(` RESULTS: ${passed} passed, ${failed} failed`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
}
