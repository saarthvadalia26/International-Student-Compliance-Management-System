/**
 * Student Excel Export Domain Service
 *
 * Implements authoritative data extraction, shared filter evaluation,
 * .xlsx workbook generation with frozen headers and autofilter, and audit logging.
 */

import * as XLSX from "xlsx";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getCountryByCode } from "@/utils/countries";
import { AcademicProgramService, LEGACY_PROGRAM_ALIASES } from "@/domain/academic-programs/academic-program.service";
import { SchoolService } from "@/domain/schools/school.service";
import { getAcademicLevelLabel } from "@/domain/academic-programs/academic-level";
import { formatDateForExcel } from "@/lib/utils/date";
import { 
  StudentExportFilterCriteria, 
  matchStudentFilters, 
  generateStudentExportFilename 
} from "../utils/student-filter.util";
import type { User } from "@supabase/supabase-js";
import { requireAdministrator } from "@/lib/auth/permissions";
import { ComplianceCalculator } from "@/domain/compliance/services/compliance-calculator";

interface DatabaseVersionRow {
  id?: string;
  version_number?: number;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  place_of_issue?: string | null;
  visa_type?: string | null;
  verification_status?: string;
  is_active?: boolean;
  notes?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

interface DatabaseStudentExportRow {
  id: string;
  registration_number?: string | null;
  status?: string;
  created_at?: string;
  student_personal?: Array<Record<string, unknown>> | Record<string, unknown> | null;
  student_contact?: Array<Record<string, unknown>> | Record<string, unknown> | null;
  student_academic?: Array<Record<string, unknown>> | Record<string, unknown> | null;
  student_snapshot?: Array<Record<string, unknown>> | Record<string, unknown> | null;
  student_relationships?: Array<Record<string, unknown>> | null;
  passport_versions?: DatabaseVersionRow[] | null;
  visa_versions?: DatabaseVersionRow[] | null;
  efrro_versions?: DatabaseVersionRow[] | null;
}

export class StudentExcelExportService {
  /**
   * Helper: Formats Date or ISO date string as enterprise standard DD/MM/YYYY.
   */
  private static formatDate(val: unknown): string {
    return formatDateForExcel(val);
  }

  /**
   * Helper: Normalizes admission category to a readable title.
   */
  private static formatAdmissionCategory(category?: string | null, customOther?: string | null): string {
    if (!category) return "Not Specified";
    const lower = category.toLowerCase().trim();
    switch (lower) {
      case "iccr":
        return "Indian Council for Cultural Relations (ICCR)";
      case "sii":
        return "Study in India (SII)";
      case "direct":
        return "Direct Admission";
      case "foreign_govt_sponsored":
        return "Foreign Govt. Sponsored";
      case "other":
        return customOther ? `Other (${customOther})` : "Other";
      default:
        return category;
    }
  }

  /**
   * Helper: Formats academic status enum to standard display text.
   */
  private static formatAcademicStatus(status?: string | null): string {
    if (!status) return "Good Standing";
    const lower = status.toLowerCase().trim();
    switch (lower) {
      case "good_standing":
        return "Good Standing";
      case "probation":
        return "Academic Probation";
      case "suspended":
        return "Suspended";
      default:
        return status;
    }
  }

  /**
   * Helper: Formats compliance status string.
   */
  private static formatComplianceStatus(status?: string | null): string {
    if (!status) return "INCOMPLETE";
    const upper = status.toUpperCase().trim();
    if (upper === "MISSING") return "INCOMPLETE";
    return upper;
  }

  /**
   * Helper: Formats fee payment category enum to standard display text.
   */
  private static formatFeePaymentCategory(category?: string | null): string {
    if (!category) return "";
    switch (category.toLowerCase().trim()) {
      case "self_financed":
        return "Self Financed";
      case "scholarship":
        return "Scholarship";
      default:
        return category;
    }
  }

  /**
   * Retrieves full dataset from database, resolves relations, applies exact shared filters,
   * compiles Excel .xlsx workbook, and writes an audit event.
   */
  static async exportStudents(
    criteria: StudentExportFilterCriteria,
    actor: User
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    count: number;
  }> {
    requireAdministrator(actor);
    const supabase = getAdminSupabase();

    // 1. Query full student dataset with related tables
    const { data: records, error } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        created_at,
        student_personal(*),
        student_contact(*),
        student_academic(*),
        student_snapshot(*),
        student_relationships(*),
        passport_versions(*),
        visa_versions(*),
        efrro_versions(*)
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[STUDENT_EXCEL_EXPORT_DB_ERROR]", error);
      throw new Error("Unable to retrieve student records for export.");
    }

