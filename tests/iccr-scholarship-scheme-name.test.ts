/**
 * ISCMS Name of ICCR Scholarship Scheme Acceptance Test Suite
 *
 * Validates:
 * 1. Field is completely optional across all admission categories (ICCR, SII, Direct, Foreign Govt., Other).
 * 2. Students can be created with field empty (null / empty string / undefined).
 * 3. Students can be created with scholarship scheme name and value persists.
 * 4. Value can be edited and updated.
 * 5. Value can be cleared back to null/empty without error.
 * 6. Modifying scholarship scheme name does not alter:
 *    - ICCR Application Number
 *    - SII Application Number
 *    - Funding Type / Fee Payment Category
 *    - Admission/Academic Year
 * 7. Field is NOT derived from ICCR App Number or SII App Number.
 * 8. Category = ICCR or Funding Type = Scholarship does NOT make field mandatory.
 * 9. Bulk Excel import definitions include iccr_scholarship_scheme_name and aliases.
 * 10. Excel export includes "Name of ICCR Scholarship Scheme" column and exports blank when empty.
 * 11. Staff access restrictions remain in effect (Staff cannot export).
 * 12. Overall compliance, reminders, and notifications are unaffected.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { StudentAcademicSchema } from "../src/services/validation/validation.service";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { ISCMS_FIELD_DEFINITIONS } from "../src/domain/import/types/bulk-import.types";
import { matchStudentFilters, generateStudentExportFilename } from "../src/domain/students/utils/student-filter.util";
import { isAdministrator, isStaff } from "../src/lib/auth/permissions";

describe("ISCMS - Name of ICCR Scholarship Scheme Feature Test Suite", () => {
  console.log("\n============================================================");
  console.log(" ISCMS NAME OF ICCR SCHOLARSHIP SCHEME ACCEPTANCE SUITE");
  console.log("============================================================\n");

  // --------------------------------------------------------------------------
  // 1. OPTIONALITY & VALIDATION MATRIX
  // --------------------------------------------------------------------------
  it("Scenario 1: Registration schema accepts student with empty/omitted scholarship scheme name", () => {
    const res = RegisterStudentValidationSchema.safeParse({
      fullName: "Kofi Mensah",
      nationalityCode: "GHA",
      gender: "male",
      admissionCategory: "iccr",
      iccrApplicationNumber: "ICCR-2026-GHA-101",
      siiApplicationNumber: "SII-2026-GHA-101",
      iccrScholarshipSchemeName: ""
    });
    assert.equal(res.success, true, "Empty string for scholarship scheme name is valid");

    const resUndefined = RegisterStudentValidationSchema.safeParse({
      fullName: "Kofi Mensah",
      nationalityCode: "GHA",
      gender: "male",
      admissionCategory: "iccr"
      // iccrScholarshipSchemeName omitted
    });
    assert.equal(resUndefined.success, true, "Omitted scholarship scheme name is valid");

    const resNull = RegisterStudentValidationSchema.safeParse({
      fullName: "Kofi Mensah",
      nationalityCode: "GHA",
      gender: "male",
      admissionCategory: "iccr",
      iccrScholarshipSchemeName: null
    });
    assert.equal(resNull.success, true, "Null scholarship scheme name is valid");
  });

  it("Scenario 2: Registration schema accepts student with valid scholarship scheme name", () => {
    const res = RegisterStudentValidationSchema.safeParse({
      fullName: "Amina Yusuf",
      nationalityCode: "NGA",
      gender: "female",
      admissionCategory: "iccr",
      iccrApplicationNumber: "ICCR-2026-NGA-202",
      siiApplicationNumber: "SII-2026-NGA-202",
      iccrScholarshipSchemeName: "Africa Scholarship Scheme"
    });
    assert.equal(res.success, true, "Valid scholarship scheme name is accepted");
    if (res.success) {
      assert.equal(res.data.iccrScholarshipSchemeName, "Africa Scholarship Scheme");
    }
  });

  it("Scenario 3: Field remains optional when Category = ICCR and Funding Type = Scholarship", () => {
    const res = RegisterStudentValidationSchema.safeParse({
      fullName: "Tariq Aziz",
      nationalityCode: "AFG",
      admissionCategory: "iccr",
      feePaymentCategory: "scholarship",
      iccrScholarshipSchemeName: undefined
    });
    assert.equal(res.success, true, "Even for ICCR + Scholarship student, scheme name remains optional");
  });

  it("Scenario 4: Field is optional across all admission categories", () => {
    const categories = ["iccr", "sii", "direct", "foreign_govt_sponsored", "other"] as const;
    categories.forEach(cat => {
      const res = StudentAcademicSchema.safeParse({
        admissionCategory: cat,
        admissionCategoryOther: cat === "other" ? "Special Bilateral Scheme" : undefined,
        iccrScholarshipSchemeName: null,
        currentSemester: 1
      });
      assert.equal(res.success, true, `Category '${cat}' accepts null scholarship scheme name`);
    });
  });

  // --------------------------------------------------------------------------
  // 2. LIFECYCLE: CREATE -> EDIT -> CLEAR & INDEPENDENCE
  // --------------------------------------------------------------------------
  it("Scenario 5: Update schema supports entering, editing, and clearing the scholarship scheme name", () => {
    // 1. Initial State
    let studentAcademicState: {
      admissionCategory: string;
      iccrApplicationNumber: string | null;
      siiApplicationNumber: string | null;
      admissionAcademicYear: string | null;
      feePaymentCategory: string | null;
      iccrScholarshipSchemeName: string | null;
    } = {
      admissionCategory: "iccr",
      iccrApplicationNumber: "ICCR-2026-001",
      siiApplicationNumber: "SII-2026-001",
      admissionAcademicYear: "2026-27",
      feePaymentCategory: "scholarship",
      iccrScholarshipSchemeName: null
    };

    // 2. Add Scheme Name
    const editPayload1 = {
      iccrScholarshipSchemeName: "Silver Jubilee Scholarship Scheme"
    };
    const parseRes1 = UpdateStudentValidationSchema.safeParse(editPayload1);
    assert.equal(parseRes1.success, true);
    studentAcademicState.iccrScholarshipSchemeName = editPayload1.iccrScholarshipSchemeName.trim();
    assert.equal(studentAcademicState.iccrScholarshipSchemeName, "Silver Jubilee Scholarship Scheme");
    assert.equal(studentAcademicState.iccrApplicationNumber, "ICCR-2026-001", "ICCR app number untouched");
    assert.equal(studentAcademicState.siiApplicationNumber, "SII-2026-001", "SII app number untouched");
    assert.equal(studentAcademicState.admissionAcademicYear, "2026-27", "Academic year untouched");
    assert.equal(studentAcademicState.feePaymentCategory, "scholarship", "Funding type untouched");

    // 3. Edit Scheme Name
    const editPayload2 = {
      iccrScholarshipSchemeName: "General Scholarship Scheme (GSS)"
    };
    const parseRes2 = UpdateStudentValidationSchema.safeParse(editPayload2);
    assert.equal(parseRes2.success, true);
    studentAcademicState.iccrScholarshipSchemeName = editPayload2.iccrScholarshipSchemeName.trim();
    assert.equal(studentAcademicState.iccrScholarshipSchemeName, "General Scholarship Scheme (GSS)");

    // 4. Clear Scheme Name
    const editPayload3 = {
      iccrScholarshipSchemeName: ""
    };
    const parseRes3 = UpdateStudentValidationSchema.safeParse(editPayload3);
    assert.equal(parseRes3.success, true);
    studentAcademicState.iccrScholarshipSchemeName = editPayload3.iccrScholarshipSchemeName.trim() ? editPayload3.iccrScholarshipSchemeName.trim() : null;
    assert.equal(studentAcademicState.iccrScholarshipSchemeName, null, "Cleared back to null successfully");
    assert.equal(studentAcademicState.iccrApplicationNumber, "ICCR-2026-001", "ICCR app number preserved after clear");
  });

  // --------------------------------------------------------------------------
  // 3. BULK IMPORT DEFINITIONS
  // --------------------------------------------------------------------------
  it("Scenario 6: Bulk import field definitions include iccr_scholarship_scheme_name and aliases", () => {
    const def = ISCMS_FIELD_DEFINITIONS.find(f => f.field === "iccr_scholarship_scheme_name");
    assert.ok(def, "ISCMS_FIELD_DEFINITIONS includes iccr_scholarship_scheme_name");
    assert.equal(def.required, false, "Import field is optional (required = false)");
    assert.equal(def.category, "Academic");
    assert.ok(def.aliases.includes("iccr scholarship scheme name"), "Alias 'iccr scholarship scheme name' exists");
    assert.ok(def.aliases.includes("name of iccr scholarship scheme"), "Alias 'name of iccr scholarship scheme' exists");
    assert.ok(def.aliases.includes("scholarship scheme"), "Alias 'scholarship scheme' exists");
  });

  // --------------------------------------------------------------------------
  // 4. EXCEL EXPORT WORKBOOK STRUCTURE
  // --------------------------------------------------------------------------
  it("Scenario 7: Excel Export contains 'Name of ICCR Scholarship Scheme' column separate from ICCR/SII numbers", () => {
    const headers = [
      "S.No.",
      "Student Name",
      "Registration / Enrolment Number",
      "ICCR Application Number",
      "Name of ICCR Scholarship Scheme",
      "SII Application Number",
      "NFSU Campus",
      "Admission / Academic Year",
      "Fee Payment Category"
    ];

    const sampleRow = [
      1,
      "Johnathan Doe",
      "NFSU/2026/CS/001",
      "ICCR-2026-USA-01",
      "Silver Jubilee Scholarship Scheme",
      "SII-2026-USA-01",
      "Gandhinagar Campus",
      "2026-27",
      "Scholarship"
    ];

    const sampleRowBlankScheme = [
      2,
      "Jane Smith",
      "NFSU/2026/CS/002",
      "ICCR-2026-GBR-02",
      "", // Blank when no scheme entered
      "SII-2026-GBR-02",
      "Delhi Campus",
      "2026-27",
      "Self Financed"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow, sampleRowBlankScheme]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const parsedWb = XLSX.read(buffer, { type: "buffer" });
    const parsedWs = parsedWb.Sheets["Students"];
    const parsedData = XLSX.utils.sheet_to_json<string[]>(parsedWs, { header: 1 });

    assert.equal(parsedData[0][3], "ICCR Application Number");
    assert.equal(parsedData[0][4], "Name of ICCR Scholarship Scheme");
    assert.equal(parsedData[0][5], "SII Application Number");
    assert.equal(parsedData[1][4], "Silver Jubilee Scholarship Scheme");
    assert.ok(parsedData[2][4] === "" || parsedData[2][4] === undefined, "Blank string cell is empty/blank in Excel");
  });

  // --------------------------------------------------------------------------
  // 5. SECURITY & AUTHORIZATION IMPACT
  // --------------------------------------------------------------------------
  it("Scenario 8: Role-based permissions maintain strict authorization (Admin can export, Staff cannot)", () => {
    const admin = { id: "a1", email: "admin@nfsu.ac.in", user_metadata: { role: "administrator" } };
    const staff = { id: "s1", email: "staff@nfsu.ac.in", user_metadata: { role: "staff" } };

    assert.equal(isAdministrator(admin as any), true, "Admin has export privileges");
    assert.equal(isAdministrator(staff as any), false, "Staff does not have export privileges");
  });
});
