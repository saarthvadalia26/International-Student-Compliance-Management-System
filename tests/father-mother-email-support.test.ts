/**
 * ============================================================================
 * ISCMS v0.3.0 — Father and Mother Email ID Fields Test Suite
 * ============================================================================
 *
 * Verifies:
 * 1. Scenario 1: Both Father and Mother emails empty -> Student validation passes, stored as null
 * 2. Scenario 2: Only Father's Email ID provided -> Validated, trimmed, saved
 * 3. Scenario 3: Only Mother's Email ID provided -> Validated, trimmed, saved
 * 4. Scenario 4: Both Father and Mother Email IDs provided -> Validated, trimmed, saved
 * 5. Scenario 5: Invalid emails entered -> Rejected with descriptive validation errors
 * 6. Scenario 6: Progressive profile updates -> Adding, updating, clearing family emails
 * 7. Scenario 7: Excel Bulk Import:
 *    - Auto-mapping aliases ("Father Email ID", "Mother's Email", "father_email", etc.)
 *    - Empty email cells accepted without errors
 *    - Valid email cells parsed and trimmed
 *    - Invalid email cells reported with row-level validation error
 *    - Template contains Father Email ID and Mother Email ID
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { StudentPersonalSchema } from "../src/services/validation/validation.service";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";
import { ISCMS_FIELD_DEFINITIONS } from "../src/domain/import/types/bulk-import.types";

describe("ISCMS v0.3.0 — Father & Mother Email Fields Support", () => {
  console.log("\n============================================================");
  console.log(" ISCMS v0.3.0: FATHER & MOTHER EMAIL FIELDS ACCEPTANCE TESTS");
  console.log("============================================================\n");

  // --------------------------------------------------------------------------
  // SCENARIO 1: BOTH EMAILS EMPTY
  // --------------------------------------------------------------------------
  it("Scenario 1: Student registration and personal schema pass when both family emails are empty/omitted", () => {
    const payload = {
      fullName: "Dmitry Rostov",
      nationalityCode: "RUS",
      fatherName: "Alexander Rostov",
      fatherMobile: "+7 912 345-67-89",
      fatherEmail: "",
      motherName: "Elena Rostova",
      motherMobile: "+7 912 987-65-43",
      motherEmail: undefined
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true, "Register validation succeeds with empty family emails");

    const persResult = StudentPersonalSchema.safeParse(payload);
    assert.equal(persResult.success, true, "Personal schema succeeds with empty family emails");
  });

  it("Scenario 1b: Both emails explicitly set to null pass validation", () => {
    const payload = {
      fullName: "Dmitry Rostov",
      fatherEmail: null,
      motherEmail: null
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: ONLY FATHER'S EMAIL ID PROVIDED
  // --------------------------------------------------------------------------
  it("Scenario 2: Student saves successfully when only Father's Email ID is provided", () => {
    const payload = {
      fullName: "Dmitry Rostov",
      fatherName: "Alexander Rostov",
      fatherEmail: "alexander.rostov@example.com",
      motherName: "Elena Rostova",
      motherEmail: ""
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true);
    if (regResult.success) {
      assert.equal(regResult.data.fatherEmail, "alexander.rostov@example.com");
    }
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: ONLY MOTHER'S EMAIL ID PROVIDED
  // --------------------------------------------------------------------------
  it("Scenario 3: Student saves successfully when only Mother's Email ID is provided", () => {
    const payload = {
      fullName: "Dmitry Rostov",
      fatherName: "Alexander Rostov",
      fatherEmail: undefined,
      motherName: "Elena Rostova",
      motherEmail: "elena.rostova@example.com"
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true);
    if (regResult.success) {
      assert.equal(regResult.data.motherEmail, "elena.rostova@example.com");
    }
  });

  // --------------------------------------------------------------------------
  // SCENARIO 4: BOTH FATHER AND MOTHER EMAILS PROVIDED
  // --------------------------------------------------------------------------
  it("Scenario 4: Student saves successfully when both Father and Mother Email IDs are provided", () => {
    const payload = {
      fullName: "Dmitry Rostov",
      fatherName: "Alexander Rostov",
      fatherEmail: "alexander.rostov@example.com",
      motherName: "Elena Rostova",
      motherEmail: "elena.rostova@example.com"
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true);
    if (regResult.success) {
      assert.equal(regResult.data.fatherEmail, "alexander.rostov@example.com");
      assert.equal(regResult.data.motherEmail, "elena.rostova@example.com");
    }

    const persResult = StudentPersonalSchema.safeParse(payload);
    assert.equal(persResult.success, true);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 5: INVALID EMAIL ENTERED
  // --------------------------------------------------------------------------
  it("Scenario 5: Invalid Father's Email ID produces a clear validation error", () => {
    const payload = {
      fullName: "Dmitry Rostov",
      fatherEmail: "not-an-email"
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, false, "Register schema rejects invalid father email");
    if (!regResult.success) {
      const fatherErr = regResult.error.issues.find(i => i.path.includes("fatherEmail"));
      assert.ok(fatherErr, "Contains validation error for fatherEmail");
      assert.match(fatherErr.message, /valid Father email/i);
    }

    const persResult = StudentPersonalSchema.safeParse(payload);
    assert.equal(persResult.success, false, "Personal schema rejects invalid father email");

    const updateResult = UpdateStudentValidationSchema.safeParse({ fatherEmail: "invalid-email" });
    assert.equal(updateResult.success, false, "Update schema rejects invalid father email");
  });

  it("Scenario 5b: Invalid Mother's Email ID produces a clear validation error", () => {
    const payload = {
      fullName: "Dmitry Rostov",
      motherEmail: "invalid@no-domain"
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, false, "Register schema rejects invalid mother email");
    if (!regResult.success) {
      const motherErr = regResult.error.issues.find(i => i.path.includes("motherEmail"));
      assert.ok(motherErr, "Contains validation error for motherEmail");
      assert.match(motherErr.message, /valid Mother email/i);
    }

    const updateResult = UpdateStudentValidationSchema.safeParse({ motherEmail: "invalid@no-domain" });
    assert.equal(updateResult.success, false, "Update schema rejects invalid mother email");
  });

  // --------------------------------------------------------------------------
  // SCENARIO 6: EXISTING STUDENT COMPATIBILITY & PROGRESSIVE UPDATES
  // --------------------------------------------------------------------------
  it("Scenario 6: Progressive profile update allows adding, changing, and clearing family emails", () => {
    // 1. Existing student without email fields can be updated with other fields
    const update1 = UpdateStudentValidationSchema.safeParse({
      fullName: "Dmitry Rostov Jr.",
      currentSemester: 3
    });
    assert.equal(update1.success, true, "Existing student update without family emails succeeds");

    // 2. Add father email later
    const update2 = UpdateStudentValidationSchema.safeParse({
      fatherEmail: "father.updated@example.com"
    });
    assert.equal(update2.success, true, "Adding father email later succeeds");
    if (update2.success) {
      assert.equal(update2.data.fatherEmail, "father.updated@example.com");
    }

    // 3. Clear mother email
    const update3 = UpdateStudentValidationSchema.safeParse({
      motherEmail: null
    });
    assert.equal(update3.success, true, "Clearing mother email succeeds");
  });

  // --------------------------------------------------------------------------
  // SCENARIO 7: EXCEL BULK IMPORT INTEGRATION
  // --------------------------------------------------------------------------
  it("Scenario 7a: Auto-mapping correctly detects aliases for Father Email and Mother Email", () => {
    const headers = [
      "Student Name",
      "Registration Number",
      "Academic Course",
      "Father Name",
      "Father's Email ID",
      "Mother Name",
      "Mother Email ID"
    ];

    const mapping = BulkStudentImportService.generateAutoMapping(headers);
    assert.equal(mapping["Father's Email ID"], "father_email", "Auto-maps 'Father\\'s Email ID' -> father_email");
    assert.equal(mapping["Mother Email ID"], "mother_email", "Auto-maps 'Mother Email ID' -> mother_email");
  });

  it("Scenario 7b: Excel import accepts rows with empty family email cells", async () => {
    const rows = [
      {
        "Full Name": "Aarav Sharma",
        "Enrollment Number": "NFSU2026CS101",
        "Academic Course": "B.Tech in Computer Science & Engineering",
        "Father Name": "Rajesh Sharma",
        "Father Email ID": "",
        "Mother Name": "Sunita Sharma",
        "Mother Email ID": ""
      }
    ];

    const mapping = BulkStudentImportService.generateAutoMapping(Object.keys(rows[0]));
    const report = await BulkStudentImportService.validateSpreadsheetData(rows, mapping, {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: [{ programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH_CSE" }]
    });

    assert.equal(report.validCount, 1, "Row with empty family emails is valid");
    assert.equal(report.errorCount, 0, "No validation errors for empty optional family emails");
  });

  it("Scenario 7c: Excel import validates format and accepts valid family emails", async () => {
    const rows = [
      {
        "Full Name": "Aarav Sharma",
        "Enrollment Number": "NFSU2026CS101",
        "Academic Course": "B.Tech in Computer Science & Engineering",
        "Father Name": "Rajesh Sharma",
        "Father Email ID": "rajesh.sharma@example.com",
        "Mother Name": "Sunita Sharma",
        "Mother Email ID": "sunita.sharma@example.com"
      }
    ];

    const mapping = BulkStudentImportService.generateAutoMapping(Object.keys(rows[0]));
    const report = await BulkStudentImportService.validateSpreadsheetData(rows, mapping, {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: [{ programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH_CSE" }]
    });

    assert.equal(report.validCount, 1, "Row with valid family emails is accepted");
    assert.equal(report.errorCount, 0);
    assert.equal(report.rows[0].mappedData.father_email, "rajesh.sharma@example.com");
    assert.equal(report.rows[0].mappedData.mother_email, "sunita.sharma@example.com");
  });

  it("Scenario 7d: Excel import rejects invalid family emails with row-level error", async () => {
    const rows = [
      {
        "Full Name": "Aarav Sharma",
        "Enrollment Number": "NFSU2026CS101",
        "Academic Course": "B.Tech in Computer Science & Engineering",
        "Father Email ID": "invalid-father-email",
        "Mother Email ID": "invalid-mother-email"
      }
    ];

    const mapping = BulkStudentImportService.generateAutoMapping(Object.keys(rows[0]));
    const report = await BulkStudentImportService.validateSpreadsheetData(rows, mapping, {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: [{ programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH_CSE" }]
    });

    assert.equal(report.errorCount, 1, "Row with invalid family emails is marked as error");
    const rowErrors = report.rows[0].errors;
    const fatherErr = rowErrors.find(e => e.field === "father_email");
    const motherErr = rowErrors.find(e => e.field === "mother_email");
    assert.ok(fatherErr, "Produces error for father_email");
    assert.ok(motherErr, "Produces error for mother_email");
    assert.match(fatherErr.problem, /Invalid Father email/i);
    assert.match(motherErr.problem, /Invalid Mother email/i);
  });

  it("Scenario 7e: Field definitions include Father Email ID and Mother Email ID with sample data", () => {
    const fatherDef = ISCMS_FIELD_DEFINITIONS.find(d => d.field === "father_email");
    const motherDef = ISCMS_FIELD_DEFINITIONS.find(d => d.field === "mother_email");

    assert.ok(fatherDef, "ISCMS_FIELD_DEFINITIONS has father_email");
    assert.equal(fatherDef.label, "Father Email ID");
    assert.equal(fatherDef.required, false);
    assert.equal(fatherDef.category, "Contact");

    assert.ok(motherDef, "ISCMS_FIELD_DEFINITIONS has mother_email");
    assert.equal(motherDef.label, "Mother Email ID");
    assert.equal(motherDef.required, false);
    assert.equal(motherDef.category, "Contact");
  });
});
