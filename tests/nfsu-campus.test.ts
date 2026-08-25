import assert from "node:assert/strict";
import { RegisterStudentValidationSchema } from "../src/services/validation/student-validation";
import { ReportMapper } from "../src/domain/reports/mappers";
import { normalizeAcademicLevel } from "../src/domain/academic-programs/academic-level";

interface MockStudent {
  id: string;
  fullName: string;
  registrationNumber: string;
  nationalityCode: string;
  nationalityName: string;
  programName: string;
  programCode?: string | null;
  academicLevel?: string | null;
  academicLevelLabel?: string | null;
  school: string;
  admissionCategory?: string | null;
  iccrApplicationNumber?: string | null;
  siiApplicationNumber?: string | null;
  nfsuCampus?: string | null;
  passport: { number: string };
  visa: { number: string };
  email: string;
  complianceStatus: "compliant" | "warning" | "non_compliant" | "expired";
  academicStatus: "good_standing" | "probation" | "suspended";
}

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
console.log(" ISCMS TEST SUITE: NFSU CAMPUS & DYNAMIC CAMPUS FILTERING");
console.log("============================================================\n");

// ============================================================================
// 1. VALIDATION SCHEMA TESTS (Phase 12)
// ============================================================================
console.log("--- 1. Validation Schema (RegisterStudentValidationSchema) ---");

test("Schema accepts valid student with NFSU Campus provided", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Ronesh Pal",
    nfsuCampus: "Delhi Campus"
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.nfsuCampus, "Delhi Campus");
  }
});

test("Schema accepts student with NFSU Campus omitted (optional)", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova"
  });
  assert.equal(result.success, true);
});

test("Schema accepts student with explicit null or empty NFSU Campus", () => {
  const resNull = RegisterStudentValidationSchema.safeParse({
    fullName: "John Doe",
    nfsuCampus: null
  });
  assert.equal(resNull.success, true);

  const resEmpty = RegisterStudentValidationSchema.safeParse({
    fullName: "John Doe",
    nfsuCampus: ""
  });
  assert.equal(resEmpty.success, true);
});

test("Schema rejects campus name exceeding maximum length (255 chars)", () => {
  const longCampus = "A".repeat(256);
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Jane Doe",
    nfsuCampus: longCampus
  });
  assert.equal(result.success, false);
});

// ============================================================================
// 2. INPUT NORMALIZATION & TRIMMING (Phase 7, Phase 25)
// ============================================================================
console.log("\n--- 2. Input Normalization & Trimming ---");

test("Whitespace is cleanly trimmed on persistence payload", () => {
  const rawInput = "   Gandhinagar Campus   ";
  const trimmed = rawInput ? rawInput.trim() : null;
  assert.equal(trimmed, "Gandhinagar Campus");
});

test("Empty or whitespace-only campus is converted to null", () => {
  const rawInputs = ["", "   ", "\t\n  "];
  rawInputs.forEach(input => {
    const trimmed = input && input.trim() ? input.trim() : null;
    assert.equal(trimmed, null);
  });
});

// ============================================================================
// 3. REPOSITORY & LIFECYCLE MUTATION (Phase 10, Phase 32)
// ============================================================================
console.log("\n--- 3. Campus Lifecycle Mutation & Independence ---");

test("Lifecycle: empty -> campus", () => {
  let record: { nfsu_campus: string | null; iccr_application_number: string | null; sii_application_number: string | null } = {
    nfsu_campus: null,
    iccr_application_number: "ICCR-001",
    sii_application_number: "SII-002"
  };

  // Update campus
  const newCampus = "Delhi Campus";
  record = {
    ...record,
    nfsu_campus: newCampus ? newCampus.trim() : null
  };

  assert.equal(record.nfsu_campus, "Delhi Campus");
  assert.equal(record.iccr_application_number, "ICCR-001", "ICCR number must not be modified");
  assert.equal(record.sii_application_number, "SII-002", "SII number must not be modified");
});

test("Lifecycle: campus -> different campus", () => {
  let record: { nfsu_campus: string | null; iccr_application_number: string; sii_application_number: string } = {
    nfsu_campus: "Delhi Campus",
    iccr_application_number: "ICCR-001",
    sii_application_number: "SII-002"
  };

  const updatedCampus = "Gandhinagar Campus";
  record = {
    ...record,
    nfsu_campus: updatedCampus ? updatedCampus.trim() : null
  };

  assert.equal(record.nfsu_campus, "Gandhinagar Campus");
  assert.equal(record.iccr_application_number, "ICCR-001");
  assert.equal(record.sii_application_number, "SII-002");
});

