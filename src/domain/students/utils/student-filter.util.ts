/**
 * Shared Student Filtering and Export Filename Utilities
 *
 * Guarantees strict 1:1 consistency between the directory table view
 * and the complete-dataset Excel exporter.
 */

import { normalizeAcademicLevel } from "@/domain/academic-programs/academic-level";

export interface StudentExportFilterCriteria {
  searchQuery?: string;
  complianceFilter?: string; // "all" | "compliant" | "warning" | "critical" | "non_compliant" | "expired" | "missing"
  academicFilter?: string; // "all" | "good_standing" | "probation" | "suspended"
  academicLevelFilter?: string; // "all" | string (e.g. "UG", "PG", "PhD", "diploma", "certificate")
  admissionYearFilter?: string; // "all" | string (e.g. "2024-2025", "2023-2024")
  campusFilter?: string; // "all" | "not_specified" | string (e.g. "Gandhinagar", "Delhi")
  feePaymentCategoryFilter?: string; // "all" | "not_specified" | "self_financed" | "scholarship"
  scope?: "filtered" | "all";
}

export interface FilterableStudentTarget {
  fullName: string;
  registrationNumber?: string | null;
  nationalityName?: string | null;
  nationalityCode?: string | null;
  programName?: string | null;
  programCode?: string | null;
  programId?: string | null;
  academicLevel?: string | null;
  academicLevelLabel?: string | null;
  admissionAcademicYear?: string | null;
  school?: string | null;
  admissionCategory?: string | null;
  iccrApplicationNumber?: string | null;
  iccrScholarshipSchemeName?: string | null;
  siiApplicationNumber?: string | null;
  nfsuCampus?: string | null;
  feePaymentCategory?: string | null;
  passportNumber?: string | null;
  visaNumber?: string | null;
  efrroNumber?: string | null;
  email?: string | null;
  complianceStatus: string;
  academicStatus: string;
}

/**
 * Checks whether a given student record satisfies all specified filter criteria.
 */
