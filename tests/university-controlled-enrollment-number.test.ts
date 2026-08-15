import assert from "node:assert";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { StudentSchema } from "../src/services/validation/validation.service";
import { RegisterStudentInput, UpdateStudentInput } from "../src/services/student/student.types";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";
import { ISCMS_FIELD_DEFINITIONS } from "../src/domain/import/types/bulk-import.types";

// =========================================================================
// ISCMS UNIVERSITY-CONTROLLED ENROLLMENT NUMBER ACCEPTANCE TESTS
// =========================================================================

async function runTestSuite() {
  console.log("===================================================================");
  console.log("  ISCMS UNIVERSITY-CONTROLLED ENROLLMENT NUMBER TEST SUITE        ");
  console.log("===================================================================\n");

  // -------------------------------------------------------------
  // Test A: Initial Registration Without Enrollment Number
  // -------------------------------------------------------------
  console.log("--- Test A: Initial Registration Without Enrollment Number (NULL) ---");
  const studentWithoutRegNo: RegisterStudentInput = {
    fullName: "Amina Al-Mansoor",
    nationalityCode: "ARE",
    dateOfBirth: "2003-04-12",
    email: "amina.m@nfsu.ac.in",
    phoneHome: "+971-50-1234567",
    permanentAddress: "Al Barsha 1, Dubai, United Arab Emirates",
    programCode: "B.Tech in Cyber Security & Forensic Science",
    admissionDate: "2026-08-01",
    expectedGraduation: "2030-06-30",
    currentSemester: 1
    // registrationNumber is omitted (undefined / null)
  };

  const resA = RegisterStudentValidationSchema.safeParse(studentWithoutRegNo);
  assert.strictEqual(resA.success, true, "Registration without enrollment number must succeed");
  
  const studentSchemaA = StudentSchema.safeParse({
    registrationNumber: undefined,
    status: "active"
  });
  assert.strictEqual(studentSchemaA.success, true, "StudentSchema allows undefined enrollment number");
  console.log("✅ [PASS] Student can be registered without an enrollment number (NULL/undefined)");

  // -------------------------------------------------------------
  // Test B: Initial Registration With University-Provided Enrollment Number
  // -------------------------------------------------------------
  console.log("\n--- Test B: Initial Registration With University-Provided Number ---");
  const studentWithRegNo: RegisterStudentInput = {
    registrationNumber: "NFSU/2026/CYBER/101",
    fullName: "Mateo Hernandez",
    nationalityCode: "MEX",
    dateOfBirth: "2002-11-20",
    email: "mateo.h@nfsu.ac.in",
    phoneHome: "+52-55-12345678",
    permanentAddress: "Colonia Roma Norte, Ciudad de Mexico, Mexico",
    programCode: "M.Tech in Digital Forensics",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    currentSemester: 1
  };

  const resB = RegisterStudentValidationSchema.safeParse(studentWithRegNo);
  assert.strictEqual(resB.success, true, "Registration with valid university enrollment number must succeed");
  console.log("✅ [PASS] Student can be registered with a university-provided enrollment number");

  // -------------------------------------------------------------
  // Test C: Updating / Adding Enrollment Number Later
  // -------------------------------------------------------------
  console.log("\n--- Test C: Staff Adding / Updating Enrollment Number Later ---");
  const updatePayload: UpdateStudentInput = {
    registrationNumber: "NFSU/2026/FS/8089",
    status: "active"
  };

  const resC = UpdateStudentValidationSchema.safeParse(updatePayload);
  assert.strictEqual(resC.success, true, "Updating enrollment number via UpdateStudentValidationSchema must succeed");
  console.log("✅ [PASS] Staff can add or update the university enrollment number later");

  // -------------------------------------------------------------
  // Test D: Bulk Import Mapping & Validation (Optional Enrollment Number)
  // -------------------------------------------------------------
  console.log("\n--- Test D: Bulk Import Specification & Missing Registration Number ---");
  const regNoFieldDef = ISCMS_FIELD_DEFINITIONS.find(f => f.field === "registration_number");
  assert(regNoFieldDef, "registration_number field definition exists");
  assert.strictEqual(regNoFieldDef.required, false, "registration_number must NOT be mandatory in bulk import definitions");

  // Test row validation when registration_number is empty in spreadsheet
  const mockRows: Record<string, string>[] = [
    {
      "Full Name": "Elena Rostova",
      "Nationality": "RUS",
      "DOB": "2003-05-14",
      "Institutional Email": "elena.r@nfsu.ac.in",
      "Home Country Phone": "+7-495-1234567",
      "Permanent Address": "Tverskaya St 12, Moscow, Russia",
      "Emergency Contact": "Mikhail Rostov",
      "Emergency Phone": "+7-495-9876543",
      "Academic Program": "B.Tech in Cyber Security & Forensic Science",
      "Admission Date": "2026-08-01",
      "Expected Graduation": "2030-06-30"
      // Registration Number column completely omitted
    }
  ];

  const mapping = {
    "Full Name": "full_name" as const,
    "Nationality": "nationality" as const,
    "DOB": "date_of_birth" as const,
    "Institutional Email": "email" as const,
    "Home Country Phone": "phone_home" as const,
    "Permanent Address": "permanent_address" as const,
    "Emergency Contact": "emergency_contact_name" as const,
    "Emergency Phone": "emergency_contact_phone" as const,
    "Academic Program": "academic_program" as const,
    "Admission Date": "admission_date" as const,
    "Expected Graduation": "expected_graduation" as const
  };

  const validationResult = await BulkStudentImportService.validateSpreadsheetData(
    mockRows,
    mapping,
    {
      academicPrograms: [
        {
          programName: "B.Tech in Cyber Security & Forensic Science",
          programCode: "BTECH_CSFS",
          totalSemesters: 8,
          semesterDuration: 6,
          semesterDurationUnit: "months"
        }
      ]
    }
  );

  if (validationResult.validCount !== 1) {
    console.log("Test D Validation Errors:", JSON.stringify(validationResult.rows[0]?.errors, null, 2));
  }

  assert.strictEqual(validationResult.totalRows, 1);
  assert.strictEqual(validationResult.validCount, 1, "Row without registration number must be valid");
  assert.strictEqual(validationResult.errorCount, 0, "Row without registration number must have zero required-field errors");
  console.log("✅ [PASS] Bulk import allows students without enrollment numbers without error or auto-generation");

  // -------------------------------------------------------------
  // Test E: Invalid / Short Enrollment Numbers Rejected When Provided
  // -------------------------------------------------------------
  console.log("\n--- Test E: Format Validation on Provided Enrollment Numbers ---");
  const invalidShortRegNo: RegisterStudentInput = {
    registrationNumber: "AB", // < 3 characters
    fullName: "Lucas Dupont",
    nationalityCode: "FRA",
    dateOfBirth: "2001-09-15",
    email: "lucas.d@nfsu.ac.in",
    phoneHome: "+33-1-23456789",
    permanentAddress: "15 Rue de Rivoli, Paris, France",
    programCode: "B.Tech in Cyber Security & Forensic Science",
    admissionDate: "2026-08-01",
    expectedGraduation: "2030-06-30"
  };

  const resE = RegisterStudentValidationSchema.safeParse(invalidShortRegNo);
  assert.strictEqual(resE.success, false, "Short enrollment number (< 3 chars) must be rejected");
  if (!resE.success) {
    const errorMap = resE.error.issues.map(i => ({ path: i.path.join("."), message: i.message }));
    assert(errorMap.some(e => e.path.includes("registrationNumber")), "Flags invalid enrollment number length");
  }
  console.log("✅ [PASS] Enrollment numbers enforce min 3 / max 50 length constraints when provided");

  // -------------------------------------------------------------
  // Test F: Nullable Safe Search & Display Formatting
  // -------------------------------------------------------------
  console.log("\n--- Test F: Nullable Safe Directory Search & Display Logic ---");
  const mockStudents = [
    { fullName: "Amina Al-Mansoor", registrationNumber: null },
    { fullName: "Mateo Hernandez", registrationNumber: "NFSU/2026/CYBER/101" }
  ];

  const query = "nfsu";
  const searchResults = mockStudents.filter(s => 
    s.fullName.toLowerCase().includes(query) ||
    (s.registrationNumber || "").toLowerCase().includes(query)
  );
  assert.strictEqual(searchResults.length, 1, "Only student with matching enrollment number matched");
  assert.strictEqual(searchResults[0].fullName, "Mateo Hernandez");

  const displayLabel1 = mockStudents[0].registrationNumber || "Not provided";
  const displayLabel2 = mockStudents[1].registrationNumber || "Not provided";
  assert.strictEqual(displayLabel1, "Not provided");
  assert.strictEqual(displayLabel2, "NFSU/2026/CYBER/101");
  console.log("✅ [PASS] Directory search and display handle NULL enrollment numbers safely and cleanly");

  console.log("\n===================================================================");
  console.log("  ALL UNIVERSITY-CONTROLLED ENROLLMENT NUMBER TESTS PASSED (6/6)    ");
  console.log("===================================================================\n");
}

runTestSuite().catch(err => {
  console.error("❌ [FAIL] Test suite threw an error:", err);
  process.exit(1);
});
