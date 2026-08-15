"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { StudentService } from "@/services/student/student.service";
import { RegisterStudentInput, UpdateStudentInput, StudentFilterOptions } from "@/services/student/student.types";
import { z } from "zod";
import { getCountryByCode } from "@/utils/countries";
import { sanitizeError } from "@/lib/errors/error-sanitizer";
import { StorageProviderFactory } from "@/domain/storage/factory";
import { AcademicProgressionEngine, AcademicAdjustmentRecord } from "@/domain/academic/services/semester-progression.service";

const studentService = new StudentService();

export interface StudentListItem {
  id: string;
  fullName: string;
  registrationNumber: string;
  nationalityCode: string;
  nationalityName: string;
  programName: string;
  school: string;
  passport: { number: string };
  visa: { number: string };
  email: string;
  complianceStatus: "compliant" | "warning" | "non_compliant" | "expired";
  academicStatus: "good_standing" | "probation" | "suspended";
}

export interface StudentDocumentDetail {
  number: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  visaType?: string;
  versionNumber?: number | null;
  verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected";
  hasUploadedDocument: boolean;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  filePath?: string | null;
  notes?: string | null;
  activeEarlyAuthorization?: {
    id: string;
    reason: string;
    reasonDetails: string;
    validFrom: string;
    validUntil: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface StudentDetailProfile {
  id: string;
  fullName: string;
  email: string;
  phoneHome: string;
  phoneLocal: string;
  permanentAddress: string;
  localAddress: string;
  currentSemester: number;
  academicStatus: "good_standing" | "probation" | "suspended";
  status: "active" | "suspended" | "graduated" | "withdrawn";
  registrationNumber: string;
  nationalityCode: string;
  nationalityName: string;
  programName: string;
  programCode: string;
  school: string;
  admissionDate: string;
  expectedGraduation: string;
  totalSemesters?: number;
  semesterDuration?: number;
  semesterDurationUnit?: string;
  academicStage?: string;
  academicStageLabel?: string;
  isCompleted?: boolean;
  isFinalSemester?: boolean;
  academicAdjustments?: Array<{
    id?: string;
    adjustmentType: string;
    effectiveDate: string;
    previousProgramCode?: string | null;
    newProgramCode?: string | null;
    previousSemester?: number | null;
    adjustedSemester?: number | null;
    reason: string;
    notes?: string | null;
    createdBy?: string | null;
    createdAt?: string;
  }>;
  complianceStatus: "compliant" | "warning" | "non_compliant" | "expired";
  passport: StudentDocumentDetail;
  visa: StudentDocumentDetail;
  efrro?: StudentDocumentDetail;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  embassy: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    country: string;
    website: string;
    contactPerson?: string;
  };
}

export interface DocumentVersionItem {
  id: string;
  versionNumber: number;
  isActive: boolean;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string | null;
  visaType?: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason: string | null;
  notes?: string | null;
  uploadedAt: string;
  filePath?: string | null;
}

interface VersionDatabaseRow {
  id: string;
  version_number?: number;
  is_active?: boolean;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  place_of_issue?: string | null;
  visa_type?: string | null;
  file_path?: string | null;
  verification_status: "pending" | "verified" | "rejected";
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export type RegisterStudentActionResult = {
  success: boolean;
  studentId?: string;
  errorCode?: "VALIDATION_ERROR" | "DATABASE_CONNECTION_ERROR" | "DATABASE_CONSTRAINT_ERROR" | "DUPLICATE_STUDENT" | "AUTHORIZATION_ERROR" | "SERVER_ERROR";
  errorTitle?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Server Action: Register a new international student
 */
export async function registerStudentAction(input: RegisterStudentInput): Promise<RegisterStudentActionResult> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        errorCode: "AUTHORIZATION_ERROR",
        errorTitle: "Access Restricted",
        error: "You do not have permission to register a student. Please log in as an authorized administrator."
      };
    }

    const created = await studentService.registerStudent(input, user.id);

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      studentId: created.student.id
    };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      err.issues.forEach(issue => {
        const path = String(issue.path[issue.path.length - 1] || issue.path[0] || "");
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      });
      return {
        success: false,
        errorCode: "VALIDATION_ERROR",
        errorTitle: "Student information is incomplete",
        error: "Please correct the highlighted fields before registering the student.",
        fieldErrors
      };
    }

    const rawMsg = err instanceof Error ? err.message : String(err || "");
    const rawLower = rawMsg.toLowerCase();

    if (rawLower.includes("registration number") && (rawLower.includes("already registered") || rawLower.includes("already exists"))) {
      return {
        success: false,
        errorCode: "DUPLICATE_STUDENT",
        errorTitle: "Student already exists",
        error: `A student with registration number "${input.registrationNumber}" is already registered.`
      };
    }

    if (rawLower.includes("email") && (rawLower.includes("already registered") || rawLower.includes("already exists") || rawLower.includes("unique"))) {
      return {
        success: false,
        errorCode: "DUPLICATE_STUDENT",
        errorTitle: "Student already exists",
        error: `A student with email address "${input.email}" is already registered.`
      };
    }

    if (rawLower.includes("database") || rawLower.includes("connect") || rawLower.includes("timeout") || rawLower.includes("pgrst")) {
      return {
        success: false,
        errorCode: "DATABASE_CONNECTION_ERROR",
        errorTitle: "Unable to save the student",
        error: "The system could not connect to the database. Please try again."
      };
    }

    const sanitized = sanitizeError(err, { action: "registerStudentAction", route: "/students/add" });
    return {
      success: false,
      errorCode: "SERVER_ERROR",
      errorTitle: sanitized.title || "Unable to save student",
      error: sanitized.message || "Something went wrong while saving the student record."
    };
  }
}

/**
 * Server Action: Fetch international student directory list with search and filters
 */
export async function getStudentsListAction(filters: StudentFilterOptions = {}): Promise<{
  success: boolean;
  students: StudentListItem[];
  error?: string;
}> {
  try {
    const adminSupabase = getAdminSupabase();

    let query = adminSupabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        created_at,
        student_personal!inner(full_name, nationality_code),
        student_contact!inner(email, phone_home),
        student_academic!inner(program_code, academic_status),
        student_snapshot(compliance_status, passport_number, visa_number)
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("[GET_STUDENTS_LIST_ERROR]", error);
      return {
        success: false,
        students: [],
        error: "Unable to retrieve student records from database."
      };
    }

    // Also fetch academic program lookup map for friendly display names
    const { data: programsData } = await adminSupabase
      .from("academic_programs")
      .select("program_code, program_name, school_name");

    const programMap = new Map<string, { name: string; school: string }>();
    if (programsData) {
      programsData.forEach(p => {
        if (p.program_code) programMap.set(p.program_code, { name: p.program_name, school: p.school_name || "Academic Department" });
        programMap.set(p.program_name, { name: p.program_name, school: p.school_name || "Academic Department" });
      });
    }

    const students: StudentListItem[] = (records || []).map(r => {
      const personal = Array.isArray(r.student_personal) ? r.student_personal[0] : r.student_personal;
      const contact = Array.isArray(r.student_contact) ? r.student_contact[0] : r.student_contact;
      const academic = Array.isArray(r.student_academic) ? r.student_academic[0] : r.student_academic;
      const snapshot = Array.isArray(r.student_snapshot) ? r.student_snapshot[0] : r.student_snapshot;

      const natCode = personal?.nationality_code || "IND";
      const countryObj = getCountryByCode(natCode);
      const nationalityName = countryObj?.name || natCode;

      const progInfo = programMap.get(academic?.program_code || "") || {
        name: academic?.program_code || "General Studies",
        school: "Academic Affairs"
      };

      // Map raw compliance status to UI badge enum
      let mappedCompliance: StudentListItem["complianceStatus"] = "compliant";
      const rawStatus = (snapshot?.compliance_status || "").toUpperCase();
      if (rawStatus === "WARNING" || rawStatus === "PENDING_VERIFICATION") mappedCompliance = "warning";
      else if (rawStatus === "EXPIRED") mappedCompliance = "expired";
      else if (rawStatus === "MISSING" || rawStatus === "REJECTED") mappedCompliance = "non_compliant";

      return {
        id: r.id,
        fullName: personal?.full_name || "Unknown Student",
        registrationNumber: r.registration_number,
        nationalityCode: natCode,
        nationalityName,
        programName: progInfo.name,
        school: progInfo.school,
        passport: { number: snapshot?.passport_number || "Pending" },
        visa: { number: snapshot?.visa_number || "Pending" },
        email: contact?.email || "",
        complianceStatus: mappedCompliance,
        academicStatus: (academic?.academic_status as StudentListItem["academicStatus"]) || "good_standing"
      };
    });

    return {
      success: true,
      students
    };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "getStudentsListAction", route: "/students" });
    return {
      success: false,
      students: [],
      error: sanitized.message
    };
  }
}

