import "./test-preload";
import assert from "node:assert/strict";
import {
  isLeapYear,
  getDaysInMonth,
  isValidCalendarDate,
  isValidDDMMYYYY,
  parseDDMMYYYYToISO,
  parseDateToISO,
  formatToDDMMYYYY,
  formatDate,
  formatDateTime,
  formatDateForExcel
} from "../src/lib/utils/date";
import { 
  RegisterStudentValidationSchema, 
  UpdateStudentValidationSchema 
} from "../src/services/validation/student-validation";
import { CalendarDateEngine } from "../src/domain/notifications/services/calendar-date";
import { AcademicProgressionEngine } from "../src/domain/academic/services/semester-progression.service";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      }).catch((err) => {
        console.error(`  ✗ ${name}`);
        console.error(`    ${(err as Error).message}`);
        failed++;
      });
    } else {
      console.log(`  ✓ ${name}`);
      passed++;
    }
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

console.log("\n============================================================");
console.log(" ISCMS TEST SUITE: GLOBAL MANUAL DD/MM/YYYY DATE STANDARDIZATION");
console.log("============================================================\n");

console.log("--- 1. Leap Year & Calendar Arithmetic ---");

test("correctly identifies leap years", () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2020), true);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2023), false);
  assert.equal(isLeapYear(2025), false);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(1900), false);
});

test("returns correct days in month for leap vs non-leap years", () => {
  assert.equal(getDaysInMonth(2026, 1), 31);
  assert.equal(getDaysInMonth(2026, 2), 28);
  assert.equal(getDaysInMonth(2024, 2), 29);
  assert.equal(getDaysInMonth(2026, 4), 30);
  assert.equal(getDaysInMonth(2026, 12), 31);
});

test("strictly validates calendar dates and rejects out-of-boundary dates", () => {
  assert.equal(isValidCalendarDate(2026, 3, 2), true);
  assert.equal(isValidCalendarDate(2026, 1, 31), true);
  assert.equal(isValidCalendarDate(2024, 2, 29), true);
  assert.equal(isValidCalendarDate(2026, 2, 29), false);
  assert.equal(isValidCalendarDate(2026, 4, 31), false);
  assert.equal(isValidCalendarDate(2026, 6, 31), false);
  assert.equal(isValidCalendarDate(2026, 9, 31), false);
  assert.equal(isValidCalendarDate(2026, 11, 31), false);
  assert.equal(isValidCalendarDate(2026, 13, 1), false);
  assert.equal(isValidCalendarDate(2026, 0, 15), false);
  assert.equal(isValidCalendarDate(2026, 5, 0), false);
  assert.equal(isValidCalendarDate(2026, 5, 32), false);
});

console.log("\n--- 2. DD/MM/YYYY Validation & Strict Parsing ---");

test("validates DD/MM/YYYY strings strictly", () => {
  assert.equal(isValidDDMMYYYY("02/09/2026"), true);
  assert.equal(isValidDDMMYYYY("15/08/2026"), true);
  assert.equal(isValidDDMMYYYY("29/02/2024"), true);
  assert.equal(isValidDDMMYYYY("29/02/2025"), false);
  assert.equal(isValidDDMMYYYY("31/04/2026"), false);
  assert.equal(isValidDDMMYYYY("32/01/2026"), false);
  assert.equal(isValidDDMMYYYY("00/01/2026"), false);
  assert.equal(isValidDDMMYYYY("15/13/2026"), false);
  assert.equal(isValidDDMMYYYY("2026-09-02"), false);
  assert.equal(isValidDDMMYYYY("abc"), false);
  assert.equal(isValidDDMMYYYY(""), false);
});

test("parses 02/03/2026 strictly as 2 March 2026 (2026-03-02), NOT 3 February", () => {
  const parsed = parseDDMMYYYYToISO("02/03/2026");
  assert.equal(parsed, "2026-03-02");
});

test("parses 15/08/2026 strictly as 15 August 2026 (2026-08-15)", () => {
  const parsed = parseDDMMYYYYToISO("15/08/2026");
  assert.equal(parsed, "2026-08-15");
});

