import * as XLSX from "xlsx";
import {
  DimensionalReportsData,
  DimensionRow,
  DocumentStatusMetricRow,
  RenewalMetricRow,
  ExportableDimensionType,
} from "../types/dimensional-reports";

export class DimensionalExcelService {
  /**
   * Builds an Excel worksheet with enterprise metadata headers, applied filter summary,
   * data rows, column autofilter, and summary totals.
   */
  private static createReportWorksheet(
    reportTitle: string,
    filtersSummary: string[],
    headers: string[],
    rows: (string | number)[][],
    totalsRow?: (string | number)[]
  ): XLSX.WorkSheet {
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

    const sheetData: (string | number)[][] = [
      ["NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU)"],
      ["International Student Compliance Management System (ISCMS)"],
      [`Report: ${reportTitle}`],
      [`Generated at: ${timestamp}`],
      [`Applied Filters: ${filtersSummary.length > 0 ? filtersSummary.join(" | ") : "All Students (Unfiltered)"}`],
      [], // blank spacer
      headers,
      ...rows,
    ];

    if (totalsRow) {
      sheetData.push(totalsRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Calculate dynamic column widths with generous padding
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      rows.forEach((r) => {
        const valStr = String(r[colIdx] ?? "");
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      if (totalsRow && String(totalsRow[colIdx] ?? "").length > maxLen) {
        maxLen = String(totalsRow[colIdx]).length;
      }
      return { wch: Math.min(Math.max(maxLen + 6, 20), 60) };
    });
    ws["!cols"] = colWidths;

    // Enable auto-filter on table headers (row index 6 is header row, 0-indexed)
    const headerRowIndex = 6;
    const lastRowIndex = headerRowIndex + rows.length;
    const endColLetter = XLSX.utils.encode_col(headers.length - 1);
    ws["!autofilter"] = {
      ref: `A${headerRowIndex + 1}:${endColLetter}${lastRowIndex + 1}`,
    };

    return ws;
  }

  /**
   * Builds filter summary strings from the active report filters.
   */
  private static getFilterStrings(data: DimensionalReportsData): string[] {
    const filters: string[] = [];
    const f = data.filters;
    if (f.academicYear) filters.push(`Academic Year: ${f.academicYear}`);
    if (f.campus) filters.push(`Campus: ${f.campus}`);
    if (f.category) filters.push(`Category: ${f.category}`);
    if (f.schoolId) filters.push(`School: ${f.schoolId}`);
    if (f.programId) filters.push(`Program: ${f.programId}`);
    if (f.fundingType) filters.push(`Funding: ${f.fundingType}`);
    if (f.studentStatus) filters.push(`Status: ${f.studentStatus}`);
    if (f.countryCode) filters.push(`Country Code: ${f.countryCode}`);
    if (f.complianceStatus) filters.push(`Compliance: ${f.complianceStatus}`);
    return filters;
  }

  /**
   * Exports a single dimension report as an Excel workbook (.xlsx).
   */
  static exportSingleDimensionExcel(
    dimension: ExportableDimensionType,
    data: DimensionalReportsData
  ): { buffer: Buffer; fileName: string; mimeType: string } {
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filterStrings = this.getFilterStrings(data);
    const totalStudents = data.overview.totalStudents;

    let title = "";
    let sheetName = "";
    let fileName = "";
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let totalsRow: (string | number)[] | undefined = undefined;

    switch (dimension) {
      case "country":
        title = "Country-wise International Student Registry Report";
        sheetName = "Country-wise";
        fileName = `iscms-country-wise-${dateStr}.xlsx`;
        headers = ["Country", "Country Code (ISO-3)", "Student Count", "Share (%)"];
        rows = data.reports.country.map((r) => [r.label, r.subLabel || "—", r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", "—", totalStudents, "100.00%"];
        break;

      case "category":
        title = "Category-wise International Student Registry Report";
        sheetName = "Category-wise";
        fileName = `iscms-category-wise-${dateStr}.xlsx`;
        headers = ["Admission Category", "Student Count", "Share (%)"];
        rows = data.reports.category.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", totalStudents, "100.00%"];
        break;

      case "school":
        title = "Academic School-wise Student Distribution Report";
        sheetName = "School-wise";
        fileName = `iscms-academic-school-wise-${dateStr}.xlsx`;
        headers = ["School Code", "School Name", "Student Count", "Share (%)"];
        rows = data.reports.school.map((r) => [r.label, r.subLabel || r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", "", totalStudents, "100.00%"];
        break;

      case "program":
        title = "Academic Degree Program & Course-wise Enrollment Report";
        sheetName = "Program-wise";
        fileName = `iscms-academic-program-wise-${dateStr}.xlsx`;
        headers = ["Program Code", "Academic Degree Program", "Student Count", "Share (%)"];
        rows = data.reports.program.map((r) => [r.label, r.subLabel || r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", "", totalStudents, "100.00%"];
        break;

      case "funding":
        title = "Scholarship & Funding Type-wise Student Report";
        sheetName = "Funding-wise";
        fileName = `iscms-scholarship-funding-wise-${dateStr}.xlsx`;
        headers = ["Funding Type / Scheme", "Student Count", "Share (%)"];
        rows = data.reports.funding.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", totalStudents, "100.00%"];
        break;

      case "campus":
        title = "NFSU Campus-wise Student Distribution Report";
        sheetName = "Campus-wise";
        fileName = `iscms-campus-wise-${dateStr}.xlsx`;
        headers = ["NFSU Campus", "Student Count", "Share (%)"];
        rows = data.reports.campus.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", totalStudents, "100.00%"];
        break;

      case "academicYear":
        title = "Admission / Academic Year-wise Enrollment Report";
        sheetName = "Academic Year-wise";
        fileName = `iscms-academic-year-wise-${dateStr}.xlsx`;
        headers = ["Admission / Academic Year", "Student Count", "Share (%)"];
        rows = data.reports.academicYear.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", totalStudents, "100.00%"];
        break;

      case "studentStatus":
        title = "Student Status Distribution Report";
        sheetName = "Status-wise";
        fileName = `iscms-student-status-wise-${dateStr}.xlsx`;
        headers = ["Student Status", "Student Count", "Share (%)"];
        rows = data.reports.studentStatus.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", totalStudents, "100.00%"];
        break;

      case "compliance":
        title = "Authoritative Compliance Distribution Report";
        sheetName = "Compliance-wise";
        fileName = `iscms-compliance-wise-${dateStr}.xlsx`;
        headers = ["Compliance Status", "Student Count", "Share (%)"];
        rows = data.reports.compliance.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]);
        totalsRow = ["Total Represented", totalStudents, "100.00%"];
        break;

      case "documentStatus":
        title = "Document Validity & Status Report (Passport, Visa, eFRRO)";
        sheetName = "Document Status";
        fileName = `iscms-document-status-${dateStr}.xlsx`;
        headers = ["Document Type", "Students with Document", "Valid (31+d)", "Upcoming (16–30d)", "Critical (0–15d)", "Expired", "Missing"];
        rows = data.reports.documentStatus.map((d) => [
          d.documentType,
          d.totalWithDoc,
          d.validCount,
          d.expiringCount,
          d.criticalCount,
          d.expiredCount,
          d.missingCount,
        ]);
        break;

      case "renewals":
        title = "Authoritative Document Renewal History Report (Version > 1 Strictly)";
        sheetName = "Renewals";
        fileName = `iscms-document-renewals-${dateStr}.xlsx`;
        headers = ["Document Type", "Total Renewal Records"];
        rows = data.reports.renewals.map((r) => [r.documentType, r.renewalCount]);
        totalsRow = ["Total Renewals Recorded", data.overview.totalRenewals];
        break;

      default:
        throw new Error(`Unsupported dimension for single export: ${dimension}`);
    }

    const ws = this.createReportWorksheet(title, filterStrings, headers, rows, totalsRow);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
    return {
      buffer: Buffer.from(buffer),
      fileName,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  /**
   * Exports ALL dimension reports in a unified multi-sheet Excel workbook (.xlsx).
   */
  static exportAllDimensionsExcel(
    data: DimensionalReportsData
  ): { buffer: Buffer; fileName: string; mimeType: string } {
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10);
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const filterStrings = this.getFilterStrings(data);
    const totalStudents = data.overview.totalStudents;

    // ── SHEET 1: Summary Overview ─────────────────────────────────────────────
    const summaryData: (string | number)[][] = [
      ["NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU)"],
      ["International Student Compliance Management System (ISCMS)"],
      ["Comprehensive Multi-Dimensional Analytics & Executive Report"],
      [`Generated at: ${timestamp}`],
      [`Applied Filters: ${filterStrings.length > 0 ? filterStrings.join(" | ") : "All Students (Unfiltered)"}`],
      [],
      ["Key Performance Indicator", "Value", "", "Description"],
      ["Total Active Students Represented", data.overview.totalStudents, "", "Total student cohort matching applied filters"],
      ["Distinct Sovereign Nationalities", data.overview.totalCountries, "", "Number of sovereign countries represented"],
      ["NFSU Campuses Represented", data.overview.totalCampuses, "", "Number of university campuses hosting students"],
      ["Academic Schools Represented", data.overview.totalSchools, "", "Number of academic schools enrolled"],
      ["Academic Degree Programs Represented", data.overview.totalPrograms, "", "Number of degree courses/programs"],
      ["Fully Compliant Students", data.overview.totalFullyCompliant, "", "Positive compliance: all documents valid >30d"],
      ["Total Document Renewals Recorded", data.overview.totalRenewals, "", "Positively verified renewal versions (>1)"],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [
      { wch: 44 }, // Key Performance Indicator
      { wch: 16 }, // Value
      { wch: 4 },  // Blank spacer column gap
      { wch: 64 }, // Description
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // ── SHEET 2: Country-wise ─────────────────────────────────────────────────
    const wsCountry = this.createReportWorksheet(
      "Country-wise International Student Registry",
      filterStrings,
      ["Country", "Country Code (ISO-3)", "Student Count", "Share (%)"],
      data.reports.country.map((r) => [r.label, r.subLabel || "—", r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", "—", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsCountry, "Country-wise");

    // ── SHEET 3: Category-wise ────────────────────────────────────────────────
    const wsCategory = this.createReportWorksheet(
      "Category-wise Student Registry",
      filterStrings,
      ["Admission Category", "Student Count", "Share (%)"],
      data.reports.category.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsCategory, "Category-wise");

    // ── SHEET 4: Academic School-wise ─────────────────────────────────────────
    const wsSchool = this.createReportWorksheet(
      "Academic School-wise Distribution",
      filterStrings,
      ["School Code", "School Name", "Student Count", "Share (%)"],
      data.reports.school.map((r) => [r.label, r.subLabel || r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", "", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsSchool, "School-wise");

    // ── SHEET 5: Academic Program-wise ────────────────────────────────────────
    const wsProgram = this.createReportWorksheet(
      "Academic Degree Program & Course-wise Enrollment",
      filterStrings,
      ["Program Code", "Academic Degree Program", "Student Count", "Share (%)"],
      data.reports.program.map((r) => [r.label, r.subLabel || r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", "", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsProgram, "Program-wise");

    // ── SHEET 6: Scholarship / Funding Type-wise ──────────────────────────────
    const wsFunding = this.createReportWorksheet(
      "Scholarship & Funding Type Distribution",
      filterStrings,
      ["Funding Type / Scheme", "Student Count", "Share (%)"],
      data.reports.funding.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsFunding, "Funding-wise");

    // ── SHEET 7: Campus-wise ──────────────────────────────────────────────────
    const wsCampus = this.createReportWorksheet(
      "NFSU Campus-wise Student Distribution",
      filterStrings,
      ["NFSU Campus", "Student Count", "Share (%)"],
      data.reports.campus.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsCampus, "Campus-wise");

    // ── SHEET 8: Academic Year-wise ───────────────────────────────────────────
    const wsYear = this.createReportWorksheet(
      "Admission & Academic Year-wise Intake",
      filterStrings,
      ["Admission / Academic Year", "Student Count", "Share (%)"],
      data.reports.academicYear.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsYear, "Academic Year-wise");

    // ── SHEET 9: Student Status-wise ──────────────────────────────────────────
    const wsStatus = this.createReportWorksheet(
      "Student Status Distribution",
      filterStrings,
      ["Student Status", "Student Count", "Share (%)"],
      data.reports.studentStatus.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsStatus, "Status-wise");

    // ── SHEET 10: Compliance-wise ─────────────────────────────────────────────
    const wsCompliance = this.createReportWorksheet(
      "Authoritative Compliance Status Distribution",
      filterStrings,
      ["Compliance Status", "Student Count", "Share (%)"],
      data.reports.compliance.map((r) => [r.label, r.studentCount, `${r.percentage.toFixed(2)}%`]),
      ["Total Represented", totalStudents, "100.00%"]
    );
    XLSX.utils.book_append_sheet(wb, wsCompliance, "Compliance-wise");

    // ── SHEET 11: Document Status Breakdown ───────────────────────────────────
    const wsDocStatus = this.createReportWorksheet(
      "Document Validity Breakdown (Passport, Visa, eFRRO)",
      filterStrings,
      ["Document Type", "Students with Document", "Valid (31+d)", "Upcoming (16–30d)", "Critical (0–15d)", "Expired", "Missing"],
      data.reports.documentStatus.map((d) => [
        d.documentType,
        d.totalWithDoc,
        d.validCount,
        d.expiringCount,
        d.criticalCount,
        d.expiredCount,
        d.missingCount,
      ])
    );
    XLSX.utils.book_append_sheet(wb, wsDocStatus, "Document Status");

    // ── SHEET 12: Renewals Breakdown ──────────────────────────────────────────
    const wsRenewals = this.createReportWorksheet(
      "Authoritative Document Renewal History (Version > 1 Strictly)",
      filterStrings,
      ["Document Type", "Total Renewal Records"],
      data.reports.renewals.map((r) => [r.documentType, r.renewalCount]),
      ["Total Renewals Recorded", data.overview.totalRenewals]
    );
    XLSX.utils.book_append_sheet(wb, wsRenewals, "Renewals");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
    return {
      buffer: Buffer.from(buffer),
      fileName: `iscms-all-reports-${dateStr}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
}