/**
 * Server Action: Fetch complete student details for profile page /students/[id]
 */
export async function getStudentDetailsAction(studentId: string): Promise<{
  success: boolean;
  student?: StudentDetailProfile;
  error?: string;
}> {
  try {
    const adminSupabase = getAdminSupabase();

    const { data: record, error } = await adminSupabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        created_at,
        student_personal(*),
        student_contact(*),
        student_academic(*),
        student_relationships(*),
        student_embassy(*),
        student_snapshot(*),
        passport_versions(*),
        visa_versions(*),
        efrro_versions(*)
      `)
      .eq("id", studentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !record) {
      return {
        success: false,
        error: "Student profile record not found."
      };
    }

    const personal = record.student_personal?.[0] || record.student_personal;
    const contact = record.student_contact?.[0] || record.student_contact;
    const academic = record.student_academic?.[0] || record.student_academic;
    const relationships = record.student_relationships || [];
    const primaryContact = relationships[0] || {};
    const embassy = record.student_embassy?.[0] || record.student_embassy || {};
    const snapshot = record.student_snapshot?.[0] || record.student_snapshot || {};

    const hasValidFile = (row?: VersionDatabaseRow | null) => {
      if (!row || !row.file_path) return false;
      const fp = row.file_path.trim().toLowerCase();
      return fp !== "" && fp !== "pending_upload" && fp !== "null";
    };

    const activePassport = (record.passport_versions || []).find((p: VersionDatabaseRow) => p.is_active && !p.deleted_at);
    const isPassportUploaded = hasValidFile(activePassport);

    const activeVisa = (record.visa_versions || []).find((v: VersionDatabaseRow) => v.is_active && !v.deleted_at);
    const isVisaUploaded = hasValidFile(activeVisa);

    const activeEfrro = (record.efrro_versions || []).find((e: VersionDatabaseRow) => e.is_active && !e.deleted_at);
    const isEfrroUploaded = hasValidFile(activeEfrro);

    const countryObj = getCountryByCode(personal?.nationality_code || "IND");

    // Retrieve academic program metadata & course structure
    const { data: progData } = await adminSupabase
      .from("academic_programs")
      .select("program_name, program_code, school_name, total_semesters, semester_duration, semester_duration_unit")
      .or(`program_code.eq.${academic?.program_code},program_name.eq.${academic?.program_code}`)
      .maybeSingle();

    // Retrieve academic adjustments for this student
    const { data: adjustmentsData } = await adminSupabase
      .from("student_academic_adjustments")
      .select("*")
      .eq("student_id", studentId)
      .order("effective_date", { ascending: false });

    const adjustments: AcademicAdjustmentRecord[] = (adjustmentsData || []).map(a => ({
      id: a.id,
      adjustmentType: a.adjustment_type,
      effectiveDate: a.effective_date,
      previousProgramCode: a.previous_program_code,
      newProgramCode: a.new_program_code,
      previousSemester: a.previous_semester,
      adjustedSemester: a.adjusted_semester,
      reason: a.reason,
      notes: a.notes,
      createdBy: a.created_by,
      createdAt: a.created_at
    }));

    // Retrieve active early upload authorizations for this student
    const nowIso = new Date().toISOString();
    const { data: authorizationsData } = await adminSupabase
      .from("student_document_upload_authorizations")
      .select("*")
      .eq("student_id", studentId)
      .eq("status", "active")
      .lte("valid_from", nowIso)
      .gte("valid_until", nowIso)
      .order("created_at", { ascending: false });

    const activePassportAuth = (authorizationsData || []).find(a => a.document_type === "passport");
    const activeVisaAuth = (authorizationsData || []).find(a => a.document_type === "visa");
    const activeEfrroAuth = (authorizationsData || []).find(a => a.document_type === "efrro");

    const totalSemesters = Number(progData?.total_semesters) || 8;
    const semesterDuration = Number(progData?.semester_duration) || 6;
    const semesterDurationUnit = progData?.semester_duration_unit || "months";

    const progression = AcademicProgressionEngine.calculateProgression({
      admissionDate: academic?.admission_date || "",
      courseConfig: {
        programName: progData?.program_name || academic?.program_code || "General Studies",
        programCode: progData?.program_code || academic?.program_code || "",
        totalSemesters,
        semesterDuration,
        semesterDurationUnit
      },
      adjustments
    });

    const studentProfile: StudentDetailProfile = {
      id: record.id,
      fullName: personal?.full_name || "Unknown Student",
      email: contact?.email || "",
      phoneHome: contact?.phone_home || "",
      phoneLocal: contact?.phone_local || "",
      permanentAddress: contact?.permanent_address || "",
      localAddress: contact?.local_address || "",
      currentSemester: progression.currentSemester,
      academicStatus: academic?.academic_status || "good_standing",
      status: record.status || "active",
      registrationNumber: record.registration_number,
      nationalityCode: personal?.nationality_code || "IND",
      nationalityName: countryObj?.name || personal?.nationality_code || "India",
      programName: progData?.program_name || academic?.program_code || "General Studies",
      programCode: academic?.program_code || "",
      school: progData?.school_name || "Academic Department",
      admissionDate: academic?.admission_date || "",
      expectedGraduation: progression.expectedGraduationDateISO || academic?.expected_graduation || "",
      totalSemesters: progression.totalSemesters,
      semesterDuration: progression.details.semesterDuration,
      semesterDurationUnit: progression.details.semesterDurationUnit,
      academicStage: progression.stage,
      academicStageLabel: progression.stageLabel,
      isCompleted: progression.isCompleted,
      isFinalSemester: progression.isFinalSemester,
      academicAdjustments: adjustments,
      complianceStatus: (() => {
        const raw = (snapshot?.compliance_status || "").toUpperCase();
        if (raw === "WARNING" || raw === "PENDING_VERIFICATION") return "warning";
        if (raw === "EXPIRED") return "expired";
        if (raw === "MISSING" || raw === "REJECTED" || raw === "NOT_UPLOADED") return "non_compliant";
        return "compliant";
      })(),
      passport: {
        number: activePassport?.document_number || snapshot?.passport_number || "Not provided",
        issueDate: activePassport?.issue_date || snapshot?.passport_issue_date || "",
        expiryDate: activePassport?.expiry_date || snapshot?.passport_expiry || "",
        placeOfIssue: activePassport?.place_of_issue || snapshot?.passport_place_of_issue || "",
        versionNumber: isPassportUploaded ? (activePassport?.version_number ?? 1) : null,
        verificationStatus: isPassportUploaded ? (activePassport?.verification_status || "pending") : "not_uploaded",
        hasUploadedDocument: isPassportUploaded,
        uploadedAt: isPassportUploaded ? (activePassport?.created_at || null) : null,
        verifiedAt: isPassportUploaded ? (activePassport?.verified_at || null) : null,
        verifiedBy: isPassportUploaded ? (activePassport?.verified_by || null) : null,
        rejectionReason: isPassportUploaded ? (activePassport?.rejection_reason || null) : null,
        notes: isPassportUploaded ? (activePassport?.notes || null) : null,
        filePath: isPassportUploaded ? (activePassport?.file_path || null) : null,
        activeEarlyAuthorization: activePassportAuth ? {
          id: activePassportAuth.id,
          reason: activePassportAuth.reason,
          reasonDetails: activePassportAuth.reason_details,
          validFrom: activePassportAuth.valid_from,
          validUntil: activePassportAuth.valid_until,
          status: activePassportAuth.status,
          createdAt: activePassportAuth.created_at
        } : null
      },
      visa: {
        number: activeVisa?.document_number || snapshot?.visa_number || "Not provided",
        issueDate: activeVisa?.issue_date || snapshot?.visa_issue_date || "",
        expiryDate: activeVisa?.expiry_date || snapshot?.visa_expiry || "",
        visaType: activeVisa?.visa_type || snapshot?.visa_type || "Student (S-1)",
        versionNumber: isVisaUploaded ? (activeVisa?.version_number ?? 1) : null,
        verificationStatus: isVisaUploaded ? (activeVisa?.verification_status || "pending") : "not_uploaded",
        hasUploadedDocument: isVisaUploaded,
        uploadedAt: isVisaUploaded ? (activeVisa?.created_at || null) : null,
        verifiedAt: isVisaUploaded ? (activeVisa?.verified_at || null) : null,
        verifiedBy: isVisaUploaded ? (activeVisa?.verified_by || null) : null,
        rejectionReason: isVisaUploaded ? (activeVisa?.rejection_reason || null) : null,
        notes: isVisaUploaded ? (activeVisa?.notes || null) : null,
        filePath: isVisaUploaded ? (activeVisa?.file_path || null) : null,
        activeEarlyAuthorization: activeVisaAuth ? {
          id: activeVisaAuth.id,
          reason: activeVisaAuth.reason,
          reasonDetails: activeVisaAuth.reason_details,
          validFrom: activeVisaAuth.valid_from,
          validUntil: activeVisaAuth.valid_until,
          status: activeVisaAuth.status,
          createdAt: activeVisaAuth.created_at
        } : null
      },
      efrro: {
        number: activeEfrro?.document_number || snapshot?.efrro_number || "Not provided",
        issueDate: activeEfrro?.issue_date || snapshot?.efrro_issue_date || "",
        expiryDate: activeEfrro?.expiry_date || snapshot?.efrro_expiry || "",
        versionNumber: isEfrroUploaded ? (activeEfrro?.version_number ?? 1) : null,
        verificationStatus: isEfrroUploaded ? (activeEfrro?.verification_status || "pending") : "not_uploaded",
        hasUploadedDocument: isEfrroUploaded,
        uploadedAt: isEfrroUploaded ? (activeEfrro?.created_at || null) : null,
        verifiedAt: isEfrroUploaded ? (activeEfrro?.verified_at || null) : null,
        verifiedBy: isEfrroUploaded ? (activeEfrro?.verified_by || null) : null,
        rejectionReason: isEfrroUploaded ? (activeEfrro?.rejection_reason || null) : null,
        notes: isEfrroUploaded ? (activeEfrro?.notes || null) : null,
        filePath: isEfrroUploaded ? (activeEfrro?.file_path || null) : null,
        activeEarlyAuthorization: activeEfrroAuth ? {
          id: activeEfrroAuth.id,
          reason: activeEfrroAuth.reason,
          reasonDetails: activeEfrroAuth.reason_details,
          validFrom: activeEfrroAuth.valid_from,
          validUntil: activeEfrroAuth.valid_until,
          status: activeEfrroAuth.status,
          createdAt: activeEfrroAuth.created_at
        } : null
      },
      emergencyContact: {
        name: primaryContact.name || "Not Specified",
        relationship: primaryContact.relationship_type || "parent",
        phone: primaryContact.phone || "Not Specified",
        email: primaryContact.email || ""
      },
      embassy: {
        name: embassy.embassy_name || "Not Specified",
        phone: embassy.phone || "",
        email: embassy.email || "",
        address: embassy.address || "Not Specified",
        city: embassy.city || "",
        country: embassy.country || "",
        website: embassy.website || "",
        contactPerson: embassy.contact_person || ""
      }
    };

    return {
      success: true,
      student: studentProfile
    };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "getStudentDetailsAction", route: `/students/${studentId}` });
    return {
      success: false,
      error: sanitized.message
    };
  }
}

/**
 * Server Action: Update student profile
 */
export async function updateStudentAction(
  studentId: string, 
  updates: UpdateStudentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to update student profile."
      };
    }

    await studentService.updateStudent(studentId, updates, user.id);

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "updateStudentAction", route: `/students/${studentId}` });
    return {
      success: false,
      error: sanitized.message
    };
  }
}

/**
 * Server Action: Soft delete / archive student profile
 */
export async function archiveStudentAction(studentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to archive student profile."
      };
    }

    const archived = await studentService.archiveStudent(studentId, user.id);
    if (!archived) {
      return { success: false, error: "Failed to archive student record." };
    }

    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "archiveStudentAction", route: `/students/${studentId}` });
    return {
      success: false,
      error: sanitized.message
    };
  }
}

/**
 * Server Action: Fetch compliance document versions for a student (passport, visa, or eFRRO)
 */
export async function getDocumentVersionsAction(
  studentId: string,
  documentType: "passport" | "visa" | "efrro"
): Promise<{
  success: boolean;
  versions: DocumentVersionItem[];
  status: string;
  metadata?: {
    documentNumber?: string | null;
    issueDate?: string | null;
    expiryDate?: string | null;
    placeOfIssue?: string | null;
    visaType?: string | null;
  };
  error?: string;
}> {
  try {
    const adminSupabase = getAdminSupabase();
    const tableName = documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    const { data: rows, error } = await adminSupabase
      .from(tableName)
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`[GET_DOC_VERSIONS_ERROR] ${tableName}:`, error);
      return { success: false, versions: [], status: "NOT_UPLOADED", error: error.message };
    }

    // Filter out rows without genuine physical uploaded file paths
    const typedRows: VersionDatabaseRow[] = (rows || []).filter((row: VersionDatabaseRow) => {
      if (!row.file_path) return false;
      const fp = row.file_path.trim().toLowerCase();
      return fp !== "" && fp !== "pending_upload" && fp !== "null";
    });

    if (typedRows.length === 0) {
      // Fetch metadata from student_snapshot to support metadata-only records
      const { data: snapshot } = await adminSupabase
        .from("student_snapshot")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      const docNum = documentType === "passport" ? snapshot?.passport_number :
        documentType === "visa" ? snapshot?.visa_number : snapshot?.efrro_number;
      const docExpiry = documentType === "passport" ? snapshot?.passport_expiry :
        documentType === "visa" ? snapshot?.visa_expiry : snapshot?.efrro_expiry;
      const docIssue = documentType === "passport" ? snapshot?.passport_issue_date :
        documentType === "visa" ? snapshot?.visa_issue_date : snapshot?.efrro_issue_date;
      const docPlace = documentType === "passport" ? snapshot?.passport_place_of_issue : null;
      const docVisaType = documentType === "visa" ? snapshot?.visa_type : null;

      const hasMetadata = Boolean(
        (docNum && docNum !== "Not provided" && docNum !== "Not Recorded" && docNum !== "Pending") || 
        docExpiry || 
        docIssue
      );

      return {
        success: true,
        versions: [],
        status: hasMetadata ? "METADATA_ONLY" : "NOT_UPLOADED",
        metadata: hasMetadata ? {
          documentNumber: docNum || null,
          issueDate: docIssue || null,
          expiryDate: docExpiry || null,
          placeOfIssue: docPlace || null,
          visaType: docVisaType || null
        } : undefined
      };
    }

    const versions: DocumentVersionItem[] = typedRows.map((row: VersionDatabaseRow, index: number) => ({
      id: row.id,
      versionNumber: row.version_number || (typedRows.length - index),
      isActive: Boolean(row.is_active),
      documentNumber: row.document_number,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      placeOfIssue: row.place_of_issue || null,
      visaType: row.visa_type || null,
      verificationStatus: row.verification_status || "pending",
      verifiedBy: row.verified_by || null,
      verifiedAt: row.verified_at || null,
      rejectionReason: row.rejection_reason || null,
      notes: row.notes || null,
      uploadedAt: row.created_at,
      filePath: row.file_path || null
    }));

    // Derive compliance status
    let status = "NOT_UPLOADED";
    const activeDoc = versions.find(v => v.isActive) || versions[0];
    if (activeDoc) {
      if (activeDoc.verificationStatus === "rejected") {
        status = "REJECTED";
      } else if (activeDoc.verificationStatus === "pending") {
        status = "PENDING_VERIFICATION";
      } else if (activeDoc.verificationStatus === "verified") {
        const exp = new Date(activeDoc.expiryDate).getTime();
        const now = Date.now();
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
          status = "EXPIRED";
        } else if (diffDays <= 30) {
          status = "EXPIRING_SOON";
        } else {
          status = "VERIFIED";
        }
      }
    }

    return {
      success: true,
      versions,
      status
    };
  } catch (err: unknown) {
    return {
      success: false,
      versions: [],
      status: "NOT_UPLOADED",
      error: err instanceof Error ? err.message : "Failed to load document records."
    };
  }
}

/**
 * Server Action: Update verification status for a document version
 * 
 * Implements strict approval timing:
 * - When approved ('verified'): The target version (vN+1) becomes active (is_active: true),
 *   while all previous versions (v1..vN) become historical (is_active: false).
 *   Snapshot is updated with the new verified document metadata and compliance schedules recalculate.
 * - When rejected ('rejected'): The target version becomes rejected (is_active: false).
 *   The previously active verified document (v1..vN) remains active and untouched.
 */
export async function updateDocumentVerificationAction(
  studentId: string,
  documentType: "passport" | "visa" | "efrro",
  versionId?: string | null,
  status: "verified" | "rejected" = "verified",
  rejectionReason?: string,
  notes?: string,
  metadata?: {
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    placeOfIssue?: string;
    visaType?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to perform document verification."
      };
    }

    const { isInternalUser } = await import("@/lib/auth/permissions");
    if (!isInternalUser(user)) {
      return { success: false, error: "Forbidden: You do not have permission to verify documents." };
    }

    const adminSupabase = getAdminSupabase();
    const tableName = documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    // 1. Resolve targeted version
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const { data: pendingVer } = await adminSupabase
        .from(tableName)
        .select("id")
        .eq("student_id", studentId)
        .eq("verification_status", "pending")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      targetVersionId = pendingVer?.id;
    }

    if (!targetVersionId) {
      const { data: activeVer } = await adminSupabase
        .from(tableName)
        .select("id")
        .eq("student_id", studentId)
        .eq("is_active", true)
        .maybeSingle();
      targetVersionId = activeVer?.id;
    }

    const updatePayload: Record<string, unknown> = {
      verification_status: status,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: notes || null
    };

    if (metadata) {
      if (metadata.documentNumber?.trim()) updatePayload.document_number = metadata.documentNumber.trim();
      if (metadata.issueDate?.trim()) updatePayload.issue_date = metadata.issueDate.trim().split("T")[0];
      if (metadata.expiryDate?.trim()) updatePayload.expiry_date = metadata.expiryDate.trim().split("T")[0];
      if (documentType === "passport" && metadata.placeOfIssue?.trim()) {
        updatePayload.place_of_issue = metadata.placeOfIssue.trim();
      }
      if (documentType === "visa" && metadata.visaType?.trim()) {
        updatePayload.visa_type = metadata.visaType.trim();
      }
    }

    if (status === "verified") {
      updatePayload.is_active = true;
      updatePayload.rejection_reason = null;

      if (targetVersionId) {
        // Activate target approved version
        const { error: appErr } = await adminSupabase
          .from(tableName)
          .update(updatePayload)
          .eq("id", targetVersionId);

        if (appErr) return { success: false, error: appErr.message };

        // Deactivate all previous versions
        await adminSupabase
          .from(tableName)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("student_id", studentId)
          .neq("id", targetVersionId);
      } else {
        await adminSupabase
          .from(tableName)
          .update(updatePayload)
          .eq("student_id", studentId)
          .eq("is_active", true);
      }

      // Fetch approved version data to update student_snapshot
      const { data: approvedDoc } = await adminSupabase
        .from(tableName)
        .select("*")
        .eq("id", targetVersionId)
        .single();

      const docExpiry = (approvedDoc?.expiry_date || metadata?.expiryDate)?.split("T")[0];
      const docIssue = (approvedDoc?.issue_date || metadata?.issueDate)?.split("T")[0];
      const docNum = approvedDoc?.document_number || metadata?.documentNumber;

      const now = new Date();
      const expDateObj = docExpiry ? new Date(docExpiry) : null;
      const diffDays = expDateObj ? Math.round((expDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const calculatedDocStatus = diffDays !== null ? (diffDays < 0 ? "EXPIRED" : diffDays <= 30 ? "WARNING" : "COMPLIANT") : "COMPLIANT";

      const snapshotUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (documentType === "passport") {
        if (docNum) snapshotUpdates.passport_number = docNum;
        if (docIssue) snapshotUpdates.passport_issue_date = docIssue;
        if (docExpiry) snapshotUpdates.passport_expiry = docExpiry;
        if (approvedDoc?.place_of_issue) snapshotUpdates.passport_place_of_issue = approvedDoc.place_of_issue;
        snapshotUpdates.passport_status = calculatedDocStatus;
      } else if (documentType === "visa") {
        if (docNum) snapshotUpdates.visa_number = docNum;
        if (docIssue) snapshotUpdates.visa_issue_date = docIssue;
        if (docExpiry) snapshotUpdates.visa_expiry = docExpiry;
        if (approvedDoc?.visa_type) snapshotUpdates.visa_type = approvedDoc.visa_type;
        snapshotUpdates.visa_status = calculatedDocStatus;
      } else {
        if (docNum) snapshotUpdates.efrro_number = docNum;
        if (docIssue) snapshotUpdates.efrro_issue_date = docIssue;
        if (docExpiry) snapshotUpdates.efrro_expiry = docExpiry;
        snapshotUpdates.efrro_status = calculatedDocStatus;
        if (diffDays !== null) snapshotUpdates.days_until_efrro_expiry = diffDays;
      }

      await adminSupabase
        .from("student_snapshot")
        .update(snapshotUpdates)
        .eq("student_id", studentId);

      // Invalidate obsolete reminders & recalculate for new active expiry
      if (docExpiry) {
        await adminSupabase
          .from("notifications")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("student_id", studentId)
          .eq("document_type", documentType)
          .in("status", ["queued", "sending", "processing"]);

        const { ExpiryReminderEngine } = await import("@/domain/notifications/services/reminder-engine.service");
        await ExpiryReminderEngine.evaluateAndQueueStudentDueReminders(studentId);
      }

      // Automatically consume/close any active early upload authorization for this document type
      const { DocumentUploadEligibilityEngine } = await import("@/domain/compliance/services/upload-eligibility.service");
      await DocumentUploadEligibilityEngine.consumeActiveAuthorization(studentId, documentType, targetVersionId).catch(() => null);

      // Audit log
      await adminSupabase.from("audit_log").insert({
        actor_id: user.id,
        action: "DOCUMENT_RENEWAL_APPROVED",
        resource: `${tableName}/${targetVersionId || "active"}`,
        filters_applied: { studentId, documentType, versionId: targetVersionId, status: "verified", notes }
      });
    } else {
      // Rejection: Target version is marked rejected and remains inactive
      updatePayload.is_active = false;
      updatePayload.rejection_reason = rejectionReason || "Document rejected by administrator";

      if (targetVersionId) {
        await adminSupabase
          .from(tableName)
          .update(updatePayload)
          .eq("id", targetVersionId);
      }

      // Audit log
      await adminSupabase.from("audit_log").insert({
        actor_id: user.id,
        action: "DOCUMENT_RENEWAL_REJECTED",
        resource: `${tableName}/${targetVersionId || "unknown"}`,
        filters_applied: { studentId, documentType, versionId: targetVersionId, status: "rejected", rejectionReason }
      });
    }

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/${documentType}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "updateDocumentVerificationAction", route: `/students/${studentId}/${documentType}` });
    return {
      success: false,
      error: sanitized.message
    };
  }
}

/**
 * Server Action: Upload New / Renewed Document File (Genuine Version N+1 Creation)
 *
 * Implements the strict document lifecycle:
 * Upload -> Pending Verification -> Staff Approval -> Active Version
 *
 * 1. Validates physical file (PDF / PNG / JPEG <= 5MB)
 * 2. Saves file buffer to immutable storage: students/${studentId}/${type}/v${nextVersion}/${fileName}
 * 3. Creates next version (vN+1) with verification_status: 'pending' and is_active: false
 * 4. Preserves previous active version as active until approval
 * 5. Logs DOCUMENT_VERSION_UPLOADED audit trail
 */
export async function uploadDocumentRenewalAction(
  formData: FormData
): Promise<{ success: boolean; versionNumber?: number; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to upload document." };
    }

    const { isInternalUser } = await import("@/lib/auth/permissions");
    if (!isInternalUser(user)) {
      return { success: false, error: "Forbidden: Only authorized staff may upload renewed document records." };
    }

    const studentId = formData.get("studentId") as string;
    const documentType = formData.get("documentType") as "passport" | "visa" | "efrro";
    const documentNumber = formData.get("documentNumber") as string;
    const issueDate = formData.get("issueDate") as string;
    const expiryDate = formData.get("expiryDate") as string;
    const placeOfIssue = (formData.get("placeOfIssue") as string) || null;
    const visaType = (formData.get("visaType") as string) || "Student (S-1)";
    const notes = (formData.get("notes") as string) || "New document renewal upload";
    const file = formData.get("file") as File | null;

    if (!studentId || !documentType) {
      return { success: false, error: "Student ID and document type are required." };
    }

    if (!documentNumber || !documentNumber.trim()) {
      return { success: false, error: "Document number is required." };
    }

    if (!issueDate || !issueDate.trim()) {
      return { success: false, error: "Issue date is required." };
    }

    if (!expiryDate || !expiryDate.trim()) {
      return { success: false, error: "Expiration date is required." };
    }

    if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
      return { success: false, error: "A valid physical document file (PDF or Image) is required for version renewal." };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 5MB limit." };
    }

    const cleanDocNum = documentNumber.trim();
    const cleanIssue = issueDate.trim().split("T")[0];
    const cleanExpiry = expiryDate.trim().split("T")[0];
    const issueD = new Date(cleanIssue);
    const expiryD = new Date(cleanExpiry);

    if (isNaN(issueD.getTime()) || isNaN(expiryD.getTime())) {
      return { success: false, error: "Invalid date format. Please use YYYY-MM-DD." };
    }

    if (expiryD <= issueD) {
      return { success: false, error: `The new expiration date (${cleanExpiry}) must be strictly after the document issue date (${cleanIssue}).` };
    }

    const adminSupabase = getAdminSupabase();
    const tableName = documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    // Fetch existing genuine uploaded versions to resolve next version number
    const { data: currentVersions, error: fetchErr } = await adminSupabase
      .from(tableName)
      .select("version_number, file_path")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("version_number", { ascending: false });

    if (fetchErr) {
      return { success: false, error: `Failed to query existing versions: ${fetchErr.message}` };
    }

    // Filter to only genuine uploaded versions
    const validUploadedVersions = (currentVersions || []).filter(v => {
      if (!v.file_path) return false;
      const fp = v.file_path.trim().toLowerCase();
      return fp !== "" && fp !== "pending_upload" && fp !== "null";
    });

    const highestVersionNum = validUploadedVersions.length > 0
      ? Math.max(...validUploadedVersions.map(v => v.version_number || 0))
      : 0;
    const nextVersionNumber = highestVersionNum + 1;

    // Upload to storage provider with immutable version path
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `students/${studentId}/${documentType}/v${nextVersionNumber}/${Date.now()}_${safeFileName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    try {
      const storage = StorageProviderFactory.getProvider();
      await storage.upload("student-documents", storagePath, fileBuffer, file.type || "application/pdf");
    } catch (uploadErr: unknown) {
      console.error("[STORAGE_UPLOAD_ERROR]", uploadErr);
      return { success: false, error: `Failed to upload document file to storage: ${uploadErr instanceof Error ? uploadErr.message : "Storage error"}` };
    }

    // Insert new version with verification_status: 'pending' and is_active: false
    const insertPayload: Record<string, unknown> = {
      student_id: studentId,
      version_number: nextVersionNumber,
      is_active: false, // CRITICAL: remains inactive until approved!
      document_number: cleanDocNum,
      issue_date: cleanIssue,
      expiry_date: cleanExpiry,
      file_path: storagePath,
      verification_status: "pending",
      notes: notes.trim(),
      created_by: user.id,
      updated_by: user.id
    };

    if (documentType === "passport") {
      insertPayload.place_of_issue = placeOfIssue?.trim() || null;
    } else if (documentType === "visa") {
      insertPayload.visa_type = visaType?.trim() || "Student (S-1)";
    }

    const { data: newVer, error: insertErr } = await adminSupabase
      .from(tableName)
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr || !newVer) {
      if (insertErr?.code === "23514" || insertErr?.message?.includes("chk_")) {
        return { success: false, error: "The new expiration date must be strictly after the document issue date." };
      }
      return { success: false, error: `Database insert failed: ${insertErr?.message}` };
    }

    // Audit log
    await adminSupabase.from("audit_log").insert({
      actor_id: user.id,
      action: "DOCUMENT_VERSION_UPLOADED",
      resource: `${tableName}/${newVer.id}`,
      filters_applied: {
        studentId,
        documentType,
        versionNumber: nextVersionNumber,
        storagePath,
        documentNumber: cleanDocNum,
        issueDate: cleanIssue,
        expiryDate: cleanExpiry,
        fileName: file.name,
        uploadedBy: user.email || user.id,
        timestamp: new Date().toISOString()
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/${documentType}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { success: true, versionNumber: nextVersionNumber };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "uploadDocumentRenewalAction" });
    return { success: false, error: sanitized.message };
  }
}

export interface CorrectDocumentMetadataInput {
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  visaType?: string;
  reason: string;
}

/**
 * Server Action: Correct Existing Document Information (Metadata Correction)
 *
 * Used when staff entered incorrect metadata for the existing physical document.
 * Modifies the active version in-place without creating a new version or pretending
 * it is a newly issued document.
 */
export async function correctDocumentMetadataAction(
  input: CorrectDocumentMetadataInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to correct document information." };
    }

    const { isInternalUser } = await import("@/lib/auth/permissions");
    if (!isInternalUser(user)) {
      return { success: false, error: "Forbidden: You do not have permission to correct document metadata." };
    }

    const { studentId, documentType, documentNumber, issueDate, expiryDate, placeOfIssue, visaType, reason } = input;

    if (!reason || !reason.trim()) {
      return { success: false, error: "A mandatory reason for correction is required for compliance audit trails." };
    }
    if (!documentNumber || !documentNumber.trim()) {
      return { success: false, error: "Document number is required." };
    }
    if (!issueDate || !issueDate.trim()) {
      return { success: false, error: "Issue date is required." };
    }
    if (!expiryDate || !expiryDate.trim()) {
      return { success: false, error: "Expiration date is required." };
    }

    const cleanDocNum = documentNumber.trim();
    const cleanIssue = issueDate.trim().split("T")[0];
    const cleanExpiry = expiryDate.trim().split("T")[0];
    const cleanPlace = placeOfIssue?.trim() || null;
    const cleanVisaType = visaType?.trim() || "Student (S-1)";
    const cleanReason = reason.trim();

    const issueD = new Date(cleanIssue);
    const expiryD = new Date(cleanExpiry);

    if (isNaN(issueD.getTime()) || isNaN(expiryD.getTime())) {
      return { success: false, error: "Invalid date format provided. Use YYYY-MM-DD." };
    }

    if (expiryD <= issueD) {
      return { success: false, error: `The expiration date must be strictly after the document issue date (${cleanIssue}).` };
    }

    const adminSupabase = getAdminSupabase();
    const tableName = documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    // 1. Fetch current active version and snapshot
    const [{ data: activeVersion }, { data: currentSnapshot }] = await Promise.all([
      adminSupabase
        .from(tableName)
        .select("*")
        .eq("student_id", studentId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      adminSupabase
        .from("student_snapshot")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle()
    ]);

    const previousValues = {
      documentNumber: activeVersion?.document_number || (
        documentType === "passport" ? currentSnapshot?.passport_number :
        documentType === "visa" ? currentSnapshot?.visa_number : currentSnapshot?.efrro_number
      ) || null,
      issueDate: activeVersion?.issue_date || (
        documentType === "passport" ? currentSnapshot?.passport_issue_date :
        documentType === "visa" ? currentSnapshot?.visa_issue_date : currentSnapshot?.efrro_issue_date
      ) || null,
      expiryDate: activeVersion?.expiry_date || (
        documentType === "passport" ? currentSnapshot?.passport_expiry :
        documentType === "visa" ? currentSnapshot?.visa_expiry : currentSnapshot?.efrro_expiry
      ) || null,
      placeOfIssue: activeVersion?.place_of_issue || currentSnapshot?.passport_place_of_issue || null,
      visaType: activeVersion?.visa_type || currentSnapshot?.visa_type || null,
      versionNumber: activeVersion?.version_number || 1
    };

    // 2. Update existing active version in-place
    if (activeVersion) {
      const updatePayload: Record<string, unknown> = {
        document_number: cleanDocNum,
        issue_date: cleanIssue,
        expiry_date: cleanExpiry,
        notes: `Correction: ${cleanReason}`,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      };
      if (documentType === "passport") {
        updatePayload.place_of_issue = cleanPlace;
      } else if (documentType === "visa") {
        updatePayload.visa_type = cleanVisaType;
      }

      const { error: updateVerErr } = await adminSupabase
        .from(tableName)
        .update(updatePayload)
        .eq("id", activeVersion.id);

      if (updateVerErr) {
        if (updateVerErr.code === "23514" || updateVerErr.message?.includes("chk_")) {
          return { success: false, error: "The expiration date must be strictly after the document issue date." };
        }
        return { success: false, error: `Failed to update document record: ${updateVerErr.message}` };
      }
    }

    // 3. Update student_snapshot
    const now = new Date();
    const expDateObj = new Date(cleanExpiry);
    const diffDays = Math.round((expDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const calculatedDocStatus = diffDays < 0 ? "EXPIRED" : diffDays <= 30 ? "WARNING" : "COMPLIANT";

    const snapshotUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (documentType === "passport") {
      snapshotUpdates.passport_number = cleanDocNum;
      snapshotUpdates.passport_issue_date = cleanIssue;
      snapshotUpdates.passport_expiry = cleanExpiry;
      snapshotUpdates.passport_place_of_issue = cleanPlace;
      snapshotUpdates.passport_status = calculatedDocStatus;
    } else if (documentType === "visa") {
      snapshotUpdates.visa_number = cleanDocNum;
      snapshotUpdates.visa_issue_date = cleanIssue;
      snapshotUpdates.visa_expiry = cleanExpiry;
      snapshotUpdates.visa_type = cleanVisaType;
      snapshotUpdates.visa_status = calculatedDocStatus;
    } else {
      snapshotUpdates.efrro_number = cleanDocNum;
      snapshotUpdates.efrro_issue_date = cleanIssue;
      snapshotUpdates.efrro_expiry = cleanExpiry;
      snapshotUpdates.efrro_status = calculatedDocStatus;
      snapshotUpdates.days_until_efrro_expiry = diffDays;
    }

    const passStatus = documentType === "passport" ? calculatedDocStatus : (currentSnapshot?.passport_status || "MISSING");
    const visaStatus = documentType === "visa" ? calculatedDocStatus : (currentSnapshot?.visa_status || "MISSING");
    const efrroStatus = documentType === "efrro" ? calculatedDocStatus : (currentSnapshot?.efrro_status || "COMPLIANT");

    let overallCompliance = "COMPLIANT";
    if (passStatus === "EXPIRED" || visaStatus === "EXPIRED" || efrroStatus === "EXPIRED") {
      overallCompliance = "EXPIRED";
    } else if (passStatus === "WARNING" || visaStatus === "WARNING" || efrroStatus === "WARNING" || passStatus === "PENDING_VERIFICATION" || visaStatus === "PENDING_VERIFICATION") {
      overallCompliance = "WARNING";
    } else if (passStatus === "REJECTED" || visaStatus === "REJECTED" || passStatus === "MISSING" || visaStatus === "MISSING") {
      overallCompliance = "MISSING";
    }
    snapshotUpdates.compliance_status = overallCompliance;

    await adminSupabase
      .from("student_snapshot")
      .update(snapshotUpdates)
      .eq("student_id", studentId);

    // 4. Invalidate obsolete notifications & recalculate reminders if expiry changed
    if (previousValues.expiryDate && previousValues.expiryDate !== cleanExpiry) {
      await adminSupabase
        .from("notifications")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("student_id", studentId)
        .eq("document_type", documentType)
        .in("status", ["queued", "sending", "processing"]);
    }

    const { ExpiryReminderEngine } = await import("@/domain/notifications/services/reminder-engine.service");
    await ExpiryReminderEngine.evaluateAndQueueStudentDueReminders(studentId);

    // 5. Audit log
    await adminSupabase.from("audit_log").insert({
      actor_id: user.id,
      action: "DOCUMENT_METADATA_CORRECTED",
      resource: `${tableName}/${activeVersion?.id || "snapshot"}`,
      filters_applied: {
        studentId,
        documentType,
        versionNumber: previousValues.versionNumber,
        previousValues,
        correctedValues: {
          documentNumber: cleanDocNum,
          issueDate: cleanIssue,
          expiryDate: cleanExpiry,
          placeOfIssue: cleanPlace,
          visaType: cleanVisaType,
          reason: cleanReason
        },
        correctedBy: user.email || user.id,
        timestamp: new Date().toISOString()
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/${documentType}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "correctDocumentMetadataAction", route: `/students/${input.studentId}` });
    return { success: false, error: sanitized.message };
  }
}

export interface UpdateDocumentMetadataInput {
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  visaType?: string;
  changeReason?: string;
}

/**
 * Server Action: Update Document Metadata (Alias for Metadata Correction)
 */
export async function updateDocumentMetadataAction(
  input: UpdateDocumentMetadataInput
): Promise<{ success: boolean; error?: string }> {
  return correctDocumentMetadataAction({
    ...input,
    reason: input.changeReason || "Administrative metadata correction"
  });
}

export interface UpdateExpiryDateInput {
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  newExpiryDate: string;
  issueDate?: string;
  reason: string;
}

/**
 * Server Action: Expiry Date Metadata Correction
 * 
 * Performs an in-place metadata correction of the active document expiry date without
 * falsely creating a new version record.
 */
export async function updateExpiryDateAction(
  input: UpdateExpiryDateInput
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = getAdminSupabase();
  const tableName = input.documentType === "passport" 
    ? "passport_versions" 
    : input.documentType === "visa" 
    ? "visa_versions" 
    : "efrro_versions";

  const [{ data: activeVersion }, { data: snapshot }] = await Promise.all([
    adminSupabase
      .from(tableName)
      .select("*")
      .eq("student_id", input.studentId)
      .eq("is_active", true)
      .maybeSingle(),
    adminSupabase
      .from("student_snapshot")
      .select("*")
      .eq("student_id", input.studentId)
      .maybeSingle()
  ]);

  const docNumber = activeVersion?.document_number || (
    input.documentType === "passport" ? snapshot?.passport_number :
    input.documentType === "visa" ? snapshot?.visa_number : snapshot?.efrro_number
  ) || "Not Recorded";

  const rawIssue = input.issueDate?.trim() || activeVersion?.issue_date || (
    input.documentType === "passport" ? snapshot?.passport_issue_date :
    input.documentType === "visa" ? snapshot?.visa_issue_date : snapshot?.efrro_issue_date
  );

  if (!rawIssue) {
    return {
      success: false,
      error: "This document does not have an issue date recorded. Please provide the issue date before updating the expiration date."
    };
  }

  return correctDocumentMetadataAction({
    studentId: input.studentId,
    documentType: input.documentType,
    documentNumber: docNumber,
    issueDate: String(rawIssue).split("T")[0],
    expiryDate: input.newExpiryDate,
    placeOfIssue: activeVersion?.place_of_issue || snapshot?.passport_place_of_issue || undefined,
    visaType: activeVersion?.visa_type || snapshot?.visa_type || undefined,
    reason: input.reason
  });
}

/**
 * Server Action: Get calculated expiry-driven reminder schedule for student
 */
export async function getStudentReminderScheduleAction(studentId: string): Promise<{
  success: boolean;
  schedule?: import("@/domain/notifications/types/reminder.types").StudentReminderScheduleResponse;
  error?: string;
}> {
  try {
    const adminSupabase = getAdminSupabase();

    const { data: student, error: sErr } = await adminSupabase
      .from("students")
      .select(`
        id,
        email,
        phone,
        student_personal(full_name),
        student_snapshot(passport_expiry, visa_expiry, efrro_expiry, passport_number, visa_number, efrro_number),
        passport_versions(id, is_active, document_number, expiry_date, verification_status, file_path, deleted_at),
        visa_versions(id, is_active, document_number, expiry_date, verification_status, file_path, deleted_at),
        efrro_versions(id, is_active, document_number, expiry_date, verification_status, file_path, deleted_at)
      `)
      .eq("id", studentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (sErr || !student) {
      return { success: false, error: "Student not found." };
    }

    const { data: notifData } = await adminSupabase
      .from("notifications")
      .select("id, student_id, document_type, status, channel, scheduled_for, idempotency_key, notification_context, created_at, updated_at, notification_delivery_log(id, status, error_message, created_at)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    const notifications = (notifData || []) as unknown as import("@/domain/notifications/services/reminder-engine.service").RawNotificationRecord[];

    const hasValidFile = (fp?: string | null) => Boolean(fp && fp.trim() !== "" && fp !== "pending_upload" && fp !== "null");

    const activeEfrro = (student.efrro_versions || []).find((e: { is_active?: boolean; deleted_at?: string | null; file_path?: string | null }) => e.is_active && !e.deleted_at);
    const isEfrroUp = hasValidFile(activeEfrro?.file_path);

    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;

    const { ExpiryReminderEngine } = await import("@/domain/notifications/services/reminder-engine.service");

    const calculatedSchedule = ExpiryReminderEngine.calculateStudentReminders({
      studentId,
      efrro: {
        number: isEfrroUp ? (activeEfrro?.document_number || snapshot?.efrro_number || "") : (snapshot?.efrro_number || ""),
        expiryDate: isEfrroUp ? (activeEfrro?.expiry_date || snapshot?.efrro_expiry) : (snapshot?.efrro_expiry || null),
        isUploaded: isEfrroUp,
        verificationStatus: isEfrroUp ? (activeEfrro?.verification_status || "pending") : "not_uploaded"
      },
      notifications
    });

    return {
      success: true,
      schedule: calculatedSchedule
    };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "getStudentReminderScheduleAction", route: `/students/${studentId}` });
    return {
      success: false,
      error: sanitized.message
    };
  }
}

/**
 * Server Action: Manually trigger eFRRO reminder dispatch for testing or immediate notification
 */
export async function triggerReminderDispatchAction(
  studentId: string,
  docType: "efrro" | "passport" | "visa",
  thresholdDays: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to trigger reminder dispatch." };
    }

    const adminSupabase = getAdminSupabase();

    const { data: student } = await adminSupabase
      .from("students")
      .select("id, email, phone, student_personal(full_name), student_snapshot(efrro_expiry)")
      .eq("id", studentId)
      .single();

    if (!student) {
      return { success: false, error: "Student not found." };
    }

    const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;
    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;

    const expiryDate = snapshot?.efrro_expiry;

    if (!expiryDate) {
      return { success: false, error: "Cannot dispatch reminder: No eFRRO expiry date recorded." };
    }

    const idempotencyKey = `${studentId}:efrro:${thresholdDays}:both:${expiryDate}`;
    const recipientAddress = student.email || student.phone || "compliance@university.edu";

    const { data: notif, error: notifErr } = await adminSupabase
      .from("notifications")
      .insert({
        student_id: studentId,
        document_type: "efrro",
        status: "sent",
        channel: "email",
        recipient_address: recipientAddress,
        scheduled_for: new Date().toISOString(),
        trigger_source: "manual_admin_dispatch",
        idempotency_key: idempotencyKey,
        notification_context: {
          student_name: personal?.full_name || "Student",
          document_type: "eFRRO / Residential Permit",
          days_left: String(thresholdDays),
          expiry_date: expiryDate,
          scheduled_date: new Date().toISOString(),
          dispatched_by: user.id
        }
      })
      .select()
      .single();

    if (notifErr) {
      if (notifErr.message.includes("unique") || notifErr.message.includes("duplicate")) {
        return { success: true };
      }
      return { success: false, error: notifErr.message };
    }

    if (notif) {
      await adminSupabase.from("notification_delivery_log").insert({
        notification_id: notif.id,
        attempt_number: 1,
        status: "sent",
        gateway_response: { provider: "smtp_gateway", delivered_at: new Date().toISOString() },
        error_message: null
      });
    }

    await adminSupabase.from("audit_log").insert({
      actor_id: user.id,
      action: "REMINDER_DISPATCHED",
      resource: `students/${studentId}/reminders/${docType}`,
      filters_applied: { studentId, docType, thresholdDays, idempotencyKey }
    });

    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "triggerReminderDispatchAction", route: `/students/${studentId}` });
    return {
      success: false,
      error: sanitized.message
    };
  }
}