test("parses universal inputs safely with parseDateToISO", () => {
  assert.equal(parseDateToISO("02/03/2026"), "2026-03-02");
  assert.equal(parseDateToISO("2026-03-02"), "2026-03-02");
  assert.equal(parseDateToISO("2026-03-02T14:30:00Z"), "2026-03-02");
  assert.equal(parseDateToISO(new Date(2026, 2, 2)), "2026-03-02");
  assert.equal(parseDateToISO(""), null);
  assert.equal(parseDateToISO(null), null);
  assert.equal(parseDateToISO(undefined), null);
});

console.log("\n--- 3. Display Formatting (formatToDDMMYYYY & formatDate) ---");

test("converts YYYY-MM-DD to DD/MM/YYYY for UI inputs", () => {
  assert.equal(formatToDDMMYYYY("2026-03-02"), "02/03/2026");
  assert.equal(formatToDDMMYYYY("2026-08-15"), "15/08/2026");
  assert.equal(formatToDDMMYYYY("02/03/2026"), "02/03/2026");
  assert.equal(formatToDDMMYYYY(""), "");
  assert.equal(formatToDDMMYYYY(null), "");
});

test("formatDate formats dates into clean DD/MM/YYYY strings", () => {
  assert.equal(formatDate("2026-03-02"), "02/03/2026");
  assert.equal(formatDate(new Date(2026, 2, 2)), "02/03/2026");
  assert.equal(formatDate(null, "N/A"), "N/A");
});

test("formatDateForExcel returns DD/MM/YYYY format for exports", () => {
  assert.equal(formatDateForExcel("2026-03-02"), "02/03/2026");
  assert.equal(formatDateForExcel(new Date(2026, 7, 15)), "15/08/2026");
});

test("formatDateTime formats timestamps into DD/MM/YYYY HH:mm", () => {
  const dt = new Date(2026, 2, 2, 14, 30);
  const res = formatDateTime(dt);
  assert.equal(res.includes("02/03/2026"), true);
  assert.equal(res.includes("14:30"), true);
});

console.log("\n--- 4. Domain and Schema Integration ---");

test("validates Registration schema with DD/MM/YYYY dates", () => {
  const validStudent = {
    fullName: "Aarav Sharma",
    nationalityCode: "IND",
    gender: "male" as const,
    dateOfBirth: "15/08/2000",
    admissionDate: "01/08/2024",
    joiningDate: "15/08/2024",
    expectedGraduation: "30/06/2028",
    passportNumber: "Z1234567",
    passportIssueDate: "10/01/2020",
    passportExpiry: "09/01/2030",
    visaNumber: "V9988776",
    visaIssueDate: "01/07/2024",
    visaExpiry: "30/06/2025"
  };

  const result = RegisterStudentValidationSchema.safeParse(validStudent);
  assert.equal(result.success, true);
});

test("rejects Registration schema when passport expiry is before issue date", () => {
  const invalidStudent = {
    fullName: "Aarav Sharma",
    nationalityCode: "IND",
    passportNumber: "Z1234567",
    passportIssueDate: "10/01/2030",
    passportExpiry: "09/01/2020" // Expiry before issue!
  };

  const result = RegisterStudentValidationSchema.safeParse(invalidStudent);
  assert.equal(result.success, false);
});

test("CalendarDateEngine parses DD/MM/YYYY strings accurately without day shifts", () => {
  const parsed = CalendarDateEngine.parseDateOnly("02/03/2026");
  assert.equal(parsed.getUTCFullYear(), 2026);
  assert.equal(parsed.getUTCMonth(), 2);
  assert.equal(parsed.getUTCDate(), 2);
});

test("AcademicProgressionEngine normalizes and formats DD/MM/YYYY correctly", () => {
  assert.equal(AcademicProgressionEngine.normalizeDate("02/03/2026"), "2026-03-02");
  assert.equal(AcademicProgressionEngine.formatDisplayDate("2026-03-02"), "02/03/2026");
});

setTimeout(() => {
  console.log("\n============================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");
  if (failed > 0) {
    process.exit(1);
  }
}, 50);