    // 2. Fetch authoritative academic programs and schools maps
    const programService = new AcademicProgramService();
    const schoolService = new SchoolService();
    const [allPrograms, allSchools] = await Promise.all([
      programService.getAllPrograms().catch(() => []),
      schoolService.getAllSchools().catch(() => [])
    ]);

    const schoolsMap = new Map<string, string>();
    allSchools.forEach(s => {
      if (s.id) schoolsMap.set(s.id.toLowerCase(), s.name);
      if (s.code) schoolsMap.set(s.code.toLowerCase(), s.name);
    });

    const programMap = new Map<string, { id: string; name: string; school: string; academicLevel: string | null }>();
    const normalizedNameMap = new Map<string, { id: string; name: string; school: string; academicLevel: string | null }>();

    function normalizeName(n: string): string {
      return n.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    allPrograms.forEach(p => {
      const item = { 
        id: p.id,
        name: p.programName, 
        school: p.schoolName || "Academic Department",
        academicLevel: p.academicLevel ? String(p.academicLevel) : null
      };
      if (p.id) programMap.set(p.id.toLowerCase(), item);
      if (p.programCode) {
        programMap.set(p.programCode.toLowerCase(), item);
        programMap.set(p.programCode.replace(/_/g, "-").toLowerCase(), item);
        programMap.set(p.programCode.replace(/-/g, "_").toLowerCase(), item);
      }
      if (p.programName) {
        programMap.set(p.programName.toLowerCase(), item);
        normalizedNameMap.set(normalizeName(p.programName), item);
      }
    });

    // Map known legacy aliases
    Object.entries(LEGACY_PROGRAM_ALIASES).forEach(([alias, targetCode]) => {
      const targetMeta = programMap.get(targetCode.toLowerCase());
      if (targetMeta) {
        programMap.set(alias.toLowerCase(), targetMeta);
        programMap.set(alias.replace(/_/g, "-").toLowerCase(), targetMeta);
      }
    });

    // 3. Process and normalize raw database records
    const processedStudents = (records || []).map((r: DatabaseStudentExportRow) => {
      const personal = (Array.isArray(r.student_personal) ? r.student_personal[0] : r.student_personal) as Record<string, any> | undefined;
      const contact = (Array.isArray(r.student_contact) ? r.student_contact[0] : r.student_contact) as Record<string, any> | undefined;
      const academic = (Array.isArray(r.student_academic) ? r.student_academic[0] : r.student_academic) as Record<string, any> | undefined;
      const snapshot = (Array.isArray(r.student_snapshot) ? r.student_snapshot[0] : r.student_snapshot) as Record<string, any> | undefined;
      const relationships = (r.student_relationships || []) as Array<Record<string, any>>;
      const primaryEmergency = relationships[0] || {};

      const activePassport = (r.passport_versions || []).find((p: DatabaseVersionRow) => p.is_active && !p.deleted_at);
      const activeVisa = (r.visa_versions || []).find((v: DatabaseVersionRow) => v.is_active && !v.deleted_at);
      const activeEfrro = (r.efrro_versions || []).find((e: DatabaseVersionRow) => e.is_active && !e.deleted_at);

      const natCode = personal?.nationality_code || "";
      const countryObj = natCode ? getCountryByCode(natCode) : null;
      const nationalityName = countryObj?.name || (natCode ? natCode : "Not specified");

      const progId = academic?.program_id || "";
      const progCode = academic?.program_code || "";
      
      const progInfo = progId && programMap.has(progId.toLowerCase())
        ? programMap.get(progId.toLowerCase())!
        : progCode && programMap.has(progCode.toLowerCase())
        ? programMap.get(progCode.toLowerCase())!
        : progCode && programMap.has(progCode.replace(/_/g, "-").toLowerCase())
        ? programMap.get(progCode.replace(/_/g, "-").toLowerCase())!
        : progCode && normalizedNameMap.has(normalizeName(progCode))
        ? normalizedNameMap.get(normalizeName(progCode))!
        : progCode
        ? {
            id: progId,
            name: progCode,
            school: "Not provided",
            academicLevel: null
          }
        : {
            id: "",
            name: "Not assigned yet",
            school: "Not assigned yet",
            academicLevel: null
          };

      const resolvedSchool = (academic?.override_school_id && schoolsMap.get(academic.override_school_id.toLowerCase()))
        ? schoolsMap.get(academic.override_school_id.toLowerCase())!
        : progInfo.school;

      // Map raw compliance status to UI badge enum using authoritative ComplianceCalculator
      const rawStatus = (snapshot?.compliance_status || "MISSING").toUpperCase();
      const mappedCompliance = ComplianceCalculator.mapComplianceToBadge(rawStatus);

      const passportNumber = activePassport?.document_number || snapshot?.passport_number || "";
      const visaNumber = activeVisa?.document_number || snapshot?.visa_number || "";

      return {
        id: r.id,
        fullName: personal?.full_name || "Unknown Student",
        registrationNumber: r.registration_number || "",
        nationalityCode: natCode,
        nationalityName,
        gender: personal?.gender ? (personal.gender.charAt(0).toUpperCase() + personal.gender.slice(1)) : "Not Specified",
        dateOfBirth: personal?.date_of_birth || null,
        programName: progInfo.name,
        programCode: progCode || "N/A",
        programId: progId || progInfo.id || null,
        academicLevel: progInfo.academicLevel,
        academicLevelLabel: progInfo.academicLevel ? getAcademicLevelLabel(progInfo.academicLevel) : "Not Specified",
        school: resolvedSchool,
        admissionDate: academic?.admission_date || null,
        joiningDate: academic?.joining_date || null,
        expectedGraduation: academic?.expected_graduation || null,
        currentSemester: academic?.current_semester !== undefined && academic?.current_semester !== null ? String(academic.current_semester) : "N/A",
        academicStatus: (academic?.academic_status as string) || "good_standing",
        admissionCategory: academic?.admission_category || null,
        admissionCategoryOther: academic?.admission_category_other || null,
        lastEducationalQualification: academic?.last_educational_qualification || "",
        lastEducationalInstitution: academic?.last_educational_institution || "",
        iccrApplicationNumber: academic?.iccr_application_number || "",
        iccrScholarshipSchemeName: academic?.iccr_scholarship_scheme_name || "",
        siiApplicationNumber: academic?.sii_application_number || "",
        nfsuCampus: academic?.nfsu_campus || "",
        admissionAcademicYear: academic?.admission_academic_year || "",
        feePaymentCategory: academic?.fee_payment_category || null,
        // Preserve NULL vs 0: null fee amounts stay null (output as empty in Excel)
        tuitionFeeAmount: academic?.tuition_fee_amount !== null && academic?.tuition_fee_amount !== undefined
          ? Number(academic.tuition_fee_amount) : null,
        tuitionFeeCurrency: academic?.tuition_fee_currency || null,
        hostelFeeAmount: academic?.hostel_fee_amount !== null && academic?.hostel_fee_amount !== undefined
          ? Number(academic.hostel_fee_amount) : null,
        hostelFeeCurrency: academic?.hostel_fee_currency || null,
        passportNumber,
        passportIssueDate: activePassport?.issue_date || snapshot?.passport_issue_date || null,
        passportExpiry: activePassport?.expiry_date || snapshot?.passport_expiry || null,
        passportPlaceOfIssue: activePassport?.place_of_issue || snapshot?.passport_place_of_issue || "N/A",
        passportRenewalCount: Math.max(0, (r.passport_versions || []).filter((p: DatabaseVersionRow) => !p.deleted_at).length - 1),
        visaNumber,
        visaType: activeVisa?.visa_type || snapshot?.visa_type || "Student (S-1)",
        visaIssueDate: activeVisa?.issue_date || snapshot?.visa_issue_date || null,
        visaExpiry: activeVisa?.expiry_date || snapshot?.visa_expiry || null,
        visaStatus: snapshot?.visa_status || "MISSING",
        visaRenewalCount: Math.max(0, (r.visa_versions || []).filter((v: DatabaseVersionRow) => !v.deleted_at).length - 1),
        efrroNumber: activeEfrro?.document_number || snapshot?.efrro_number || "N/A",
        efrroIssueDate: activeEfrro?.issue_date || snapshot?.efrro_issue_date || null,
        efrroExpiry: activeEfrro?.expiry_date || snapshot?.efrro_expiry || null,
        efrroStatus: snapshot?.efrro_status || "MISSING",
        efrroRenewalCount: Math.max(0, (r.efrro_versions || []).filter((e: DatabaseVersionRow) => !e.deleted_at).length - 1),
        rawPassportVersions: r.passport_versions || [],
        rawVisaVersions: r.visa_versions || [],
        rawEfrroVersions: r.efrro_versions || [],
        email: contact?.email || "",
        phoneLocal: contact?.phone_local || contact?.phone_local_number || "N/A",
        phoneHome: contact?.phone_home || contact?.phone_home_number || "N/A",
        permanentAddress: contact?.permanent_address || "",
        presentAddress: contact?.present_address || contact?.local_address || "",
        emergencyContactName: primaryEmergency?.name || "N/A",
        emergencyContactPhone: primaryEmergency?.phone || "N/A",
        complianceStatus: mappedCompliance,
        rawComplianceStatus: rawStatus || "MISSING"
      };
    });

    // 4. Apply shared filter criteria
    const filteredDataset = processedStudents.filter(student => matchStudentFilters(student, criteria));

    // 5. Define complete administrative export headers
    const headers = [
      "S.No.",
      "Student Name",
      "Registration / Enrolment Number",
      "ICCR Application Number",
      "Name of ICCR Scholarship Scheme",
      "SII Application Number",
      "NFSU Campus",
      "Admission / Academic Year",
      "Fee Payment Category",
      "Tuition Fees",
      "Tuition Fees Currency",
      "Hostel Fees",
      "Hostel Fees Currency",
      "Academic Program",
      "Program Code",
      "Academic Level",
      "School / Department",
      "Admission Date",
      "Joining Date",
      "Expected Graduation",
      "Current Semester",
      "Academic Standing",
      "Admission Category",
      "Last Educational Qualification",
      "Name of University/Institute/School",
      "Nationality / Country",
      "Country Code",
      "Gender",
      "Date of Birth",
      "Passport Number",
      "Passport Issue Date",
      "Passport Expiry Date",
      "Passport Place of Issue",
      "Passport Renewal Count",
      "Visa Number",
      "Visa Type",
      "Visa Issue Date",
      "Visa Expiry Date",
      "Visa Status",
      "Visa Renewal Count",
      "eFRRO Number",
      "eFRRO Issue Date",
      "eFRRO Expiry Date",
      "eFRRO Status",
      "eFRRO Renewal Count",
      "Compliance Status",
      "Email Address",
      "Mobile (Local)",
      "Mobile (Home)",
      "Permanent Address",
      "Present / Current Address",
      "Emergency Contact Name",
      "Emergency Contact Phone"
    ];

    // 6. Build data rows
    const rows = filteredDataset.map((s, idx) => [
      idx + 1,
      s.fullName || "N/A",
      s.registrationNumber || "Not Provided",
      s.iccrApplicationNumber || "N/A",
      s.iccrScholarshipSchemeName || "",
      s.siiApplicationNumber || "N/A",
      s.nfsuCampus ? s.nfsuCampus : "Not Specified",
      s.admissionAcademicYear || "",
      StudentExcelExportService.formatFeePaymentCategory(s.feePaymentCategory),
      s.tuitionFeeAmount !== null && s.tuitionFeeAmount !== undefined ? s.tuitionFeeAmount : "",
      s.tuitionFeeCurrency || "",
      s.hostelFeeAmount !== null && s.hostelFeeAmount !== undefined ? s.hostelFeeAmount : "",
      s.hostelFeeCurrency || "",
      s.programName || "Not Assigned",
      s.programCode || "N/A",
      s.academicLevelLabel || "Not Specified",
      s.school || "Not Assigned",
      StudentExcelExportService.formatDate(s.admissionDate),
      StudentExcelExportService.formatDate(s.joiningDate),
      StudentExcelExportService.formatDate(s.expectedGraduation),
      s.currentSemester || "N/A",
      StudentExcelExportService.formatAcademicStatus(s.academicStatus),
      StudentExcelExportService.formatAdmissionCategory(s.admissionCategory, s.admissionCategoryOther),
      s.lastEducationalQualification || "",
      s.lastEducationalInstitution || "",
      s.nationalityName || "Not Specified",
      s.nationalityCode || "N/A",
      s.gender || "Not Specified",
      StudentExcelExportService.formatDate(s.dateOfBirth),
      s.passportNumber || "Not Provided",
      StudentExcelExportService.formatDate(s.passportIssueDate),
      StudentExcelExportService.formatDate(s.passportExpiry),
      s.passportPlaceOfIssue || "N/A",
      s.passportRenewalCount,
      s.visaNumber || "Not Provided",
      s.visaType || "Student (S-1)",
      StudentExcelExportService.formatDate(s.visaIssueDate),
      StudentExcelExportService.formatDate(s.visaExpiry),
      StudentExcelExportService.formatComplianceStatus(s.visaStatus),
      s.visaRenewalCount,
      s.efrroNumber || "N/A",
      StudentExcelExportService.formatDate(s.efrroIssueDate),
      StudentExcelExportService.formatDate(s.efrroExpiry),
      StudentExcelExportService.formatComplianceStatus(s.efrroStatus),
      s.efrroRenewalCount,
      StudentExcelExportService.formatComplianceStatus(s.rawComplianceStatus),
      s.email || "Not Provided",
      s.phoneLocal || "N/A",
      s.phoneHome || "N/A",
      s.permanentAddress || "",
      s.presentAddress || "",
      s.emergencyContactName || "N/A",
      s.emergencyContactPhone || "N/A"
    ]);

    // 7. Generate Excel workbook with multi-sheet structure
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Apply frozen header row
    ws["!views"] = [{ state: "frozen", ySplit: 1, xSplit: 0 }];

    // Enable Excel autofilter across full table range
    const range = XLSX.utils.decode_range(ws["!ref"] || `A1:AU${rows.length + 1}`);
    ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

    // Set professional column widths
    ws["!cols"] = [
      { wch: 7 },  // S.No.
      { wch: 26 }, // Student Name
      { wch: 24 }, // Enrolment Number
      { wch: 22 }, // ICCR Number
      { wch: 30 }, // Name of ICCR Scholarship Scheme
      { wch: 22 }, // SII Number
      { wch: 20 }, // NFSU Campus
      { wch: 22 }, // Admission / Academic Year
      { wch: 18 }, // Fee Payment Category
      { wch: 14 }, // Tuition Fees
      { wch: 16 }, // Tuition Fees Currency
      { wch: 14 }, // Hostel Fees
      { wch: 16 }, // Hostel Fees Currency
      { wch: 34 }, // Academic Program
      { wch: 16 }, // Program Code
      { wch: 22 }, // Academic Level
      { wch: 32 }, // School
      { wch: 16 }, // Admission Date
      { wch: 18 }, // Expected Graduation
      { wch: 16 }, // Current Semester
      { wch: 18 }, // Academic Standing
      { wch: 30 }, // Admission Category
      { wch: 22 }, // Nationality
      { wch: 14 }, // Country Code
      { wch: 12 }, // Gender
      { wch: 15 }, // Date of Birth
      { wch: 18 }, // Passport Number
      { wch: 18 }, // Passport Issue Date
      { wch: 18 }, // Passport Expiry Date
      { wch: 22 }, // Passport Place of Issue
      { wch: 22 }, // Passport Renewal Count
      { wch: 18 }, // Visa Number
      { wch: 18 }, // Visa Type
      { wch: 16 }, // Visa Issue Date
      { wch: 16 }, // Visa Expiry Date
      { wch: 16 }, // Visa Status
      { wch: 18 }, // Visa Renewal Count
      { wch: 18 }, // eFRRO Number
      { wch: 16 }, // eFRRO Issue Date
      { wch: 16 }, // eFRRO Expiry Date
      { wch: 16 }, // eFRRO Status
      { wch: 20 }, // eFRRO Renewal Count
      { wch: 18 }, // Compliance Status
      { wch: 28 }, // Email Address
      { wch: 18 }, // Mobile (Local)
      { wch: 18 }, // Mobile (Home)
      { wch: 32 }, // Permanent Address
      { wch: 32 }, // Present / Current Address
      { wch: 24 }, // Emergency Contact Name
      { wch: 20 }, // Emergency Contact Phone
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    // Secondary Worksheet: Document Renewal History
    const historyHeaders = [
      "S.No.",
      "Registration / Enrolment Number",
      "Student Legal Name",
      "Nationality",
      "Document Type",
      "Version Number",
      "Version Label",
      "Active Status",
      "Document Number",
      "Issue Date",
      "Expiry Date",
      "Place of Issue / Visa Type",
      "Recorded Date",
      "Administrative Remarks / Notes"
    ];

    const historyRows: any[] = [];
    let historyIdx = 1;

    filteredDataset.forEach(s => {
      // Passport versions
      (s.rawPassportVersions || [])
        .filter((v: DatabaseVersionRow) => !v.deleted_at)
        .sort((a: DatabaseVersionRow, b: DatabaseVersionRow) => (a.version_number || 1) - (b.version_number || 1))
        .forEach((v: DatabaseVersionRow) => {
          const verNum = v.version_number || 1;
          historyRows.push([
            historyIdx++,
            s.registrationNumber || "Not Provided",
            s.fullName || "N/A",
            s.nationalityName || "Not Specified",
            "Passport",
            verNum,
            verNum === 1 ? "Original" : `Renewal ${verNum - 1}`,
            v.is_active ? "Current Active" : "Historical / Superseded",
            v.document_number || "N/A",
            StudentExcelExportService.formatDate(v.issue_date),
            StudentExcelExportService.formatDate(v.expiry_date),
            v.place_of_issue || "N/A",
            StudentExcelExportService.formatDate(v.created_at),
            v.notes || ""
          ]);
        });

      // Visa versions
      (s.rawVisaVersions || [])
        .filter((v: DatabaseVersionRow) => !v.deleted_at)
        .sort((a: DatabaseVersionRow, b: DatabaseVersionRow) => (a.version_number || 1) - (b.version_number || 1))
        .forEach((v: DatabaseVersionRow) => {
          const verNum = v.version_number || 1;
          historyRows.push([
            historyIdx++,
            s.registrationNumber || "Not Provided",
            s.fullName || "N/A",
            s.nationalityName || "Not Specified",
            "Student Visa",
            verNum,
            verNum === 1 ? "Original" : `Renewal ${verNum - 1}`,
            v.is_active ? "Current Active" : "Historical / Superseded",
            v.document_number || "N/A",
            StudentExcelExportService.formatDate(v.issue_date),
            StudentExcelExportService.formatDate(v.expiry_date),
            v.visa_type || "Student (S-1)",
            StudentExcelExportService.formatDate(v.created_at),
            v.notes || ""
          ]);
        });

      // eFRRO versions
      (s.rawEfrroVersions || [])
        .filter((v: DatabaseVersionRow) => !v.deleted_at)
        .sort((a: DatabaseVersionRow, b: DatabaseVersionRow) => (a.version_number || 1) - (b.version_number || 1))
        .forEach((v: DatabaseVersionRow) => {
          const verNum = v.version_number || 1;
          historyRows.push([
            historyIdx++,
            s.registrationNumber || "Not Provided",
            s.fullName || "N/A",
            s.nationalityName || "Not Specified",
            "eFRRO / Permit",
            verNum,
            verNum === 1 ? "Original" : `Renewal ${verNum - 1}`,
            v.is_active ? "Current Active" : "Historical / Superseded",
            v.document_number || "N/A",
            StudentExcelExportService.formatDate(v.issue_date),
            StudentExcelExportService.formatDate(v.expiry_date),
            "Residential Permit",
            StudentExcelExportService.formatDate(v.created_at),
            v.notes || ""
          ]);
        });
    });

    const historyWs = XLSX.utils.aoa_to_sheet([historyHeaders, ...historyRows]);
    historyWs["!views"] = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
    const historyRange = XLSX.utils.decode_range(historyWs["!ref"] || `A1:N${historyRows.length + 1}`);
    historyWs["!autofilter"] = { ref: XLSX.utils.encode_range(historyRange) };
    historyWs["!cols"] = [
      { wch: 7 },  // S.No.
      { wch: 24 }, // Enrolment Number
      { wch: 26 }, // Student Name
      { wch: 20 }, // Nationality
      { wch: 16 }, // Document Type
      { wch: 14 }, // Version Number
      { wch: 16 }, // Version Label
      { wch: 22 }, // Active Status
      { wch: 20 }, // Document Number
      { wch: 16 }, // Issue Date
      { wch: 16 }, // Expiry Date
      { wch: 24 }, // Place / Visa Type
      { wch: 16 }, // Recorded Date
      { wch: 30 }  // Notes
    ];

    XLSX.utils.book_append_sheet(wb, historyWs, "Document Renewal History");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
    const fileName = generateStudentExportFilename(criteria);

    // 8. Record audit log
    try {
      await supabase.from("audit_log").insert({
        actor_id: actor.id,
        actor_email: actor.email,
        actor_name: actor.user_metadata?.full_name || actor.email,
        action: "STUDENT_EXPORT",
        resource: "students/export",
        export_type: "excel",
        filters_applied: {
          ...criteria,
          scope: criteria.scope || "filtered",
          matchingCount: rows.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (auditErr) {
      console.warn("[STUDENT_EXPORT_AUDIT_LOG_WARNING] Failed to record audit log:", auditErr);
    }

    return {
      buffer,
      fileName,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      count: rows.length
    };
  }
}
