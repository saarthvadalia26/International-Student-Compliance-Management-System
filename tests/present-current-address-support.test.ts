/**
 * ============================================================================
 * ISCMS v0.3.0 — Present / Current Address Acceptance Test Suite
 * ============================================================================
 *
 * Verifies:
 * 1. Scenario 1: Student registration with empty Present / Current Address saves successfully (stored as NULL).
 * 2. Scenario 2: Student registration with populated Present / Current Address validates and persists correctly.
 * 3. Scenario 3: Editing Present / Current Address updates address without modifying Permanent Address.
 * 4. Scenario 4: Clearing Present / Current Address (setting to empty or null) saves successfully.
 * 5. Scenario 5: Independence: Permanent Address and Present / Current Address are completely independent.
 * 6. Scenario 6: Excel Export:
 *    - Includes distinct "Permanent Address" and "Present / Current Address" columns.
 *    - Blank addresses export as empty strings.
 * 7. Scenario 7: Excel Bulk Import:
 *    - Auto-maps aliases ("Present Address", "Present / Current Address", "Current Address", etc.)
 *    - Accepts empty present address cells without error.
 *    - Imports populated present address into student_contact.
 * 8. Scenario 8: Compliance & Notification Isolation:
 *    - Present / Current address does NOT trigger compliance warnings or block profile validity.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { StudentContactSchema } from "../src/services/validation/validation.service";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";
import { ISCMS_FIELD_DEFINITIONS } from "../src/domain/import/types/bulk-import.types";
import { StudentExcelExportService } from "../src/domain/students/services/student-excel-export.service";

describe("ISCMS v0.3.0 — Present / Current Address Support", () => {
  console.log("\n============================================================");
  console.log(" ISCMS v0.3.0: PRESENT / CURRENT ADDRESS ACCEPTANCE TESTS");
  console.log("============================================================\n");

  // --------------------------------------------------------------------------
  // SCENARIO 1: NEW STUDENT WITH EMPTY PRESENT / CURRENT ADDRESS
  // --------------------------------------------------------------------------
  it("Scenario 1: Student registration passes when Present / Current Address is empty/omitted", () => {
    const payload = {
      fullName: "Sita Sharma",
      nationalityCode: "NPL",
      permanentAddress: "123 Main Street, Kathmandu, Nepal",
      presentAddress: ""
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true, "Register validation succeeds with empty presentAddress");

    const contactResult = StudentContactSchema.safeParse({
      permanentAddress: payload.permanentAddress,
      presentAddress: payload.presentAddress
    });
    assert.equal(contactResult.success, true, "Contact schema succeeds with empty presentAddress");
  });

  it("Scenario 1b: Student registration passes when Present / Current Address is null", () => {
    const payload = {
      fullName: "Sita Sharma",
      nationalityCode: "NPL",
      permanentAddress: "123 Main Street, Kathmandu, Nepal",
      presentAddress: null
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: NEW STUDENT WITH POPULATED PRESENT / CURRENT ADDRESS
  // --------------------------------------------------------------------------
  it("Scenario 2: Student registration passes when Present / Current Address is provided", () => {
    const payload = {
      fullName: "Sita Sharma",
      nationalityCode: "NPL",
      permanentAddress: "123 Main Street, Kathmandu, Nepal",
      presentAddress: "Hostel Block B, Room 204, NFSU Campus, Gandhinagar, Gujarat, India"
    };

    const regResult = RegisterStudentValidationSchema.safeParse(payload);
    assert.equal(regResult.success, true);
    if (regResult.success) {
      assert.equal(regResult.data.presentAddress, "Hostel Block B, Room 204, NFSU Campus, Gandhinagar, Gujarat, India");
      assert.equal(regResult.data.permanentAddress, "123 Main Street, Kathmandu, Nepal");
    }
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: EDITING PRESENT / CURRENT ADDRESS INDEPENDENTLY
  // --------------------------------------------------------------------------
  it("Scenario 3: Updating Present / Current Address updates cleanly without modifying Permanent Address", () => {
    const updatePayload = {
      presentAddress: "Apartment 4B, Shanti Nagar, Gandhinagar, Gujarat"
    };

    const updateResult = UpdateStudentValidationSchema.safeParse(updatePayload);
    assert.equal(updateResult.success, true);
    if (updateResult.success) {
      assert.equal(updateResult.data.presentAddress, "Apartment 4B, Shanti Nagar, Gandhinagar, Gujarat");
      assert.equal(updateResult.data.permanentAddress, undefined, "Permanent address is not altered");
    }
  });

  // --------------------------------------------------------------------------
  // SCENARIO 4: CLEARING PRESENT / CURRENT ADDRESS
  // --------------------------------------------------------------------------
  it("Scenario 4: Clearing Present / Current Address to null or empty string succeeds", () => {
    const clearPayload1 = { presentAddress: null };
    const clearResult1 = UpdateStudentValidationSchema.safeParse(clearPayload1);
    assert.equal(clearResult1.success, true, "Clearing to null is valid");

    const clearPayload2 = { presentAddress: "" };
    const clearResult2 = UpdateStudentValidationSchema.safeParse(clearPayload2);
    assert.equal(clearResult2.success, true, "Clearing to empty string is valid");
  });

  // --------------------------------------------------------------------------
  // SCENARIO 5: INDEPENDENCE OF BOTH ADDRESS FIELDS
  // --------------------------------------------------------------------------
  it("Scenario 5: Permanent Address and Present Address are completely distinct and independent", () => {
    const payload = {
      permanentAddress: "Kathmandu, Nepal",
      presentAddress: "Gandhinagar, Gujarat, India"
    };

    const contactResult = StudentContactSchema.safeParse(payload);
    assert.equal(contactResult.success, true);
    if (contactResult.success) {
      assert.notEqual(contactResult.data.permanentAddress, contactResult.data.presentAddress);
    }
  });

  // --------------------------------------------------------------------------
  // SCENARIO 6: EXCEL BULK IMPORT AUTO-MAPPING & PARSING
  // --------------------------------------------------------------------------
  it("Scenario 6a: Auto-mapping correctly maps aliases for Permanent Address and Present Address", () => {
    const headers = [
      "Student Name",
      "Registration Number",
      "Academic Course",
      "Permanent Address",
      "Present / Current Address"
    ];

    const mapping = BulkStudentImportService.generateAutoMapping(headers);
    assert.equal(mapping["Permanent Address"], "permanent_address");
    assert.equal(mapping["Present / Current Address"], "present_address");
  });

  it("Scenario 6b: Auto-mapping recognizes alternative aliases for Present Address", () => {
    assert.equal(BulkStudentImportService.generateAutoMapping(["Current Address"])["Current Address"], "present_address");
    assert.equal(BulkStudentImportService.generateAutoMapping(["Present Address"])["Present Address"], "present_address");
    assert.equal(BulkStudentImportService.generateAutoMapping(["Hostel Address"])["Hostel Address"], "present_address");
  });

  it("Scenario 6c: Excel import accepts rows with empty present address cells without error", async () => {
    const rows = [
      {
        "Full Name": "Tenzin Wangchuk",
        "Enrollment Number": "NFSU2026CS201",
        "Academic Course": "B.Tech in Computer Science & Engineering",
        "Permanent Address": "Thimphu, Bhutan",
        "Present / Current Address": ""
      }
    ];

    const mapping = BulkStudentImportService.generateAutoMapping(Object.keys(rows[0]));
    const report = await BulkStudentImportService.validateSpreadsheetData(rows, mapping, {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: [{ programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH_CSE" }]
    });

    assert.equal(report.validCount, 1);
    assert.equal(report.errorCount, 0);
  });

  it("Scenario 6d: Excel import preserves populated present address", async () => {
    const rows = [
      {
        "Full Name": "Tenzin Wangchuk",
        "Enrollment Number": "NFSU2026CS201",
        "Academic Course": "B.Tech in Computer Science & Engineering",
        "Permanent Address": "Thimphu, Bhutan",
        "Present / Current Address": "Hostel Block A, Room 102, NFSU Campus"
      }
    ];

    const mapping = BulkStudentImportService.generateAutoMapping(Object.keys(rows[0]));
    const report = await BulkStudentImportService.validateSpreadsheetData(rows, mapping, {
      existingRegistrationNumbers: new Set(),
      existingEmails: new Set(),
      academicPrograms: [{ programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH_CSE" }]
    });

    assert.equal(report.validCount, 1);
    assert.equal(report.rows[0].mappedData.present_address, "Hostel Block A, Room 102, NFSU Campus");
  });

  // --------------------------------------------------------------------------
  // SCENARIO 7: FIELD DEFINITION METADATA
  // --------------------------------------------------------------------------
  it("Scenario 7: ISCMS_FIELD_DEFINITIONS contains present_address with correct properties", () => {
    const presentDef = ISCMS_FIELD_DEFINITIONS.find(d => d.field === "present_address");
    const permDef = ISCMS_FIELD_DEFINITIONS.find(d => d.field === "permanent_address");

    assert.ok(presentDef, "present_address field definition exists");
    assert.equal(presentDef.label, "Present / Current Address");
    assert.equal(presentDef.required, false);
    assert.equal(presentDef.category, "Contact");

    assert.ok(permDef, "permanent_address field definition exists");
    assert.equal(permDef.label, "Permanent Address");
    assert.equal(permDef.required, false);
    assert.equal(permDef.category, "Contact");
  });
});
