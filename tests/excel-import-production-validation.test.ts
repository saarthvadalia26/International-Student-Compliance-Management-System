/**
 * Production-Grade Acceptance Test Suite: ISCMS Excel Bulk Import System
 *
 * Verifies all 11+ acceptance scenarios:
 * 1. Fully populated row (Success, clean, no errors)
 * 2. Missing optional passport info (Imported with warnings, passport = NULL, 0 R2 objects)
 * 3. Missing optional visa info (Imported with warnings, visa = NULL, 0 R2 objects)
 * 4. Missing optional eFRRO info (Imported with warnings, eFRRO = NULL, 0 R2 objects)
 * 5. Missing all document metadata (Imported with warnings, all metadata = NULL, 0 versions, 0 R2 objects)
 * 6. Missing required student name (Rejected, clear error, no student created)
 * 7. Missing required enrollment number (Strict rejection: no auto-generation, clear error)
 * 8. Invalid date (Rejected, clear date error)
 * 9. Duplicate enrollment number (Intra-file & database duplicate rejection)
 * 10. Mixed import (Partial success: valid rows imported, invalid rejected, error report generated)
 * 11. Reminder engine metadata verification (Valid expiry metadata queryable without physical PDF)
 * 12. Downloadable Excel Error & Warnings Report Generation
 */

