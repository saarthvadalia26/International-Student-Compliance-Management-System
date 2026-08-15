import assert from "node:assert";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { RegisterStudentInput, UpdateStudentInput } from "../src/services/student/student.types";

// =========================================================================
// ISCMS PROGRESSIVE STUDENT REGISTRATION ACCEPTANCE TESTS
// =========================================================================

async function runTestSuite() {
  console.log("=======================================================");
  console.log("  ISCMS PROGRESSIVE STUDENT REGISTRATION TEST SUITE    ");
  console.log("=======================================================\n");

  // -------------------------------------------------------------
  // Test A: Minimal Registration (Only Genuinely Required Fields)
  // -------------------------------------------------------------
  console.log("--- Test A: Minimal Registration (Genuinely Required Only) ---");
  const minimalStudent: RegisterStudentInput = {
    registrationNumber: "NFSU/2026/CYBER/001",
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
    // All optional fields omitted: gender, phoneLocal, localAddress, emergency contact, passport, visa, embassy
  };

  const minResult = RegisterStudentValidationSchema.safeParse(minimalStudent);
  assert.strictEqual(minResult.success, true, "Minimal registration must succeed without optional fields");
  console.log("✅ [PASS] Minimal registration succeeds with only required identity and academic fields");

  // -------------------------------------------------------------
  // Test B: Partial Information (Some Optional Fields Provided)
  // -------------------------------------------------------------
  console.log("\n--- Test B: Partial Information (Documents / Contacts Omitted) ---");
  const partialStudent: RegisterStudentInput = {
    registrationNumber: "NFSU/2026/CYBER/002",
    fullName: "Mateo Hernandez",
    nationalityCode: "MEX",
    gender: "male",
    dateOfBirth: "2002-11-20",
    email: "mateo.h@nfsu.ac.in",
    phoneHome: "+52-55-12345678",
    phoneLocal: "+91-9876543210",
    permanentAddress: "Colonia Roma Norte, Ciudad de Mexico, Mexico",
    programCode: "M.Tech in Digital Forensics",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    currentSemester: 1,
    // Only passport metadata provided (no visa, no emergency contact, no local address)
    passportNumber: "MEX88776655",
    passportIssueDate: "2024-01-10",
    passportExpiry: "2034-01-09",
    passportPlaceOfIssue: "Mexico City"
  };

  const partialResult = RegisterStudentValidationSchema.safeParse(partialStudent);
  assert.strictEqual(partialResult.success, true, "Partial registration with passport metadata must succeed");
  console.log("✅ [PASS] Partial registration with document metadata but no emergency contacts succeeds");

  // -------------------------------------------------------------
  // Test C: Invalid Optional Information
  // -------------------------------------------------------------
  console.log("\n--- Test C: Invalid Optional Information (Format Validation) ---");
  const invalidOptionalStudent: RegisterStudentInput = {
    registrationNumber: "NFSU/2026/CYBER/003",
    fullName: "Lucas Dupont",
    nationalityCode: "FRA",
    dateOfBirth: "2001-09-15",
    email: "lucas.d@nfsu.ac.in",
    phoneHome: "+33-1-23456789",
    permanentAddress: "15 Rue de Rivoli, Paris, France",
    programCode: "B.Tech in Cyber Security & Forensic Science",
    admissionDate: "2026-08-01",
    expectedGraduation: "2030-06-30",
    // Invalid optional values:
    passportNumber: "AB", // Too short (< 5 chars)
    passportIssueDate: "2025-01-01",
    passportExpiry: "2024-01-01", // Expiry before issue date!
    relationshipName: "P", // Too short (< 2 chars)
    relationshipPhone: "123" // Too short (< 7 digits)
  };

  const invalidResult = RegisterStudentValidationSchema.safeParse(invalidOptionalStudent);
  assert.strictEqual(invalidResult.success, false, "Invalid optional field formats must trigger validation errors");
  
  if (!invalidResult.success) {
    const errorMap = invalidResult.error.issues.map(i => ({ path: i.path.join("."), message: i.message }));
    assert(errorMap.some(e => e.path.includes("passportNumber")), "Flags invalid passport number length");
    assert(errorMap.some(e => e.path.includes("passportExpiry")), "Flags passport expiry before issue date");
    assert(errorMap.some(e => e.path.includes("relationshipName")), "Flags short emergency contact name");
    assert(errorMap.some(e => e.path.includes("relationshipPhone")), "Flags short emergency contact phone");
  }
  console.log("✅ [PASS] Optional fields enforce format correctness when provided without accepting invalid data");

  // -------------------------------------------------------------
  // Test D: Complete Registration (All Fields Provided)
  // -------------------------------------------------------------
  console.log("\n--- Test D: Complete Registration (All Fields Provided) ---");
  const completeStudent: RegisterStudentInput = {
    registrationNumber: "NFSU/2026/CYBER/004",
    fullName: "Sunita Sharma",
    nationalityCode: "NPL",
    gender: "female",
    dateOfBirth: "2004-02-18",
    email: "sunita.s@nfsu.ac.in",
    phoneHome: "+977-1-4234567",
    phoneLocal: "+91-9811223344",
    permanentAddress: "Ward 4, Baluwatar, Kathmandu, Nepal",
    localAddress: "NFSU International Students Hostel, Block B, Room 204",
    programCode: "B.Tech in Cyber Security & Forensic Science",
    admissionDate: "2026-08-01",
    expectedGraduation: "2030-06-30",
    currentSemester: 1,
    relationshipType: "parent",
    relationshipName: "Ram Sharma",
    relationshipPhone: "+977-98-12345678",
    relationshipEmail: "ram.sharma@example.com",
    relationshipAddress: "Baluwatar, Kathmandu, Nepal",
    passportNumber: "NPL9988776",
    passportIssueDate: "2023-05-10",
    passportExpiry: "2033-05-09",
    passportPlaceOfIssue: "Kathmandu",
    visaNumber: "IND77665544",
    visaIssueDate: "2026-07-01",
    visaExpiry: "2027-06-30",
    visaType: "Student (S-1)",
    embassyName: "Embassy of Nepal",
    embassyAddress: "Barakhamba Road, New Delhi",
    embassyPhone: "+91-11-23329969"
  };

  const completeResult = RegisterStudentValidationSchema.safeParse(completeStudent);
  assert.strictEqual(completeResult.success, true, "Fully specified student registration must validate cleanly");
  console.log("✅ [PASS] Complete registration with all fields and documents validates 100% cleanly");

  // -------------------------------------------------------------
  // Test E: Progressive Student Editing via Update Schema
  // -------------------------------------------------------------
  console.log("\n--- Test E: Progressive Profile Completion via Update Schema ---");
  const updatePayload: UpdateStudentInput = {
    phoneLocal: "+91-9988776655",
    localAddress: "Hostel Block C, Room 102",
    academicStatus: "good_standing"
  };

  const updateResult = UpdateStudentValidationSchema.safeParse(updatePayload);
  assert.strictEqual(updateResult.success, true, "UpdateStudentValidationSchema accepts progressive additions");
  console.log("✅ [PASS] Staff can progressively complete missing profile details through the student profile");

  console.log("\n=======================================================");
  console.log("  ALL 5 PROGRESSIVE REGISTRATION TESTS PASSED (100%)    ");
  console.log("=======================================================\n");
}

runTestSuite().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
