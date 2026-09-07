/**
 * ISCMS Progressive / Incomplete Student Registration Test Suite
 * Tests minimum registration creation, progressive partial updates, strict format validation,
 * profile completion scoring, Excel bulk import progressive tolerance, and unassigned status handling.
 */

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
  console.log(" ISCMS PROGRESSIVE / INCOMPLETE REGISTRATION TEST SUITE");
  console.log("============================================================\n");

  // --------------------------------------------------------------------------
  // 1. MINIMUM REGISTRATION CREATION (Day 1 Scenario)
  // --------------------------------------------------------------------------
  console.log("[1] Minimum Registration Creation");

  const minNameResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Rahul Sharma"
  });
  assert(
    minNameResult.success,
    "Creating student with legal full name only succeeds without requiring other fields"
  );
  if (minNameResult.success) {
    assert(
      minNameResult.data.fullName === "Rahul Sharma",
      "Full name preserved correctly"
    );
    assert(
      minNameResult.data.registrationNumber === undefined,
      "Enrollment number is undefined (no fake auto-generated ID)"
    );
    assert(
      minNameResult.data.programCode === undefined,
      "Program code is optional and undefined"
    );
    assert(
      minNameResult.data.email === undefined,
      "Student email is optional and undefined"
    );
  }

  const nameDobResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Rahul Sharma",
    dateOfBirth: "2002-05-14"
  });
  assert(
    nameDobResult.success,
    "Creating student with name and date of birth only succeeds"
  );

  const nameNatResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Amina Yusuf",
    nationalityCode: "NGA"
  });
  assert(
    nameNatResult.success,
    "Creating student with name and nationality only succeeds"
  );

  const shortNameResult = RegisterStudentValidationSchema.safeParse({
    fullName: "R"
  });
  assert(
    !shortNameResult.success,
    "Creating student with name less than 2 characters is rejected"
  );

  const emptyNameResult = RegisterStudentValidationSchema.safeParse({
    fullName: "   "
  });
  assert(
    !emptyNameResult.success,
    "Creating student with whitespace-only name is rejected"
  );

  // --------------------------------------------------------------------------
  // 2. VALIDATION STRICTNESS (Allow Missing, Reject Invalid)
  // --------------------------------------------------------------------------
  console.log("\n[2] Validation Strictness: Allow Missing, Reject Invalid");

  const invalidEmailResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Rahul Sharma",
    email: "not-a-valid-email"
  });
  assert(
    !invalidEmailResult.success,
    "Supplying malformed email format is rejected"
  );
  if (!invalidEmailResult.success) {
    const issue = invalidEmailResult.error.issues.find(i => i.path.includes("email"));
    assert(
      !!issue && issue.message.includes("valid email address format"),
      "Error message explicitly identifies invalid email format"
    );
  }

  const validEmailResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Rahul Sharma",
    email: "rahul.sharma@university.ac.in"
  });
  assert(
    validEmailResult.success,
    "Supplying valid email format is accepted"
  );

  const futureDob = new Date();
  futureDob.setFullYear(futureDob.getFullYear() + 2);
  const futureDobResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Rahul Sharma",
    dateOfBirth: futureDob.toISOString().split("T")[0]
  });
  assert(
    !futureDobResult.success,
    "Supplying future date of birth is rejected"
  );

  const invalidPassDates = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    passportNumber: "P12345678",
    passportIssueDate: "2024-01-01",
    passportExpiry: "2023-01-01"
  });
  assert(
    !invalidPassDates.success,
    "Passport expiry date before issue date is rejected"
  );

  const invalidShortPhone = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    phoneHome: "123"
  });
  assert(
    !invalidShortPhone.success,
    "Phone number shorter than 7 digits is rejected"
  );

  // --------------------------------------------------------------------------
  // 3. PROGRESSIVE PARTIAL UPDATES
  // --------------------------------------------------------------------------
  console.log("\n[3] Progressive Partial Profile Updates");

  const updateAcademicOnly = UpdateStudentValidationSchema.safeParse({
    registrationNumber: "NFSU/2026/CS/101",
    programCode: "MSC_CYBER_SEC",
    admissionDate: "2026-08-01"
  });
  assert(
    updateAcademicOnly.success,
    "Updating academic fields succeeds without requiring contact or documents"
  );

  const updateContactOnly = UpdateStudentValidationSchema.safeParse({
    phoneHome: "+91-9876543210",
    email: "rahul.sharma@nfsu.ac.in"
  });
  assert(
    updateContactOnly.success,
    "Updating contact fields succeeds without requiring academic or personal fields"
  );

  const updateBadEmail = UpdateStudentValidationSchema.safeParse({
    email: "bad-email"
  });
  assert(
    !updateBadEmail.success,
    "Updating with invalid email format is rejected"
  );

  // --------------------------------------------------------------------------
  // 4. PROFILE COMPLETION ENGINE EVALUATION
  // --------------------------------------------------------------------------
  console.log("\n[4] Profile Completion Engine Evaluation");

  const minEval = ProfileCompletionEngine.evaluate({
    fullName: "Rahul Sharma"
  });
  assert(
    minEval.percentage >= 0 && minEval.percentage <= 25,
    `Minimal student has score ~0-25% (Actual: ${minEval.percentage}%)`
  );
  assert(
    minEval.status === "minimal",
    "Minimal student status is 'minimal'"
  );
  assert(
    minEval.statusLabel === "Minimal Identity Profile",
    "Minimal student label is 'Minimal Identity Profile'"
  );
  assert(
    minEval.missingItems.includes("University Enrollment Number"),
    "Missing items includes 'University Enrollment Number'"
  );
  assert(
    minEval.missingItems.includes("Academic Program"),
    "Missing items includes 'Academic Program'"
  );
  assert(
    minEval.missingItems.includes("Student Email"),
    "Missing items includes 'Student Email'"
  );

  const day5Eval = ProfileCompletionEngine.evaluate({
    fullName: "Rahul Sharma",
    nationalityCode: "IND",
    dateOfBirth: "2002-05-14",
    maritalStatus: "single",
    bloodGroup: "B+",
    registrationNumber: "NFSU/2026/CS/101",
    programCode: "MSC_CYBER",
    admissionCategory: "direct",
    admissionDate: "2026-08-01"
  });
  assert(
    day5Eval.percentage >= 25 && day5Eval.percentage < 75,
    `Day 5 student has partial score (Actual: ${day5Eval.percentage}%)`
  );
  assert(
    day5Eval.status === "incomplete" || day5Eval.status === "minimal",
    "Day 5 student status is evaluated progressively"
  );

  const completeEval = ProfileCompletionEngine.evaluate({
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    dateOfBirth: "2001-09-20",
    gender: "female",
    maritalStatus: "single",
    bloodGroup: "A+",
    physicalDisability: false,
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
  assert(
    completeEval.percentage === 100,
    "Fully populated student has 100% completion"
  );
  assert(
    completeEval.status === "complete",
    "Fully populated student status is 'complete'"
  );
  assert(
    completeEval.missingItems.length === 0,
    "No missing items for 100% completed profile"
  );

  // --------------------------------------------------------------------------
  // 5. BULK IMPORT PROGRESSIVE COMPLIANCE
  // --------------------------------------------------------------------------
  console.log("\n[5] Bulk Import Progressive Compliance");

  const mockRowsWithoutReg = [
    { "Full Name": "Carlos Mendoza", "Nationality": "MEX", "Program": "MSc Forensic Science", "Admission Date": "2026-08-01" }
  ];

  const valNoReg = await BulkStudentImportService.validateSpreadsheetData(
    mockRowsWithoutReg,
    {
      "Full Name": "full_name",
      "Nationality": "nationality",
      "Program": "academic_program",
      "Admission Date": "admission_date"
    },
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: [
        { programName: "MSc Forensic Science", programCode: "MSC_FORENSIC", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months" }
      ]
    }
  );

  assert(
    valNoReg.errorCount === 0 && valNoReg.validCount === 1,
    "Spreadsheet with missing enrollment number is valid (produces warning, not fatal error)"
  );
  assert(
    valNoReg.validCount === 1 && valNoReg.errorCount === 0,
    "1 valid row and 0 error rows"
  );
  assert(
    valNoReg.warningRowsCount >= 1,
    "Warning flag triggered for missing enrollment number"
  );

  const regWarning = valNoReg.rows[0].warnings.find(w => w.field === "registration_number");
  assert(
    !!regWarning && (regWarning.impact?.includes("Enrollment number is not provided yet") || regWarning.warning.includes("Enrollment number is not provided yet")),
    "Warning details correctly describe pending enrollment number"
  );

  const mockRowsWithoutProgram = [
    { "Full Name": "Amina Bello", "Nationality": "NGA", "Enrollment Number": "NFSU/2026/099" }
  ];

  const valNoProg = await BulkStudentImportService.validateSpreadsheetData(
    mockRowsWithoutProgram,
    {
      "Full Name": "full_name",
      "Nationality": "nationality",
      "Enrollment Number": "registration_number"
    },
    {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: []
    }
  );
  assert(
    valNoProg.errorCount === 0 && valNoProg.validCount === 1,
    "Spreadsheet with missing academic program is valid (produces warning, not fatal error)"
  );
  const progWarning = valNoProg.rows[0].warnings.find(w => w.field === "academic_program");
  assert(
    !!progWarning && (progWarning.impact?.includes("Academic program / course is not assigned yet") || progWarning.warning.includes("Academic program / course is not assigned yet")),
    "Warning details correctly describe pending academic program"
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
  console.error("Test execution failed:", err);
  process.exit(1);
});
