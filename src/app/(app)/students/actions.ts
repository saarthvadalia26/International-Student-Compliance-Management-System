"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { StudentService } from "@/services/student/student.service";
import { RegisterStudentInput, UpdateStudentInput, StudentFilterOptions } from "@/services/student/student.types";
import { z } from "zod";
import { getCountryByCode } from "@/utils/countries";
import { sanitizeError } from "@/lib/errors/error-sanitizer";

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
  verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected";
  hasUploadedDocument: boolean;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  filePath?: string | null;
  visaType?: string;
  issuePlace?: string;
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
    address: string;
  };
}

export interface DocumentVersionItem {
  id: string;
  versionNumber: number;
  isActive: boolean;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  verificationStatus: "pending" | "verified" | "rejected";
  rejectionReason: string | null;
  uploadedAt: string;
}

interface VersionDatabaseRow {
  id: string;
  version_number?: number;
  is_active?: boolean;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  file_path?: string | null;
  verification_status: "pending" | "verified" | "rejected";
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
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

    // Retrieve academic program metadata
    const { data: progData } = await adminSupabase
      .from("academic_programs")
      .select("program_name, school_name")
      .or(`program_code.eq.${academic?.program_code},program_name.eq.${academic?.program_code}`)
      .maybeSingle();

    const studentProfile: StudentDetailProfile = {
      id: record.id,
      fullName: personal?.full_name || "Unknown Student",
      email: contact?.email || "",
      phoneHome: contact?.phone_home || "",
      phoneLocal: contact?.phone_local || "",
      permanentAddress: contact?.permanent_address || "",
      localAddress: contact?.local_address || "",
      currentSemester: academic?.current_semester || 1,
      academicStatus: academic?.academic_status || "good_standing",
      status: record.status || "active",
      registrationNumber: record.registration_number,
      nationalityCode: personal?.nationality_code || "IND",
      nationalityName: countryObj?.name || personal?.nationality_code || "India",
      programName: progData?.program_name || academic?.program_code || "General Studies",
      programCode: academic?.program_code || "",
      school: progData?.school_name || "Academic Department",
      admissionDate: academic?.admission_date || "",
      expectedGraduation: academic?.expected_graduation || "",
      complianceStatus: (() => {
        const raw = (snapshot?.compliance_status || "").toUpperCase();
        if (raw === "WARNING" || raw === "PENDING_VERIFICATION") return "warning";
        if (raw === "EXPIRED") return "expired";
        if (raw === "MISSING" || raw === "REJECTED" || raw === "NOT_UPLOADED") return "non_compliant";
        return "compliant";
      })(),
      passport: {
        number: isPassportUploaded ? (activePassport?.document_number || snapshot?.passport_number || "Not Recorded") : (snapshot?.passport_number || "Not Recorded"),
        issueDate: isPassportUploaded ? (activePassport?.issue_date || "") : "",
        expiryDate: isPassportUploaded ? (activePassport?.expiry_date || snapshot?.passport_expiry || "") : (snapshot?.passport_expiry || ""),
        verificationStatus: isPassportUploaded ? (activePassport?.verification_status || "pending") : "not_uploaded",
        hasUploadedDocument: isPassportUploaded,
        uploadedAt: isPassportUploaded ? activePassport?.created_at : null,
        verifiedAt: isPassportUploaded ? (activePassport?.verified_at || null) : null,
        verifiedBy: isPassportUploaded ? (activePassport?.verified_by || null) : null,
        rejectionReason: isPassportUploaded ? (activePassport?.rejection_reason || null) : null,
        filePath: isPassportUploaded ? (activePassport?.file_path || null) : null
      },
      visa: {
        number: isVisaUploaded ? (activeVisa?.document_number || snapshot?.visa_number || "Not Recorded") : (snapshot?.visa_number || "Not Recorded"),
        issueDate: isVisaUploaded ? (activeVisa?.issue_date || "") : "",
        expiryDate: isVisaUploaded ? (activeVisa?.expiry_date || snapshot?.visa_expiry || "") : (snapshot?.visa_expiry || ""),
        verificationStatus: isVisaUploaded ? (activeVisa?.verification_status || "pending") : "not_uploaded",
        hasUploadedDocument: isVisaUploaded,
        uploadedAt: isVisaUploaded ? activeVisa?.created_at : null,
        verifiedAt: isVisaUploaded ? (activeVisa?.verified_at || null) : null,
        verifiedBy: isVisaUploaded ? (activeVisa?.verified_by || null) : null,
        rejectionReason: isVisaUploaded ? (activeVisa?.rejection_reason || null) : null,
        filePath: isVisaUploaded ? (activeVisa?.file_path || null) : null
      },
      efrro: {
        number: isEfrroUploaded ? (activeEfrro?.document_number || snapshot?.efrro_number || "Not Recorded") : (snapshot?.efrro_number || "Not Recorded"),
        issueDate: isEfrroUploaded ? (activeEfrro?.issue_date || "") : "",
        expiryDate: isEfrroUploaded ? (activeEfrro?.expiry_date || snapshot?.efrro_expiry || "") : (snapshot?.efrro_expiry || ""),
        verificationStatus: isEfrroUploaded ? (activeEfrro?.verification_status || "pending") : "not_uploaded",
        hasUploadedDocument: isEfrroUploaded,
        uploadedAt: isEfrroUploaded ? activeEfrro?.created_at : null,
        verifiedAt: isEfrroUploaded ? (activeEfrro?.verified_at || null) : null,
        verifiedBy: isEfrroUploaded ? (activeEfrro?.verified_by || null) : null,
        rejectionReason: isEfrroUploaded ? (activeEfrro?.rejection_reason || null) : null,
        filePath: isEfrroUploaded ? (activeEfrro?.file_path || null) : null
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
        address: embassy.address || "Not Specified"
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
      return {
        success: true,
        versions: [],
        status: "NOT_UPLOADED"
      };
    }

    const versions: DocumentVersionItem[] = typedRows.map((row: VersionDatabaseRow, index: number) => ({
      id: row.id,
      versionNumber: row.version_number || (typedRows.length - index),
      isActive: Boolean(row.is_active),
      documentNumber: row.document_number,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      verificationStatus: row.verification_status || "pending",
      rejectionReason: row.rejection_reason || null,
      uploadedAt: row.created_at
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
 */
export async function updateDocumentVerificationAction(
  studentId: string,
  documentType: "passport" | "visa" | "efrro",
  versionId?: string | null,
  status: "verified" | "rejected" = "verified",
  rejectionReason?: string,
  notes?: string
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

    const adminSupabase = getAdminSupabase();
    const tableName = documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    const updatePayload: Record<string, unknown> = {
      verification_status: status,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: notes || null
    };

    if (status === "rejected") {
      updatePayload.rejection_reason = rejectionReason || "Document rejected by administrator";
    }

    let query = adminSupabase
      .from(tableName)
      .update(updatePayload)
      .eq("student_id", studentId);

    if (versionId) {
      query = query.eq("id", versionId);
    } else {
      query = query.eq("is_active", true);
    }

    const { error: updateError } = await query;

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Refresh student_snapshot
    const statusCol = `${documentType}_status`;
    const snapshotStatus = status === "verified" ? "COMPLIANT" : "REJECTED";
    await adminSupabase
      .from("student_snapshot")
      .update({
        [statusCol]: snapshotStatus,
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId);

    // Audit log
    await adminSupabase.from("audit_log").insert({
      actor_id: user.id,
      action: status === "verified" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
      resource: `${documentType}_versions/${versionId}`,
      filters_applied: { studentId, documentType, status, rejectionReason }
    });

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