/**
 * Server Action: Get pre-signed download URL for a specific document version file.
 */
export async function getDocumentDownloadUrlAction(
  filePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Authentication required to access document files." };
    }

    if (!filePath || filePath.trim() === "" || filePath === "pending_upload" || filePath === "null") {
      return { success: false, error: "No physical file is associated with this document record." };
    }

    const storage = StorageProviderFactory.getProvider();
    const signedUrl = await storage.generateSignedUrl("student-documents", filePath.trim(), 300);

    return { success: true, url: signedUrl };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "getDocumentDownloadUrlAction" });
    return { success: false, error: sanitized.message };
  }
}

/**
 * Server Action: Record an authorized academic adjustment (semester override, repeated semester, academic leave, etc.)
 */
export async function recordAcademicAdjustmentAction(
  studentId: string,
  input: {
    adjustmentType: "semester_override" | "semester_repeat" | "academic_leave" | "course_transfer" | "extension" | "admission_date_correction";
    effectiveDate: string;
    previousSemester?: number | null;
    adjustedSemester?: number | null;
    previousProgramCode?: string | null;
    newProgramCode?: string | null;
    reason: string;
    notes?: string | null;
  }
): Promise<{ success: boolean; currentSemester?: number; expectedGraduation?: string; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Authentication required to record academic adjustments." };
    }

    if (!input.reason || !input.reason.trim()) {
      return { success: false, error: "A mandatory institutional reason is required to record an academic adjustment." };
    }

    const res = await studentService.recordAcademicAdjustment(studentId, input, user.id);
    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students`);
    return res;
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "recordAcademicAdjustmentAction", route: `/students/${studentId}` });
    return { success: false, error: sanitized.message };
  }
}

/**
 * Server Action: Get all academic adjustments for a student
 */
export async function getAcademicAdjustmentsAction(
  studentId: string
): Promise<{ success: boolean; adjustments?: AcademicAdjustmentRecord[]; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Authentication required to view academic adjustments." };
    }

    const adjustments = await studentService.getAcademicAdjustments(studentId);
    return { success: true, adjustments };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "getAcademicAdjustmentsAction", route: `/students/${studentId}` });
    return { success: false, error: sanitized.message };
  }
}

// ── Early Document Upload Exceptions (Staff Authorizations) ─────────────────

export interface AuthorizeEarlyUploadInput {
  documentType: "passport" | "visa" | "efrro";
  reason: "document_lost" | "document_damaged" | "document_replaced" | "government_reissue" | "data_correction" | "other";
  reasonDetails: string;
  validFrom?: string;
  validUntil?: string;
}

export async function authorizeEarlyDocumentUploadAction(
  studentId: string,
  input: AuthorizeEarlyUploadInput
): Promise<{ success: boolean; authorizationId?: string; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to authorize early uploads." };
    }

    const { isInternalUser } = await import("@/lib/auth/permissions");
    if (!isInternalUser(user)) {
      return { success: false, error: "Forbidden: Only compliance officers and staff may authorize early document uploads." };
    }

    if (!input.reasonDetails || !input.reasonDetails.trim()) {
      return { success: false, error: "A detailed explanation/reason is mandatory for institutional audit compliance." };
    }

    const adminSupabase = getAdminSupabase();
    const now = new Date();
    const fromDate = input.validFrom ? new Date(input.validFrom) : now;
    const untilDate = input.validUntil ? new Date(input.validUntil) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (untilDate <= fromDate) {
      return { success: false, error: "Authorization expiration date must be strictly after the start date." };
    }

    // Revoke/supersede any existing active authorization for this student and document type
    await adminSupabase
      .from("student_document_upload_authorizations")
      .update({ status: "revoked", updated_at: now.toISOString() })
      .eq("student_id", studentId)
      .eq("document_type", input.documentType)
      .eq("status", "active");

    // Insert new authorization
    const { data: authRecord, error: insertError } = await adminSupabase
      .from("student_document_upload_authorizations")
      .insert({
        student_id: studentId,
        document_type: input.documentType,
        reason: input.reason,
        reason_details: input.reasonDetails.trim(),
        valid_from: fromDate.toISOString(),
        valid_until: untilDate.toISOString(),
        status: "active",
        authorized_by: user.id
      })
      .select("id")
      .single();

    if (insertError || !authRecord) {
      return { success: false, error: `Failed to create authorization: ${insertError?.message}` };
    }

    // Audit log
    await adminSupabase.from("audit_log").insert({
      actor_id: user.id,
      action: "EARLY_UPLOAD_AUTHORIZED",
      resource: `student_document_upload_authorizations/${authRecord.id}`,
      filters_applied: {
        studentId,
        documentType: input.documentType,
        reason: input.reason,
        reasonDetails: input.reasonDetails.trim(),
        validFrom: fromDate.toISOString(),
        validUntil: untilDate.toISOString(),
        authorizedBy: user.email || user.id
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/${input.documentType}`);
    revalidatePath("/students");

    return { success: true, authorizationId: authRecord.id };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "authorizeEarlyDocumentUploadAction", route: `/students/${studentId}` });
    return { success: false, error: sanitized.message };
  }
}

export async function getStudentUploadAuthorizationsAction(
  studentId: string
): Promise<{ success: boolean; authorizations?: import("@/domain/compliance/services/upload-eligibility.service").StudentUploadAuthorization[]; error?: string }> {
  try {
    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
      .from("student_document_upload_authorizations")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const authorizations = (data || []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      documentType: row.document_type as "passport" | "visa" | "efrro",
      reason: row.reason,
      reasonDetails: row.reason_details,
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      status: row.status,
      authorizedBy: row.authorized_by,
      consumedAt: row.consumed_at,
      consumedVersionId: row.consumed_version_id,
      createdAt: row.created_at
    }));

    return { success: true, authorizations };
  } catch (err: unknown) {
    const sanitized = sanitizeError(err, { action: "getStudentUploadAuthorizationsAction", route: `/students/${studentId}` });
    return { success: false, error: sanitized.message, authorizations: [] };
  }
}
