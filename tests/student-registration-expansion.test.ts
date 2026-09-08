/**
 * ISCMS Student Registration Information Expansion Test Suite
 * 
 * Verifies:
 * 1. Dynamic Chronological Age Engine (Exact leap years, before/after birthday, formatting)
 * 2. Extended Demographic Validation (Marital status, blood group, physical disability 3-state)
 * 3. Family Contacts (Father & Mother names, independent mobiles & WhatsApp channels)
 * 4. Expanded Emergency Relationships (Spouse, husband, wife, sibling, guardian, sponsor)
 * 5. Conditional Admission Categories (ICCR -> SII Application Number, Other -> Specify custom track)
 * 6. Progressive Incomplete Profile Preservation
 * 7. Profile Completion Scoring with expanded metrics
 * 8. Bulk Import Auto-mapping & Row Validation with expanded fields
 */

import "./test-preload";
import { 
  calculateAge, 
  formatAgeDisplay, 
  MARITAL_STATUS_OPTIONS, 
  BLOOD_GROUP_OPTIONS, 
  RELATIONSHIP_TYPE_OPTIONS, 
  ADMISSION_CATEGORY_OPTIONS 
} from "../src/domain/students/types/registration-expansion.types";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { ProfileCompletionEngine } from "../src/domain/students/services/profile-completion.service";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, errorDetail || "");
    failedTests++;
  }
}