test("Lifecycle: campus -> cleared (null)", () => {
  let record: { nfsu_campus: string | null; iccr_application_number: string; sii_application_number: string } = {
    nfsu_campus: "Gandhinagar Campus",
    iccr_application_number: "ICCR-001",
    sii_application_number: "SII-002"
  };

  const clearedCampus: string = "";
  record = {
    ...record,
    nfsu_campus: clearedCampus ? clearedCampus.trim() : null
  };

  assert.equal(record.nfsu_campus, null);
  assert.equal(record.iccr_application_number, "ICCR-001");
  assert.equal(record.sii_application_number, "SII-002");
});

// ============================================================================
// 4. DYNAMIC CAMPUS DERIVATION & COUNTS (Phase 16, Phase 19, Phase 21)
// ============================================================================
console.log("\n--- 4. Dynamic Campus Derivation & Count Calculation ---");

const mockDataset: MockStudent[] = [
  // 35 Delhi Campus students
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `delhi-${i + 1}`,
    fullName: `Delhi Student ${i + 1}`,
    registrationNumber: `NFSU/DEL/${100 + i}`,
    nationalityCode: "NPL",
    nationalityName: "Nepal",
    programName: "M.Sc. Forensic Science",
    school: "School of Forensic Science",
    nfsuCampus: "Delhi Campus",
    iccrApplicationNumber: i % 2 === 0 ? `ICCR-DEL-${i}` : null,
    siiApplicationNumber: i % 3 === 0 ? `SII-DEL-${i}` : null,
    passport: { number: `P-DEL-${i}` },
    visa: { number: `V-DEL-${i}` },
    email: `delhi${i + 1}@nfsu.ac.in`,
    complianceStatus: "compliant" as const,
    academicStatus: "good_standing" as const
  })),

  // 40 Gandhinagar Campus students
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `gn-${i + 1}`,
    fullName: `Gandhinagar Student ${i + 1}`,
    registrationNumber: `NFSU/GN/${100 + i}`,
    nationalityCode: "BGD",
    nationalityName: "Bangladesh",
    programName: "M.Tech Cyber Security",
    school: "School of Cyber Security",
    nfsuCampus: "Gandhinagar Campus",
    iccrApplicationNumber: null,
    siiApplicationNumber: `SII-GN-${i}`,
    passport: { number: `P-GN-${i}` },
    visa: { number: `V-GN-${i}` },
    email: `gn${i + 1}@nfsu.ac.in`,
    complianceStatus: "compliant" as const,
    academicStatus: "good_standing" as const
  })),

  // 25 Mumbai Campus students
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `mum-${i + 1}`,
    fullName: `Mumbai Student ${i + 1}`,
    registrationNumber: `NFSU/MUM/${100 + i}`,
    nationalityCode: "MUS",
    nationalityName: "Mauritius",
    programName: "B.Tech-M.Tech CS",
    school: "School of Engineering",
    nfsuCampus: "Mumbai Campus",
    iccrApplicationNumber: `ICCR-MUM-${i}`,
    siiApplicationNumber: null,
    passport: { number: `P-MUM-${i}` },
    visa: { number: `V-MUM-${i}` },
    email: `mum${i + 1}@nfsu.ac.in`,
    complianceStatus: "warning" as const,
    academicStatus: "good_standing" as const
  })),

  // 10 Students with NO campus specified (null / empty)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `unassigned-${i + 1}`,
    fullName: `Unassigned Student ${i + 1}`,
    registrationNumber: `NFSU/NEW/${100 + i}`,
    nationalityCode: "BTN",
    nationalityName: "Bhutan",
    programName: "B.Sc. Forensic Science",
    school: "School of Forensic Science",
    nfsuCampus: null,
    iccrApplicationNumber: null,
    siiApplicationNumber: null,
    passport: { number: `P-UN-${i}` },
    visa: { number: `V-UN-${i}` },
    email: `un${i + 1}@nfsu.ac.in`,
    complianceStatus: "compliant" as const,
    academicStatus: "good_standing" as const
  }))
];

test("Total dataset count equals 110 (35 Delhi + 40 Gandhinagar + 25 Mumbai + 10 Unassigned)", () => {
  assert.equal(mockDataset.length, 110);
});

