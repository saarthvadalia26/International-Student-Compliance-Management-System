import "./test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { DimensionalReportsService } from "../src/domain/reports/services/dimensional-reports.service";
import { DimensionalExcelService } from "../src/domain/reports/services/dimensional-excel.service";
import { ExportableDimensionType } from "../src/domain/reports/types/dimensional-reports";
import { requireAdministrator, UnauthorizedError, getAppRole, isAdministrator, isStaff } from "../src/lib/auth/permissions";
import * as XLSX from "xlsx";

async function runTests() {
  console.log("===============================================================");
  console.log("ISCMS — REPORTS, ANALYTICS & GRANULAR EXPORT TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AUTHORIZATION & SECURITY ROLE CHECKS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("1. Testing Authorization & Security Invariants...");
  try {
    const adminUserMetadata: any = {
      id: "admin-1",
      user_metadata: { role: "administrator" },
    };
    const adminAppMetadata: any = {
      id: "admin-2",
      app_metadata: { role: "admin" },
    };
    const staffUser: any = {
      id: "staff-1",
      user_metadata: { role: "staff" },
    };
    const studentUser: any = {
      id: "student-1",
      user_metadata: { role: "student" },
    };

    assert(getAppRole(adminUserMetadata) === "administrator", "getAppRole detects administrator from user_metadata");
    assert(getAppRole(adminAppMetadata) === "administrator", "getAppRole detects administrator from app_metadata ('admin')");
    assert(getAppRole(staffUser) === "staff", "getAppRole detects staff role");
    assert(isAdministrator(adminUserMetadata) === true, "isAdministrator returns true for admin");
    assert(isAdministrator(staffUser) === false, "isAdministrator returns false for staff");
    assert(isStaff(staffUser) === true, "isStaff returns true for staff");

    // requireAdministrator asserts
    let adminPassed = false;
    try {
      requireAdministrator(adminUserMetadata);
      adminPassed = true;
    } catch {
      adminPassed = false;
    }
    assert(adminPassed, "requireAdministrator allows admin user");

    let staffBlocked = false;
    try {
      requireAdministrator(staffUser);
    } catch (e: any) {
      staffBlocked = e instanceof UnauthorizedError || e.message.includes("Forbidden");
    }
    assert(staffBlocked, "requireAdministrator throws UnauthorizedError on staff user");

    let unauthenticatedBlocked = false;
    try {
      requireAdministrator(null);
    } catch (e: any) {
      unauthenticatedBlocked = e instanceof UnauthorizedError || e.message.includes("Authentication");
    }
    assert(unauthenticatedBlocked, "requireAdministrator throws UnauthorizedError on null user");
  } catch (err: any) {
    console.error("Auth test error:", err);
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DIMENSIONAL REPORTING ENGINE AGGREGATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n2. Testing Dimensional Reporting Service Query & Reconciliation...");
  const service = new DimensionalReportsService();
  const data = await service.getDimensionalReports({});

  const total = data.overview.totalStudents;
  console.log(`  Authoritative total students in test DB: ${total}`);

  assert(typeof total === "number" && total >= 0, "Overview returns valid totalStudents count");
  assert(Array.isArray(data.reports.country), "Country report is an array");
  assert(Array.isArray(data.reports.category), "Category report is an array");
  assert(Array.isArray(data.reports.school), "School report is an array");
  assert(Array.isArray(data.reports.program), "Program report is an array");
  assert(Array.isArray(data.reports.funding), "Funding report is an array");
  assert(Array.isArray(data.reports.campus), "Campus report is an array");
  assert(Array.isArray(data.reports.academicYear), "Academic Year report is an array");
  assert(Array.isArray(data.reports.studentStatus), "Student Status report is an array");
  assert(Array.isArray(data.reports.compliance), "Compliance report is an array");
  assert(Array.isArray(data.reports.documentStatus), "Document Status report is an array");
  assert(Array.isArray(data.reports.renewals), "Renewals report is an array");

  // Mathematical Reconciliation: Sum of rows in each dimension must equal exact cohort total
  const sumCountry = data.reports.country.reduce((a, b) => a + b.studentCount, 0);
  assert(sumCountry === total, `Country report sum (${sumCountry}) reconciles with total cohort (${total})`);

  const sumCategory = data.reports.category.reduce((a, b) => a + b.studentCount, 0);
  assert(sumCategory === total, `Category report sum (${sumCategory}) reconciles with total cohort (${total})`);

  const sumSchool = data.reports.school.reduce((a, b) => a + b.studentCount, 0);
  assert(sumSchool === total, `School report sum (${sumSchool}) reconciles with total cohort (${total})`);

  const sumProgram = data.reports.program.reduce((a, b) => a + b.studentCount, 0);
  assert(sumProgram === total, `Program report sum (${sumProgram}) reconciles with total cohort (${total})`);

  const sumFunding = data.reports.funding.reduce((a, b) => a + b.studentCount, 0);
  assert(sumFunding === total, `Funding report sum (${sumFunding}) reconciles with total cohort (${total})`);

  const sumCampus = data.reports.campus.reduce((a, b) => a + b.studentCount, 0);
  assert(sumCampus === total, `Campus report sum (${sumCampus}) reconciles with total cohort (${total})`);

  const sumYear = data.reports.academicYear.reduce((a, b) => a + b.studentCount, 0);
  assert(sumYear === total, `Academic Year report sum (${sumYear}) reconciles with total cohort (${total})`);

  const sumStatus = data.reports.studentStatus.reduce((a, b) => a + b.studentCount, 0);
  assert(sumStatus === total, `Student Status report sum (${sumStatus}) reconciles with total cohort (${total})`);

  const sumCompliance = data.reports.compliance.reduce((a, b) => a + b.studentCount, 0);
  assert(sumCompliance === total, `Compliance report sum (${sumCompliance}) reconciles with total cohort (${total})`);

  // Document status totals check
  data.reports.documentStatus.forEach((ds) => {
    const sumDoc = ds.validCount + ds.expiringCount + ds.criticalCount + ds.expiredCount + ds.missingCount;
    assert(sumDoc === total, `${ds.documentType} status components sum (${sumDoc}) reconciles with total (${total})`);
  });

  // Renewals invariant check (version_number > 1)
  data.reports.renewals.forEach((r) => {
    assert(r.renewalCount >= 0, `${r.documentType} renewals count is valid non-negative number (${r.renewalCount})`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. GLOBAL FILTERING RECONCILIATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n3. Testing Global Dimensional Filtering...");
  if (data.filterOptions.campuses.length > 0) {
    const testCampus = data.filterOptions.campuses[0];
    const filteredByCampus = await service.getDimensionalReports({ campus: testCampus });
    const campusTotal = filteredByCampus.overview.totalStudents;
    const campusRows = filteredByCampus.reports.campus;
    assert(campusRows.length === 1 && campusRows[0].label === testCampus, `Filtered campus report only contains selected campus '${testCampus}'`);
    assert(campusRows[0].studentCount === campusTotal, `Filtered campus student count matches totalStudents (${campusTotal})`);
  }

  if (data.filterOptions.categories.length > 0) {
    const testCat = data.filterOptions.categories[0];
    const filteredByCat = await service.getDimensionalReports({ category: testCat });
    const catTotal = filteredByCat.overview.totalStudents;
    const catRows = filteredByCat.reports.category;
    assert(catRows.length === 1 && catRows[0].label === testCat, `Filtered category report only contains selected category '${testCat}'`);
    assert(catRows[0].studentCount === catTotal, `Filtered category count matches totalStudents (${catTotal})`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. EXCEL WORKBOOK GENERATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n4. Testing Excel Export Engine (Single Dimension & All Dimensions)...");
  const dimensionsToTest: ExportableDimensionType[] = [
    "country",
    "category",
    "school",
    "program",
    "funding",
    "campus",
    "academicYear",
    "studentStatus",
    "compliance",
    "documentStatus",
    "renewals",
  ];

  for (const dim of dimensionsToTest) {
    const singleExport = DimensionalExcelService.exportSingleDimensionExcel(dim, data);
    assert(Buffer.isBuffer(singleExport.buffer), `${dim}: Export produced valid binary Buffer`);
    assert(singleExport.buffer.length > 1000, `${dim}: Buffer size is realistic (${singleExport.buffer.length} bytes)`);
    assert(singleExport.fileName.startsWith("iscms-") && singleExport.fileName.endsWith(".xlsx"), `${dim}: File name is standard (${singleExport.fileName})`);

    // Parse with XLSX to ensure file integrity
    const parsedWb = XLSX.read(singleExport.buffer, { type: "buffer" });
    assert(parsedWb.SheetNames.length === 1, `${dim}: Workbook contains exactly 1 sheet (${parsedWb.SheetNames[0]})`);
  }

  // Test Combined "Export All" Workbook
  const allExport = DimensionalExcelService.exportAllDimensionsExcel(data);
  assert(Buffer.isBuffer(allExport.buffer), "Export All produced valid binary Buffer");
  assert(allExport.fileName.startsWith("iscms-all-reports-") && allExport.fileName.endsWith(".xlsx"), `Export All file name is standard (${allExport.fileName})`);

  const parsedAllWb = XLSX.read(allExport.buffer, { type: "buffer" });
  assert(parsedAllWb.SheetNames.length === 12, `Export All workbook contains all 12 sheets (found: ${parsedAllWb.SheetNames.length})`);
  const expectedSheets = [
    "Executive Summary",
    "Country-wise",
    "Category-wise",
    "School-wise",
    "Program-wise",
    "Funding-wise",
    "Campus-wise",
    "Academic Year-wise",
    "Status-wise",
    "Compliance-wise",
    "Document Status",
    "Renewals",
  ];
  const allSheetsPresent = expectedSheets.every((s) => parsedAllWb.SheetNames.includes(s));
  assert(allSheetsPresent, `All 12 expected sheets are present: ${expectedSheets.join(", ")}`);

  console.log("\n===============================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