async function runTestSuite() {
  console.log("\n============================================================");
  console.log(" ISCMS STUDENT REGISTRATION EXPANSION TEST SUITE");
  console.log("============================================================\n");

  // --------------------------------------------------------------------------
  // 1. DYNAMIC AGE ENGINE & DATE COMPUTATION
  // --------------------------------------------------------------------------
  console.log("[1] Dynamic Chronological Age Engine");

  // Specified Prompt Example: DOB 24 Aug 2002
  const dob2002 = "2002-08-24";
  const asOfBeforeBday = new Date("2026-08-23T00:00:00Z");
  const asOfOnBday = new Date("2026-08-24T00:00:00Z");
  const asOfAfterBday = new Date("2026-08-25T00:00:00Z");

  const ageBefore = calculateAge(dob2002, asOfBeforeBday);
  assert(ageBefore === 23, "DOB 24 Aug 2002 on 23 Aug 2026 is exactly 23 years old (day before birthday)");

  const ageOn = calculateAge(dob2002, asOfOnBday);
  assert(ageOn === 24, "DOB 24 Aug 2002 on 24 Aug 2026 is exactly 24 years old (on birthday)");

  const ageAfter = calculateAge(dob2002, asOfAfterBday);
  assert(ageAfter === 24, "DOB 24 Aug 2002 on 25 Aug 2026 is exactly 24 years old (day after birthday)");

  // Formatting strings
  const displayBefore = formatAgeDisplay(dob2002, asOfBeforeBday);
  assert(
    displayBefore?.fullText === "23 years (As of 23 Aug 2026)",
    `Display before birthday is formatted as expected: "${displayBefore?.fullText}"`
  );

  const displayOn = formatAgeDisplay(dob2002, asOfOnBday);
  assert(
    displayOn?.fullText === "24 years (As of 24 Aug 2026)",
    `Display on birthday is formatted as expected: "${displayOn?.fullText}"`
  );

  // Leap Year Birth: 29 Feb 2000
  const leapDob = "2000-02-29";
  const leap2024Before = new Date("2024-02-28T00:00:00Z");
  const leap2024On = new Date("2024-02-29T00:00:00Z");
  const leap2024After = new Date("2024-03-01T00:00:00Z");

  assert(calculateAge(leapDob, leap2024Before) === 23, "Leap year birth 29 Feb 2000 on 28 Feb 2024 is 23 years old");
  assert(calculateAge(leapDob, leap2024On) === 24, "Leap year birth 29 Feb 2000 on 29 Feb 2024 is 24 years old");
  assert(calculateAge(leapDob, leap2024After) === 24, "Leap year birth 29 Feb 2000 on 1 Mar 2024 is 24 years old");

  // Invalid / Null / Future dates
  assert(calculateAge(null) === null, "Null DOB returns null age");
  assert(calculateAge("") === null, "Empty DOB returns null age");
  assert(calculateAge("invalid-date") === null, "Invalid DOB string returns null age");
  assert(calculateAge("2099-01-01", new Date("2026-08-23T00:00:00Z")) === null, "Future DOB returns null age");

  // --------------------------------------------------------------------------
  // 2. EXTENDED DEMOGRAPHIC VALIDATION
  // --------------------------------------------------------------------------
  console.log("\n[2] Extended Demographic Validation (Marital Status, Blood Group, Disability)");

  // Valid marital statuses
  for (const opt of MARITAL_STATUS_OPTIONS) {
    const res = RegisterStudentValidationSchema.safeParse({
      fullName: "Test Student",
      maritalStatus: opt.value
    });
    assert(res.success, `Marital status "${opt.value}" (${opt.label}) is accepted`);
  }

  const invalidMarital = RegisterStudentValidationSchema.safeParse({
    fullName: "Test Student",
    maritalStatus: "unmarried" // Non-canonical value
  });
  assert(!invalidMarital.success, "Non-canonical marital status 'unmarried' is rejected by schema");

  // Valid blood groups
  for (const opt of BLOOD_GROUP_OPTIONS) {
    const res = RegisterStudentValidationSchema.safeParse({
      fullName: "Test Student",
      bloodGroup: opt.value
    });
    assert(res.success, `Blood group "${opt.value}" is accepted`);
  }

  const invalidBlood = RegisterStudentValidationSchema.safeParse({
    fullName: "Test Student",
    bloodGroup: "C+"
  });
  assert(!invalidBlood.success, "Invalid blood group 'C+' is rejected by schema");

  // Physical disability 3-state boolean (true, false, null, undefined)
  const disTrue = RegisterStudentValidationSchema.safeParse({
    fullName: "Test Student",
    physicalDisability: true
  });
  assert(disTrue.success && disTrue.data.physicalDisability === true, "Physical disability true is accepted");

  const disFalse = RegisterStudentValidationSchema.safeParse({
    fullName: "Test Student",
    physicalDisability: false
  });
  assert(disFalse.success && disFalse.data.physicalDisability === false, "Physical disability false is accepted");

  const disNull = RegisterStudentValidationSchema.safeParse({
    fullName: "Test Student",
    physicalDisability: null
  });
  assert(disNull.success && disNull.data.physicalDisability === null, "Physical disability null is accepted");

  const disUndef = RegisterStudentValidationSchema.safeParse({
    fullName: "Test Student"
  });
  assert(disUndef.success && disUndef.data.physicalDisability === undefined, "Physical disability omitted/undefined is accepted");

  // --------------------------------------------------------------------------
  // 3. FAMILY CONTACT DETAILS (Father & Mother)
  // --------------------------------------------------------------------------
  console.log("\n[3] Family Contact Details (Father & Mother Information)");

  const familyValid = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    fatherName: "Dmitry Rostov",
    fatherMobile: "+7 912 345 6789",
    fatherWhatsapp: "+7 912 345 6789",
    motherName: "Anna Rostova",
    motherMobile: "+7 912 987 6543",
    motherWhatsapp: "+7 912 987 6543"
  });
  assert(familyValid.success, "Complete father and mother contact information is accepted");
  if (familyValid.success) {
    assert(familyValid.data.fatherName === "Dmitry Rostov", "Father name is stored correctly");
    assert(familyValid.data.motherName === "Anna Rostova", "Mother name is stored correctly");
    assert(familyValid.data.fatherWhatsapp === "+7 912 345 6789", "Father WhatsApp is stored correctly");
  }

  const partialFamily = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    fatherName: "Dmitry Rostov"
    // Father mobile and mother fields omitted
  });
  assert(partialFamily.success, "Partial family information (only father name) is accepted without requiring all family fields");

  // --------------------------------------------------------------------------
  // 4. CANONICAL EMERGENCY RELATIONSHIPS
  // --------------------------------------------------------------------------
  console.log("\n[4] Canonical Emergency Relationship Types");

  const expandedRelationships = ["parent", "guardian", "local_sponsor", "brother", "sister", "husband", "wife", "spouse", "father", "mother", "other"];
  for (const rel of expandedRelationships) {
    const res = RegisterStudentValidationSchema.safeParse({
      fullName: "Test Student",
      emergencyContactRelation: rel
    });
    assert(res.success, `Relationship type "${rel}" is valid`);
  }

  // --------------------------------------------------------------------------
  // 5. CONDITIONAL ADMISSION CATEGORY VALIDATION
  // --------------------------------------------------------------------------
  // ICCR without SII Application Number -> Must Pass (Optional)
  const iccrWithoutSii = RegisterStudentValidationSchema.safeParse({
    fullName: "Kofi Annan",
    admissionCategory: "iccr",
    siiApplicationNumber: ""
  });
  assert(iccrWithoutSii.success, "Admission Category ICCR without SII Application Number is accepted (optional)");

  // ICCR with SII Application Number -> Must Pass
  const iccrWithSii = RegisterStudentValidationSchema.safeParse({
    fullName: "Kofi Annan",
    admissionCategory: "iccr",
    siiApplicationNumber: "SII-2026-GH-99182"
  });
  assert(iccrWithSii.success, "Admission Category ICCR with valid SII Application Number is accepted");

  // Other without Specification -> Must Fail
  const otherWithoutSpec = RegisterStudentValidationSchema.safeParse({
    fullName: "Jean Dupont",
    admissionCategory: "other",
    admissionCategoryOther: ""
  });
  assert(!otherWithoutSpec.success, "Admission Category 'Other' without specification description is rejected");

  // Other with Specification -> Must Pass
  const otherWithSpec = RegisterStudentValidationSchema.safeParse({
    fullName: "Jean Dupont",
    admissionCategory: "other",
    admissionCategoryOther: "French Embassy Dual-Degree Scholarship Track"
  });
  assert(otherWithSpec.success, "Admission Category 'Other' with specification description is accepted");

  // Direct Admission / Foreign Govt -> SII Application Number is optional
  const directAdmission = RegisterStudentValidationSchema.safeParse({
    fullName: "Liam Smith",
    admissionCategory: "direct"
  });
  assert(directAdmission.success, "Admission Category 'direct' without SII Application Number is accepted");

  // --------------------------------------------------------------------------
  // 6. PROGRESSIVE INCOMPLETE PROFILE PRESERVATION
  // --------------------------------------------------------------------------
  console.log("\n[6] Progressive Incomplete Registration Preservation");

  const minStudent = RegisterStudentValidationSchema.safeParse({
    fullName: "Tenzin Dorji"
  });
  assert(minStudent.success, "Minimal student with only full legal name is completely valid");

  const updateStudentRes = UpdateStudentValidationSchema.safeParse({
    fullName: "Tenzin Dorji",
    maritalStatus: "single",
    bloodGroup: "B+",
    physicalDisability: false,
    admissionCategory: "direct"
  });
  assert(updateStudentRes.success, "Progressively updating student profile with new demographic fields succeeds");

  // --------------------------------------------------------------------------
  // 7. PROFILE COMPLETION SCORING
  // --------------------------------------------------------------------------
  console.log("\n[7] Profile Completion Engine with Expanded Fields");

  const bareProfile = ProfileCompletionEngine.evaluate({
    fullName: "Minimal Student",
    nationalityCode: null,
    dateOfBirth: null,
    gender: null,
    programCode: null,
    admissionDate: null,
    expectedGraduation: null,
    email: null,
    phoneHome: null,
    permanentAddress: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    passportNumber: null,
    passportExpiry: null,
    visaNumber: null,
    visaExpiry: null,
    efrroNumber: null,
    efrroExpiry: null
  });

  const fullProfile = ProfileCompletionEngine.evaluate({
    fullName: "Complete Student",
    registrationNumber: "NFSU/2026/CS/101",
    nationalityCode: "NPL",
    dateOfBirth: "2002-05-14",
    gender: "male",
    maritalStatus: "single",
    bloodGroup: "O+",
    physicalDisability: false,
    programCode: "BTECH_CSE",
    admissionDate: "2024-08-01",
    expectedGraduation: "2028-06-30",
    admissionCategory: "iccr",
    siiApplicationNumber: "SII-2026-98124",
    iccrScholarshipSchemeName: "Atal Bihari Vajpayee General Scholarship Scheme",
    admissionAcademicYear: "2024-2025",
    lastEducationalQualification: "Higher Secondary",
    lastEducationalInstitution: "Kathmandu Model College",
    email: "student@example.com",
    phoneHome: "+977 9812345678",
    permanentAddress: "Kathmandu, Nepal",
    presentAddress: "Kathmandu, Nepal",
    fatherName: "Father Name",
    motherName: "Mother Name",
    emergencyContactName: "Guardian Name",
    emergencyContactPhone: "+977 9800000000",
    bankDetails: {
      bankName: "Nepal Bank",
      accountNumber: "98765432101"
    },
    passportNumber: "P1234567",
    passportExpiry: "2030-01-01",
    visaNumber: "V9876543",
    visaExpiry: "2028-08-01",
    efrroNumber: "E555555",
    efrroExpiry: "2027-01-01",
    embassyName: "Embassy of Nepal",
    embassyAddress: "Barakhamba Road, New Delhi"
  });

  assert(bareProfile.percentage < fullProfile.percentage, `Profile completion score increases: ${bareProfile.percentage}% -> ${fullProfile.percentage}%`);
  assert(fullProfile.percentage === 100, `Fully populated student profile reaches 100%: ${fullProfile.percentage}%`);

  // --------------------------------------------------------------------------
  // 8. BULK IMPORT VALIDATION WITH EXPANDED COLUMNS
  // --------------------------------------------------------------------------
  console.log("\n[8] Bulk Import Auto-Mapping & Validation");

  const testMapping = BulkStudentImportService.generateAutoMapping([
    "Registration Number",
    "Student Name",
    "Date of Birth",
    "Age",
    "Blood Group",
    "Marital Status",
    "Disability",
    "Father Name",
    "Father Mobile",
    "Mother Name",
    "Admission Category",
    "SII Application Number"
  ]);

  assert(testMapping["Registration Number"] === "registration_number", "Auto-maps 'Registration Number'");
  assert(testMapping["Student Name"] === "full_name", "Auto-maps 'Student Name'");
  assert(testMapping["Age"] === "age", "Auto-maps 'Age'");
  assert(testMapping["Blood Group"] === "blood_group", "Auto-maps 'Blood Group'");
  assert(testMapping["Marital Status"] === "marital_status", "Auto-maps 'Marital Status'");
  assert(testMapping["Disability"] === "physical_disability", "Auto-maps 'Disability'");
  assert(testMapping["Father Name"] === "father_name", "Auto-maps 'Father Name'");
  assert(testMapping["Admission Category"] === "admission_category", "Auto-maps 'Admission Category'");
  assert(testMapping["SII Application Number"] === "sii_application_number", "Auto-maps 'SII Application Number'");

  const validationResult = await BulkStudentImportService.validateSpreadsheetData(
    [
      {
        "Registration Number": "NFSU/2026/001",
        "Student Name": "Maya Sharma",
        "Date of Birth": "2003-04-12",
        "Age": "23",
        "Blood Group": "B+",
        "Marital Status": "Single",
        "Disability": "No",
        "Father Name": "Ramesh Sharma",
        "Father Mobile": "+977-9811111111",
        "Mother Name": "Gita Sharma",
        "Admission Category": "ICCR",
        "SII Application Number": "SII-2026-88776"
      },
      {
        "Registration Number": "NFSU/2026/002",
        "Student Name": "Invalid ICCR Student",
        "Admission Category": "ICCR",
        "SII Application Number": "" // Missing mandatory SII number for ICCR
      }
    ],
    testMapping,
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: []
    }
  );

  assert(validationResult.rows[0].status === "valid", "Valid row with expanded demographic and ICCR info passes");
  assert(
    validationResult.rows[0].warnings.some(w => w.field === "age"),
    "Row with Age column receives warning that age is calculated dynamically from DOB"
  );
  assert(
    validationResult.rows[1].status === "valid",
    "ICCR row with empty SII Application Number is valid in bulk validation (optional)"
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n============================================================");
  console.log(` RESULTS: ${passedTests} passed, ${failedTests} failed`);
  console.log("============================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
