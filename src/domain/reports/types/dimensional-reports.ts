/**
 * Dimensional Reports & Analytics Types
 *
 * Defines data structures, filters, and metric models for the ISCMS
 * Administrator Reports workspace and multi-sheet Excel export system.
 */

export interface DimensionFilterOptions {
  academicYears: string[];
  campuses: string[];
  categories: string[];
  schools: Array<{ id: string; name: string; code?: string }>;
  programs: Array<{ id: string; name: string; code?: string; schoolId?: string }>;
  fundingTypes: string[];
  studentStatuses: string[];
  countries: Array<{ code: string; name: string }>;
  complianceStatuses: string[];
}

export interface DimensionReportFilters {
  academicYear?: string;
  campus?: string;
  category?: string;
  schoolId?: string;
  programId?: string;
  fundingType?: string;
  studentStatus?: string;
  countryCode?: string;
  complianceStatus?: string;
}

export interface DimensionRow {
  key: string;            // Machine/unique key, e.g. "Nigeria", "ICCR", "M.Sc. Cyber Security"
  label: string;          // Human-readable label
  subLabel?: string;      // Optional code, e.g. "NGA" or "MSCS"
  studentCount: number;
  percentage: number;     // Calculated as (studentCount / totalFilteredStudents) * 100
}

export interface DocumentStatusMetricRow {
  documentType: "Passport" | "Visa" | "eFRRO";
  totalWithDoc: number;
  validCount: number;      // 31+ days
  expiringCount: number;   // 16-30 days
  criticalCount: number;   // 0-15 days
  expiredCount: number;    // < 0 days
  missingCount: number;    // Not recorded
}

export interface RenewalMetricRow {
  documentType: "Passport" | "Visa" | "eFRRO";
  renewalCount: number;    // Positively identified renewals (strictly version_number > 1)
}

export interface DimensionalReportsData {
  filters: DimensionReportFilters;
  filterOptions: DimensionFilterOptions;
  overview: {
    totalStudents: number;
    totalCountries: number;
    totalCampuses: number;
    totalSchools: number;
    totalPrograms: number;
    totalFullyCompliant: number;
    totalRenewals: number;
  };
  reports: {
    country: DimensionRow[];
    category: DimensionRow[];
    school: DimensionRow[];
    program: DimensionRow[];
    funding: DimensionRow[];
    campus: DimensionRow[];
    academicYear: DimensionRow[];
    studentStatus: DimensionRow[];
    compliance: DimensionRow[];
    documentStatus: DocumentStatusMetricRow[];
    renewals: RenewalMetricRow[];
  };
}

export type ExportableDimensionType =
  | "country"
  | "category"
  | "school"
  | "program"
  | "funding"
  | "campus"
  | "academicYear"
  | "studentStatus"
  | "compliance"
  | "documentStatus"
  | "renewals"
  | "all";