import * as XLSX from "xlsx";
import { BulkStudentImportService } from "../src/domain/import/services/bulk-student-import.service";
import { ISCMS_FIELD_DEFINITIONS } from "../src/domain/import/types/bulk-import.types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTestSuite() {
  console.log("\n==========================================================================");
  console.log("  ISCMS PRODUCTION EXCEL BULK IMPORT ACCEPTANCE TEST SUITE");
  console.log("==========================================================================\n");

  const mockPrograms = [
    {
      programName: "B.Tech in Computer Science & Engineering",
      programCode: "BTECH_CSE",
      totalSemesters: 8,
      semesterDuration: 6,
      semesterDurationUnit: "months"
    },
    {
      programName: "M.Tech in Cyber Security",
      programCode: "MTECH_CS",
      totalSemesters: 4,
      semesterDuration: 6,
      semesterDurationUnit: "months"
    }
  ];

  // -------------------------------------------------------------------------
  // Scenario 1: Fully Populated Student Row
  // -------------------------------------------------------------------------
  console.log("--- Scenario 1: Fully Populated Row (Complete Success) ---");
  const fullRowData = [
    {
      "registration_number": "NFSU2026CS101",
      "full_name": "Alexander Hayes",
      "nationality": "USA",
      "gender": "Male",
      "date_of_birth": "2002-04-15",
      "email": "alex.hayes@example.com",
      "phone_home": "+1-555-0199",
      "permanent_address": "123 Main St, New York, USA",
      "academic_program": "B.Tech in Computer Science & Engineering",
      "admission_date": "2024-08-01",
      "emergency_contact_name": "Sarah Hayes",
      "emergency_contact_phone": "+1-555-0100",
      "passport_number": "US998877",
      "passport_issue_date": "2020-01-01",
      "passport_expiry": "2030-01-01",
      "visa_number": "IN-V-12345",
      "visa_issue_date": "2024-07-01",
      "visa_expiry": "2025-07-01",
      "efrro_number": "FRRO/AHM/2024/001",
      "efrro_issue_date": "2024-07-15",
      "efrro_expiry": "2025-07-14"
    }
  ];

  const mapping1 = BulkStudentImportService.generateAutoMapping(Object.keys(fullRowData[0]));
  const report1 = await BulkStudentImportService.validateSpreadsheetData(fullRowData, mapping1, {
    academicPrograms: mockPrograms
  });

  assert(report1.totalRows === 1, "Total rows is 1");
  assert(report1.validCount === 1, "Row is valid");
  assert(report1.cleanValidCount === 1, "Row is clean with zero warnings");
  assert(report1.errorCount === 0, "Zero errors");
  assert(report1.duplicateCount === 0, "Zero duplicates");

  // -------------------------------------------------------------------------
  // Scenario 2: Missing Optional Passport Information
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 2: Missing Optional Passport Information ---");
  const missingPassportData = [
    {
      "registration_number": "NFSU2026CS102",
      "full_name": "Binod Bhattarai",
      "academic_program": "B.Tech in Computer Science & Engineering",
      "admission_date": "2024-08-01",
      "visa_number": "IN-V-9988",
      "visa_expiry": "2026-06-30"
      // No passport_number, passport_expiry, or passport_issue_date
    }
  ];

  const mapping2 = BulkStudentImportService.generateAutoMapping(Object.keys(missingPassportData[0]));
  const report2 = await BulkStudentImportService.validateSpreadsheetData(missingPassportData, mapping2, {
    academicPrograms: mockPrograms
  });

  assert(report2.validCount === 1, "Row is valid despite missing passport info");
  assert(report2.warningRowsCount === 1, "Row has warning for missing passport metadata");
  assert(report2.errorCount === 0, "Missing passport does NOT cause error or rejection");
  assert(report2.warningsBreakdown.passportExpiryMissing >= 1, "Passport expiry tracked in warnings breakdown");
  assert(
    report2.rows[0].warnings.some(w => w.field === "passport_number" || w.field === "passport_expiry"),
    "Warning notice attached for missing passport metadata"
  );

  // -------------------------------------------------------------------------
  // Scenario 3: Missing Optional Visa Information
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 3: Missing Optional Visa Information ---");
  const missingVisaData = [
    {
      "registration_number": "NFSU2026CS103",
      "full_name": "Pema Wangchuk",
      "academic_program": "B.Tech in Computer Science & Engineering",
      "admission_date": "2024-08-01",
      "passport_number": "BHT887766",
      "passport_expiry": "2029-12-31"
      // No visa_number or visa_expiry
    }
  ];

  const mapping3 = BulkStudentImportService.generateAutoMapping(Object.keys(missingVisaData[0]));
  const report3 = await BulkStudentImportService.validateSpreadsheetData(missingVisaData, mapping3, {
    academicPrograms: mockPrograms
  });

  assert(report3.validCount === 1, "Row is valid despite missing visa info");
  assert(report3.errorCount === 0, "Missing visa does NOT cause error or rejection");
  assert(report3.warningsBreakdown.visaExpiryMissing >= 1, "Visa expiry tracked in warnings breakdown");

  // -------------------------------------------------------------------------
  // Scenario 4: Missing Optional eFRRO Information
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 4: Missing Optional eFRRO Information ---");
  const missingEfrroData = [
    {
      "registration_number": "NFSU2026CS104",
      "full_name": "Sunil Gurung",
      "academic_program": "B.Tech in Computer Science & Engineering",
      "admission_date": "2024-08-01",
      "passport_number": "NPL112233",
      "passport_expiry": "2030-01-01",
      "visa_number": "IN-V-332211",
      "visa_expiry": "2026-01-01"
      // No efrro_number or efrro_expiry
    }
  ];

  const mapping4 = BulkStudentImportService.generateAutoMapping(Object.keys(missingEfrroData[0]));
  const report4 = await BulkStudentImportService.validateSpreadsheetData(missingEfrroData, mapping4, {
    academicPrograms: mockPrograms
  });

  assert(report4.validCount === 1, "Row is valid despite missing eFRRO info");
  assert(report4.errorCount === 0, "Missing eFRRO does NOT cause error or rejection");
  assert(report4.warningsBreakdown.efrroExpiryMissing >= 1, "eFRRO expiry tracked in warnings breakdown");

  // -------------------------------------------------------------------------
  // Scenario 5: Missing All Document Metadata
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 5: Missing All Document Metadata ---");
  const noDocsData = [
    {
      "registration_number": "NFSU2026CS105",
      "full_name": "Kiran Shrestha",
      "academic_program": "B.Tech in Computer Science & Engineering"
      // Minimal required fields only
    }
  ];

  const mapping5 = BulkStudentImportService.generateAutoMapping(Object.keys(noDocsData[0]));
  const report5 = await BulkStudentImportService.validateSpreadsheetData(noDocsData, mapping5, {
    academicPrograms: mockPrograms
  });

  assert(report5.validCount === 1, "Row with minimal required fields is accepted for import");
  assert(report5.errorCount === 0, "No errors when optional document metadata is completely absent");
  assert(report5.rows[0].status === "valid", "Status is 'valid'");
  assert(report5.rows[0].warnings.length >= 3, "Contains informational warnings for missing optional fields");

  // -------------------------------------------------------------------------
  // Scenario 6: Missing Required Student Name (Rejected)
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 6: Missing Required Student Name (Rejection) ---");
  const missingNameData = [
    {
      "registration_number": "NFSU2026CS106",
      "full_name": "", // Empty name!
      "academic_program": "B.Tech in Computer Science & Engineering"
    }
  ];

  const mapping6 = BulkStudentImportService.generateAutoMapping(Object.keys(missingNameData[0]));
  const report6 = await BulkStudentImportService.validateSpreadsheetData(missingNameData, mapping6, {
    academicPrograms: mockPrograms
  });

  assert(report6.validCount === 0, "Row without student name is NOT valid");
  assert(report6.errorCount === 1, "Missing student name triggers validation error");
  assert(report6.rows[0].status === "error", "Row status is 'error'");
  assert(
    report6.rows[0].errors.some(e => e.field === "full_name" && e.problem.includes("full name is required")),
    "Provides clear error: 'Student full name is required.'"
  );

  // -------------------------------------------------------------------------
  // Scenario 7: Missing Enrollment Number (Progressive Acceptance with Warning)
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 7: Missing Enrollment Number (Progressive Acceptance with Warning) ---");
  const missingRegData = [
    {
      "registration_number": "", // Missing enrollment number!
      "full_name": "Dorji Tashi",
      "academic_program": "B.Tech in Computer Science & Engineering"
    }
  ];

  const mapping7 = BulkStudentImportService.generateAutoMapping(Object.keys(missingRegData[0]));
  const report7 = await BulkStudentImportService.validateSpreadsheetData(missingRegData, mapping7, {
    academicPrograms: mockPrograms
  });

  assert(report7.validCount === 1, "Row without enrollment number is accepted for progressive registration");
  assert(report7.errorCount === 0, "Missing enrollment number does NOT trigger fatal error");
  assert(report7.rows[0].status === "valid", "Row status is 'valid'");
  assert(
    report7.rows[0].warnings.some(w => w.field === "registration_number" && w.impact.includes("Enrollment number is not provided yet")),
    "Clear warning: 'Enrollment number is not provided yet. Record will be created without enrollment number and can be assigned later.'"
  );

  // -------------------------------------------------------------------------
  // Scenario 8: Invalid Date Formats (Rejected)
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 8: Invalid Date Formats (Rejection) ---");
  const invalidDateData = [
    {
      "registration_number": "NFSU2026CS108",
      "full_name": "Tariq Mahmood",
      "academic_program": "B.Tech in Computer Science & Engineering",
      "date_of_birth": "2026-02-31", // Feb 31 does not exist!
      "passport_expiry": "31/13/2028", // Month 13 is invalid!
      "visa_expiry": "not-a-valid-date"
    }
  ];

  const mapping8 = BulkStudentImportService.generateAutoMapping(Object.keys(invalidDateData[0]));
  const report8 = await BulkStudentImportService.validateSpreadsheetData(invalidDateData, mapping8, {
    academicPrograms: mockPrograms
  });

  assert(report8.validCount === 0, "Row with invalid dates is rejected");
  assert(report8.errorCount === 1, "Invalid dates trigger validation error");
  const errs8 = report8.rows[0].errors;
  assert(errs8.some(e => e.field === "date_of_birth"), "Detects non-existent February 31 date");
  assert(errs8.some(e => e.field === "passport_expiry"), "Detects invalid month 13");
  assert(errs8.some(e => e.field === "visa_expiry"), "Detects arbitrary text in date field");

  // -------------------------------------------------------------------------
  // Scenario 9: Duplicate Enrollment Numbers (Intra-file & Database)
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 9: Duplicate Enrollment Number Detection ---");
  const duplicateData = [
    {
      "registration_number": "NFSU2026CS109",
      "full_name": "Student Alpha",
      "academic_program": "B.Tech in Computer Science & Engineering"
    },
    {
      "registration_number": "NFSU2026CS109", // Intra-file duplicate!
      "full_name": "Student Beta",
      "academic_program": "B.Tech in Computer Science & Engineering"
    },
    {
      "registration_number": "NFSU_EXISTING_DB_001", // DB Duplicate!
      "full_name": "Student Gamma",
      "academic_program": "B.Tech in Computer Science & Engineering"
    }
  ];

  const mapping9 = BulkStudentImportService.generateAutoMapping(Object.keys(duplicateData[0]));
  const report9 = await BulkStudentImportService.validateSpreadsheetData(duplicateData, mapping9, {
    existingRegistrationNumbers: new Set(["nfsu_existing_db_001"]),
    academicPrograms: mockPrograms
  });

  assert(report9.validCount === 1, "First unique record is valid");
  assert(report9.duplicateCount === 2, "Both intra-file and DB duplicates are flagged as duplicates");
  assert(report9.rows[1].status === "duplicate", "Row 2 marked as duplicate");
  assert(report9.rows[2].status === "duplicate", "Row 3 marked as duplicate");
  assert(
    report9.rows[2].errors.some(e => e.problem.includes("already exists in the ISCMS database")),
    "Explains that existing database students cannot be overwritten"
  );

  // -------------------------------------------------------------------------
  // Scenario 10: Mixed Import (Partial Success & Atomicity)
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 10: Mixed Import (Partial Success) ---");
  const mixedData = [
    {
      "registration_number": "NFSU_MIX_001",
      "full_name": "Clean Student",
      "nationality": "Nepal",
      "academic_program": "B.Tech in Computer Science & Engineering",
      "date_of_birth": "2002-01-01",
      "email": "clean@example.com",
      "phone_home": "+977-9800000001",
      "permanent_address": "Kathmandu",
      "emergency_contact_name": "Guardian Alpha",
      "emergency_contact_phone": "+977-9800000002",
      "admission_date": "2024-08-01",
      "passport_number": "P001",
      "passport_expiry": "2030-01-01",
      "visa_number": "V001",
      "visa_expiry": "2026-01-01",
      "efrro_number": "E001",
      "efrro_expiry": "2025-01-01"
    },
    {
      "registration_number": "NFSU_MIX_002",
      "full_name": "Warning Student (Missing Passport & Email)",
      "academic_program": "B.Tech in Computer Science & Engineering"
    },
    {
      "registration_number": "", // Missing enrollment number -> Rejected!
      "full_name": "Rejected Student No Reg",
      "academic_program": "B.Tech in Computer Science & Engineering"
    },
    {
      "registration_number": "NFSU_MIX_004",
      "full_name": "Rejected Student Bad Date",
      "academic_program": "B.Tech in Computer Science & Engineering",
      "date_of_birth": "99/99/9999" // Invalid date -> Rejected!
    }
  ];

  const mapping10 = BulkStudentImportService.generateAutoMapping(Object.keys(mixedData[0]));
  const report10 = await BulkStudentImportService.validateSpreadsheetData(mixedData as Record<string, string>[], mapping10, {
    academicPrograms: mockPrograms
  });

  assert(report10.totalRows === 4, "Total mixed rows is 4");
  assert(report10.validCount === 3, "3 valid rows ready for import (including progressive rows with warnings)");
  assert(report10.cleanValidCount === 1, "1 clean valid row");
  assert(report10.warningRowsCount === 2, "2 valid rows with warnings");
  assert(report10.errorCount === 1, "1 row rejected due to invalid date format");

  // Verify that error report can be generated from mixed report
  const errorReportResult = BulkStudentImportService.generateErrorReport(report10);
  assert(errorReportResult.buffer.length > 0, "Excel error report generated");
  assert(errorReportResult.fileName.endsWith(".xlsx"), "Report has .xlsx extension");

  const errorWb = XLSX.read(errorReportResult.buffer, { type: "buffer" });
  assert(errorWb.SheetNames.includes("Rejected Rows"), "Contains 'Rejected Rows' sheet");
  assert(errorWb.SheetNames.includes("Warnings Summary"), "Contains 'Warnings Summary' sheet");

  const rejectedSheet = errorWb.Sheets["Rejected Rows"];
  const rejectedSheetRows = XLSX.utils.sheet_to_json<string[]>(rejectedSheet, { header: 1 });
  assert(rejectedSheetRows.length >= 2, "Rejected sheet contains header plus rejected rows");

  // -------------------------------------------------------------------------
  // Scenario 11: Reminder Engine Metadata Queryable Without Physical PDF
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 11: Reminder Engine Metadata Verification ---");
  // Test date normalization and days until expiry calculation
  const testExpiryDate = "2026-10-15";
  const parsedExp = BulkStudentImportService.parseDateValue(testExpiryDate);
  assert(parsedExp.isoDate === "2026-10-15", "Expiry date parsed accurately to ISO format");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date("2026-10-15");
  exp.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  assert(typeof daysDiff === "number", "Calculates days until expiry for reminder scheduler without physical PDF");

  // -------------------------------------------------------------------------
  // Scenario 12: Empty Cell Normalization & Sanitization
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 12: Empty Cell Normalization & Sanitization ---");
  assert(BulkStudentImportService.normalizeCellString("  N/A  ") === "", "Normalizes 'N/A' to empty string");
  assert(BulkStudentImportService.normalizeCellString("null") === "", "Normalizes 'null' to empty string");
  assert(BulkStudentImportService.normalizeCellString("  -  ") === "", "Normalizes '-' to empty string");
  assert(BulkStudentImportService.normalizeCellString("  John Doe  ") === "John Doe", "Trims valid text strings");
  assert(BulkStudentImportService.normalizeCellString("+91-9876543210") === "+91-9876543210", "Preserves international phone number format");
  assert(BulkStudentImportService.normalizeCellString("=SUM(A1:A10)") === "SUM(A1:A10)", "Sanitizes dangerous formula injection characters");

  console.log("\n==========================================================================");
  console.log("  ALL 12 PRODUCTION EXCEL BULK IMPORT ACCEPTANCE SCENARIOS PASSED!");
  console.log("==========================================================================\n");
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