export function matchStudentFilters(
  student: FilterableStudentTarget,
  criteria: StudentExportFilterCriteria = {}
): boolean {
  if (criteria.scope === "all") {
    return true;
  }

  // 1. Search Query
  if (criteria.searchQuery && criteria.searchQuery.trim() !== "") {
    const query = criteria.searchQuery.toLowerCase().trim();
    const matchesSearch =
      (student.fullName || "").toLowerCase().includes(query) ||
      (student.registrationNumber || "").toLowerCase().includes(query) ||
      (student.nationalityName || "").toLowerCase().includes(query) ||
      (student.nationalityCode || "").toLowerCase().includes(query) ||
      (student.programName || "").toLowerCase().includes(query) ||
      (student.programCode || "").toLowerCase().includes(query) ||
      (student.academicLevelLabel || "").toLowerCase().includes(query) ||
      (student.academicLevel || "").toLowerCase().includes(query) ||
      (student.school || "").toLowerCase().includes(query) ||
      (student.iccrApplicationNumber || "").toLowerCase().includes(query) ||
      (student.siiApplicationNumber || "").toLowerCase().includes(query) ||
      (student.nfsuCampus || "").toLowerCase().includes(query) ||
      (student.admissionAcademicYear || "").toLowerCase().includes(query) ||
      (student.passportNumber || "").toLowerCase().includes(query) ||
      (student.visaNumber || "").toLowerCase().includes(query) ||
      (student.efrroNumber || "").toLowerCase().includes(query) ||
      (student.email || "").toLowerCase().includes(query);

    if (!matchesSearch) {
      return false;
    }
  }

  // 2. Compliance Status
  if (criteria.complianceFilter && criteria.complianceFilter !== "all") {
    const cFilter = criteria.complianceFilter.toLowerCase().trim();
    const rawStatus = (student.complianceStatus || "").toLowerCase().trim();
    if (cFilter === "critical") {
      if (rawStatus !== "non_compliant" && rawStatus !== "expired") {
        return false;
      }
    } else if (cFilter === "missing" || cFilter === "non_compliant") {
      if (rawStatus !== "non_compliant" && rawStatus !== "missing") {
        return false;
      }
    } else if (rawStatus !== cFilter) {
      return false;
    }
  }

  // 3. Academic Standing
  if (criteria.academicFilter && criteria.academicFilter !== "all") {
    const aFilter = criteria.academicFilter.toLowerCase().trim();
    const rawStatus = (student.academicStatus || "").toLowerCase().trim();
    if (rawStatus !== aFilter) {
      return false;
    }
  }

  // 4. Academic Level
  if (criteria.academicLevelFilter && criteria.academicLevelFilter !== "all") {
    const normLevel = normalizeAcademicLevel(student.academicLevel);
    if (normLevel !== criteria.academicLevelFilter) {
      return false;
    }
  }

  // 5. Admission / Academic Year Filter
  if (criteria.admissionYearFilter && criteria.admissionYearFilter !== "all") {
    const year = (student.admissionAcademicYear || "").trim();
    if (criteria.admissionYearFilter === "not_specified") {
      if (year !== "") {
        return false;
      }
    } else {
      if (year.toLowerCase() !== criteria.admissionYearFilter.trim().toLowerCase()) {
        return false;
      }
    }
  }

  // 6. NFSU Campus Filter
  if (criteria.campusFilter && criteria.campusFilter !== "all") {
    const campus = (student.nfsuCampus || "").trim();
    if (criteria.campusFilter === "not_specified") {
      if (campus !== "") {
        return false;
      }
    } else {
      if (campus.toLowerCase() !== criteria.campusFilter.trim().toLowerCase()) {
        return false;
      }
    }
  }

  // 7. Fee Payment Category Filter
  if (criteria.feePaymentCategoryFilter && criteria.feePaymentCategoryFilter !== "all") {
    const feeCategory = (student.feePaymentCategory || "").trim();
    if (criteria.feePaymentCategoryFilter === "not_specified") {
      if (feeCategory !== "") {
        return false;
      }
    } else {
      if (feeCategory.toLowerCase() !== criteria.feePaymentCategoryFilter.trim().toLowerCase()) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Sanitizes a campus name or filter value for safe inclusion in filenames.
 */
export function sanitizeFilenamePart(val: string): string {
  return val
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

/**
 * Generates standardized, descriptive export filename following ISCMS conventions.
 *
 * Rules:
 * - No filters or scope="all": ISCMS_Students_YYYY-MM-DD.xlsx
 * - Single NFSU Campus (e.g. Gandhinagar): ISCMS_Students_Gandhinagar_YYYY-MM-DD.xlsx
 * - NFSU Campus Not Specified: ISCMS_Students_Unspecified_Campus_YYYY-MM-DD.xlsx
 * - Multiple filters or search: ISCMS_Students_Filtered_YYYY-MM-DD.xlsx
 */
export function generateStudentExportFilename(
  criteria: StudentExportFilterCriteria = {},
  date: Date = new Date()
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  if (criteria.scope === "all") {
    return `ISCMS_Students_${dateStr}.xlsx`;
  }

  const hasSearch = Boolean(criteria.searchQuery && criteria.searchQuery.trim());
  const hasCompliance = Boolean(criteria.complianceFilter && criteria.complianceFilter !== "all");
  const hasAcademic = Boolean(criteria.academicFilter && criteria.academicFilter !== "all");
  const hasLevel = Boolean(criteria.academicLevelFilter && criteria.academicLevelFilter !== "all");
  const hasCampus = Boolean(criteria.campusFilter && criteria.campusFilter !== "all");
  const hasFeeCategory = Boolean(criteria.feePaymentCategoryFilter && criteria.feePaymentCategoryFilter !== "all");

  const activeFilterCount = [hasSearch, hasCompliance, hasAcademic, hasLevel, hasCampus, hasFeeCategory].filter(Boolean).length;

  if (activeFilterCount === 0) {
    return `ISCMS_Students_${dateStr}.xlsx`;
  }

  // Single campus filter active
  if (activeFilterCount === 1 && hasCampus && criteria.campusFilter) {
    if (criteria.campusFilter === "not_specified") {
      return `ISCMS_Students_Unspecified_Campus_${dateStr}.xlsx`;
    }
    const safeCampus = sanitizeFilenamePart(criteria.campusFilter);
    return `ISCMS_Students_${safeCampus || "Campus"}_${dateStr}.xlsx`;
  }

  // Multiple filters or other filter active
  return `ISCMS_Students_Filtered_${dateStr}.xlsx`;
}