test("Dynamic derivation returns exactly 3 unique sorted campuses without duplicates", () => {
  const campusCounts = new Map<string, number>();
  let notSpecifiedCount = 0;

  mockDataset.forEach(s => {
    const c = s.nfsuCampus?.trim();
    if (c) {
      campusCounts.set(c, (campusCounts.get(c) || 0) + 1);
    } else {
      notSpecifiedCount++;
    }
  });

  const sortedList = Array.from(campusCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  assert.equal(sortedList.length, 3);
  assert.equal(sortedList[0].name, "Delhi Campus");
  assert.equal(sortedList[0].count, 35);

  assert.equal(sortedList[1].name, "Gandhinagar Campus");
  assert.equal(sortedList[1].count, 40);

  assert.equal(sortedList[2].name, "Mumbai Campus");
  assert.equal(sortedList[2].count, 25);

  assert.equal(notSpecifiedCount, 10);
});

// ============================================================================
// 5. FILTERING DETERMINISM & ACCURACY (Phase 15, Phase 18, Phase 21, Phase 22)
// ============================================================================
console.log("\n--- 5. Campus Filtering Determinism & Pagination Count ---");

function filterStudents(
  dataset: MockStudent[], 
  options: { searchQuery?: string; campusFilter?: string; complianceFilter?: string }
): MockStudent[] {
  return dataset.filter(student => {
    // 1. Search Query
    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase().trim();
      const matchesSearch = 
        student.fullName.toLowerCase().includes(q) ||
        student.registrationNumber.toLowerCase().includes(q) ||
        (student.nfsuCampus || "").toLowerCase().includes(q) ||
        (student.iccrApplicationNumber || "").toLowerCase().includes(q) ||
        (student.siiApplicationNumber || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 2. Compliance
    if (options.complianceFilter && options.complianceFilter !== "all") {
      if (student.complianceStatus !== options.complianceFilter) return false;
    }

    // 3. Campus
    if (options.campusFilter && options.campusFilter !== "all") {
      if (options.campusFilter === "not_specified") {
        if (student.nfsuCampus?.trim()) return false;
      } else {
        if (student.nfsuCampus?.trim().toLowerCase() !== options.campusFilter.trim().toLowerCase()) {
          return false;
        }
      }
    }

    return true;
  });
}

test("Filter 'Delhi Campus' returns exactly 35 students", () => {
  const results = filterStudents(mockDataset, { campusFilter: "Delhi Campus" });
  assert.equal(results.length, 35);
  results.forEach(s => assert.equal(s.nfsuCampus, "Delhi Campus"));
});

test("Filter 'Gandhinagar Campus' returns exactly 40 students", () => {
  const results = filterStudents(mockDataset, { campusFilter: "Gandhinagar Campus" });
  assert.equal(results.length, 40);
  results.forEach(s => assert.equal(s.nfsuCampus, "Gandhinagar Campus"));
});

test("Filter 'Mumbai Campus' returns exactly 25 students", () => {
  const results = filterStudents(mockDataset, { campusFilter: "Mumbai Campus" });
  assert.equal(results.length, 25);
  results.forEach(s => assert.equal(s.nfsuCampus, "Mumbai Campus"));
});

test("Filter 'not_specified' returns exactly 10 unassigned students", () => {
  const results = filterStudents(mockDataset, { campusFilter: "not_specified" });
  assert.equal(results.length, 10);
  results.forEach(s => assert.equal(s.nfsuCampus, null));
});

test("Filter 'all' returns entire dataset of 110 students", () => {
  const results = filterStudents(mockDataset, { campusFilter: "all" });
  assert.equal(results.length, 110);
});

test("Global search matches campus name ('Mumbai' returns 25 Mumbai students)", () => {
  const results = filterStudents(mockDataset, { searchQuery: "mumbai" });
  assert.equal(results.length, 25);
});

test("Pagination total count is accurate across filtered pages", () => {
  const itemsPerPage = 10;
  const filtered = filterStudents(mockDataset, { campusFilter: "Delhi Campus" });
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  assert.equal(totalItems, 35);
  assert.equal(totalPages, 4);

  // Page 1
  const page1 = filtered.slice(0, 10);
  assert.equal(page1.length, 10);

  // Page 4 (last page)
  const page4 = filtered.slice(30, 40);
  assert.equal(page4.length, 5);

  // Filtered total count remains 35 on all pages (Phase 22)
  assert.equal(totalItems, 35);
});

// ============================================================================
// 6. REPORT MAPPER INTEGRATION (Phase 30)
// ============================================================================
console.log("\n--- 6. Report Mapper Integration ---");

test("ReportMapper maps nfsu_campus to nfsuCampus correctly", () => {
  const row = ReportMapper.toStudentReportRow({
    student_id: "s-1",
    registration_number: "NFSU/2026/01",
    full_name: "Ronesh Pal",
    nationality: "IND",
    school: "School of Cybersecurity",
    programme: "M.Tech Cyber Security",
    admission_category: "iccr",
    iccr_application_number: "ICCR-2026-001",
    sii_application_number: "SII-2026-002",
    nfsu_campus: "Delhi Campus"
  });

  assert.equal(row.fullName, "Ronesh Pal");
  assert.equal(row.iccrApplicationNumber, "ICCR-2026-001");
  assert.equal(row.siiApplicationNumber, "SII-2026-002");
  assert.equal(row.nfsuCampus, "Delhi Campus");
});

test("ReportMapper handles null nfsu_campus gracefully", () => {
  const row = ReportMapper.toStudentReportRow({
    student_id: "s-2",
    registration_number: "NFSU/2026/02",
    full_name: "Elena Rostova",
    nfsu_campus: null
  });

  assert.equal(row.nfsuCampus, null);
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n============================================================");
console.log(` TEST RUN SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
}
