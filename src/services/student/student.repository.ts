import { getAdminSupabase } from "@/lib/supabase/admin";
import { 
  FullStudentProfile, 
  RegisterStudentInput, 
  UpdateStudentInput, 
  StudentFilterOptions,
  RelationshipType
} from "./student.types";
import { AcademicProgressionEngine, AcademicAdjustmentRecord } from "@/domain/academic/services/semester-progression.service";
import { AcademicProgramService } from "@/domain/academic-programs/academic-program.service";
import { AcademicProgram } from "@/domain/academic-programs/types";

export interface IStudentRepository {
  createStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  getStudentById(id: string): Promise<FullStudentProfile | null>;
  getStudentByRegistrationNumber(regNum: string): Promise<FullStudentProfile | null>;
  updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]>;
  softDeleteStudent(id: string, actorId: string | null): Promise<boolean>;
  recordAcademicAdjustment(
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
    },
    actorId: string | null
  ): Promise<{ success: boolean; adjustmentId?: string; currentSemester?: number; expectedGraduation?: string; error?: string }>;
  getAcademicAdjustments(studentId: string): Promise<AcademicAdjustmentRecord[]>;
}

interface RelationshipRow {
  id: string;
  student_id: string;
  relationship_type: RelationshipType;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export class SupabaseStudentRepository implements IStudentRepository {
  private formatDate(dateVal: Date | string | undefined | null): string | null {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return null;
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, "0");
      const d = String(dateVal.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const str = String(dateVal).trim();
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.includes("T")) return str.split("T")[0];
    const slashParts = str.split("/");
    if (slashParts.length === 3) {
      if (slashParts[0].length === 4) {
        return `${slashParts[0]}-${slashParts[1].padStart(2, "0")}-${slashParts[2].padStart(2, "0")}`;
      } else if (slashParts[2].length === 4) {
        return `${slashParts[2]}-${slashParts[0].padStart(2, "0")}-${slashParts[1].padStart(2, "0")}`;
      }
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return str;
  }

  async createStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile> {
    const supabase = getAdminSupabase();

    // 1. Insert into core students table
    const regNumber = input.registrationNumber && input.registrationNumber.trim()
      ? input.registrationNumber.trim()
      : null;

    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .insert({
        registration_number: regNumber,
        status: "active",
        created_by: actorId,
        updated_by: actorId
      })
      .select()
      .single();

    if (studentError || !studentData) {
      if (studentError?.code === "23505") {
        throw new Error(`Student with enrollment number "${input.registrationNumber}" already exists.`);
      }
      throw new Error(`Failed to create core student record: ${studentError?.message || "Unknown database error"}`);
    }

    const studentId = studentData.id;

    try {
      // 2. Insert into student_personal table
      const dobFormatted = this.formatDate(input.dateOfBirth);
      const nationalityCode = input.nationalityCode && input.nationalityCode.trim() 
        ? input.nationalityCode.trim().toUpperCase() 
        : null;

      const { data: personalData, error: personalError } = await supabase
        .from("student_personal")
        .insert({
          student_id: studentId,
          full_name: input.fullName.trim(),
          nationality_code: nationalityCode,
          gender: input.gender || null,
          dateOfBirth: dobFormatted,
          date_of_birth: dobFormatted,
          blood_group: input.bloodGroup?.trim() || null,
          marital_status: input.maritalStatus || null,
          physical_disability: input.physicalDisability !== undefined ? input.physicalDisability : null,
          father_name: input.fatherName?.trim() || null,
          father_mobile: input.fatherMobile?.trim() || null,
          father_mobile_country_code: input.fatherMobileCountryCode?.trim() || null,
          father_mobile_number: input.fatherMobileNumber?.trim() || null,
          father_whatsapp: input.fatherWhatsapp?.trim() || null,
          father_whatsapp_country_code: input.fatherWhatsappCountryCode?.trim() || null,
          father_whatsapp_number: input.fatherWhatsappNumber?.trim() || null,
          mother_name: input.motherName?.trim() || null,
          mother_mobile: input.motherMobile?.trim() || null,
          mother_mobile_country_code: input.motherMobileCountryCode?.trim() || null,
          mother_mobile_number: input.motherMobileNumber?.trim() || null,
          mother_whatsapp: input.motherWhatsapp?.trim() || null,
          mother_whatsapp_country_code: input.motherWhatsappCountryCode?.trim() || null,
          mother_whatsapp_number: input.motherWhatsappNumber?.trim() || null,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (personalError || !personalData) {
        throw new Error(`Failed to create personal identity record: ${personalError?.message || "Unknown database error"}`);
      }

      // 3. Insert into student_contact table
      const emailVal = input.email && input.email.trim() ? input.email.trim().toLowerCase() : null;
      const phoneHomeVal = input.phoneHome && input.phoneHome.trim() ? input.phoneHome.trim() : null;
      const permAddressVal = input.permanentAddress && input.permanentAddress.trim() ? input.permanentAddress.trim() : null;

      const { data: contactData, error: contactError } = await supabase
        .from("student_contact")
        .insert({
          student_id: studentId,
          email: emailVal,
          phone_home: phoneHomeVal,
          phone_local: input.phoneLocal?.trim() || null,
          phone_local_country_code: input.phoneLocalCountryCode?.trim() || null,
          phone_local_number: input.phoneLocalNumber?.trim() || null,
          phone_home_country_code: input.phoneHomeCountryCode?.trim() || null,
          phone_home_number: input.phoneHomeNumber?.trim() || null,
          permanent_address: permAddressVal,
          local_address: input.localAddress?.trim() || null,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (contactError || !contactData) {
        if (contactError?.code === "23505") {
          throw new Error(`A student with email address "${input.email}" already exists.`);
        }
        throw new Error(`Failed to create contact record: ${contactError?.message || "Unknown database error"}`);
      }

      // 4. Insert into student_academic table (automatically calculated from course structure if provided)
      const admFormatted = this.formatDate(input.admissionDate);
      let programIdVal: string | null = null;
      let programCodeVal: string | null = null;
      let expGradFormatted: string | null = null;
      let calculatedSemester: number | null = null;

      const progIdentifier = input.programId || input.programCode;
      if (progIdentifier && progIdentifier.trim()) {
        const programService = new AcademicProgramService();
        const progConfig = await programService.getProgramByIdCodeOrName(progIdentifier.trim());
        programIdVal = progConfig?.id || (input.programId?.trim() || null);
        programCodeVal = progConfig?.programCode || (input.programCode?.trim() || progConfig?.programName || progIdentifier.trim());

        if (admFormatted) {
          const progression = AcademicProgressionEngine.calculateProgression({
            admissionDate: admFormatted,
            courseConfig: {
              programName: progConfig?.programName || programCodeVal,
              programCode: programCodeVal,
              totalSemesters: progConfig?.totalSemesters || 8,
              semesterDuration: progConfig?.semesterDuration || 6,
              semesterDurationUnit: progConfig?.semesterDurationUnit || "months"
            }
          });
          expGradFormatted = progression.expectedGraduationDateISO || this.formatDate(input.expectedGraduation);
          calculatedSemester = progression.currentSemester;
        } else {
          expGradFormatted = this.formatDate(input.expectedGraduation);
          calculatedSemester = input.currentSemester || null;
        }
      } else {
        expGradFormatted = this.formatDate(input.expectedGraduation);
        calculatedSemester = input.currentSemester || null;
      }

      const isIccr = input.admissionCategory === "iccr";
      const isSii = input.admissionCategory === "sii";
      const resolvedIccrNo = isIccr ? (input.iccrApplicationNumber?.trim() || null) : null;
      const resolvedSiiNo = (isIccr || isSii) ? (input.siiApplicationNumber?.trim() || null) : null;

      let { data: academicData, error: academicError } = await supabase
        .from("student_academic")
        .insert({
          student_id: studentId,
          program_id: programIdVal,
          program_code: programCodeVal,
          override_school_id: input.overrideSchoolId?.trim() || null,
          school_override_reason: input.overrideSchoolId ? (input.schoolOverrideReason?.trim() || null) : null,
          admission_date: admFormatted,
          expected_graduation: expGradFormatted,
          current_semester: calculatedSemester,
          academic_status: "good_standing",
          admission_category: input.admissionCategory || null,
          admission_category_other: input.admissionCategory === "other" ? (input.admissionCategoryOther?.trim() || null) : (input.admissionCategoryOther?.trim() || null),
          sii_application_number: resolvedSiiNo,
          iccr_application_number: resolvedIccrNo,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (academicError && (academicError.message?.includes("override_school_id") || academicError.message?.includes("iccr_application_number"))) {
        const retry = await supabase
          .from("student_academic")
          .insert({
            student_id: studentId,
            program_id: programIdVal,
            program_code: programCodeVal,
            admission_date: admFormatted,
            expected_graduation: expGradFormatted,
            current_semester: calculatedSemester,
            academic_status: "good_standing",
            admission_category: input.admissionCategory || null,
            admission_category_other: input.admissionCategory === "other" ? (input.admissionCategoryOther?.trim() || null) : (input.admissionCategoryOther?.trim() || null),
            sii_application_number: resolvedSiiNo,
            created_by: actorId,
            updated_by: actorId
          })
          .select()
          .single();
        academicData = retry.data;
        academicError = retry.error;
      }

      if (academicError || !academicData) {
        throw new Error(`Failed to create academic record: ${academicError?.message || "Unknown database error"}`);
      }

      // 5. Insert into student_relationships table if emergency contact provided
      let relData = null;
      if (input.relationshipName && input.relationshipName.trim() && input.relationshipPhone && input.relationshipPhone.trim()) {
        const { data: insertedRel, error: relError } = await supabase
          .from("student_relationships")
          .insert({
            student_id: studentId,
            relationship_type: input.relationshipType || "parent",
            name: input.relationshipName.trim(),
            phone: input.relationshipPhone.trim(),
            email: input.relationshipEmail?.trim() || null,
            address: input.relationshipAddress?.trim() || null,
            created_by: actorId,
            updated_by: actorId
          })
          .select()
          .single();

        if (relError) {
          console.warn("[STUDENT_REPOSITORY] Warning: Failed to insert emergency contact:", relError);
        } else {
          relData = insertedRel;
        }
      }

      // 6. Optional: Insert into student_embassy table if provided
      let embassyData = null;
      if (input.embassyName && input.embassyName.trim()) {
        const { data: embResult } = await supabase
          .from("student_embassy")
          .insert({
            student_id: studentId,
            embassy_name: input.embassyName.trim(),
            address: input.embassyAddress?.trim() || "Not Specified",
            city: input.embassyCity?.trim() || null,
            country: input.embassyCountry?.trim() || null,
            phone: input.embassyPhone?.trim() || null,
            email: input.embassyEmail?.trim() || null,
            website: input.embassyWebsite?.trim() || null,
            contact_person: input.embassyContactPerson?.trim() || null,
            created_by: actorId,
            updated_by: actorId
          })
          .select()
          .single();
        embassyData = embResult;
      }

      // 7. Student Snapshot & Document Metadata initialization
      const passportExp = this.formatDate(input.passportExpiry);
      const passportIssue = this.formatDate(input.passportIssueDate);
      const passportNum = input.passportNumber?.trim() || null;
      const passportPlace = input.passportPlaceOfIssue?.trim() || null;

      const visaExp = this.formatDate(input.visaExpiry);
      const visaIssue = this.formatDate(input.visaIssueDate);
      const visaNum = input.visaNumber?.trim() || null;
      const visaType = input.visaType?.trim() || "Student (S-1)";

      const efrroExp = this.formatDate(input.efrroExpiry);
      const efrroIssue = this.formatDate(input.efrroIssueDate);
      const efrroNum = input.efrroNumber?.trim() || null;

      let daysUntilEfrro: number | null = null;
      if (efrroExp) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(efrroExp);
        exp.setHours(0, 0, 0, 0);
        daysUntilEfrro = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      // 8. Insert student_snapshot row for instant compliance and directory queries
      await supabase.from("student_snapshot").insert({
        student_id: studentId,
        passport_status: "MISSING",
        passport_number: passportNum,
        passport_issue_date: passportIssue,
        passport_expiry: passportExp,
        passport_place_of_issue: passportPlace,
        visa_status: "MISSING",
        visa_number: visaNum,
        visa_issue_date: visaIssue,
        visa_expiry: visaExp,
        visa_type: visaType,
        efrro_status: "MISSING",
        efrro_number: efrroNum,
        efrro_issue_date: efrroIssue,
        efrro_expiry: efrroExp,
        days_until_efrro_expiry: daysUntilEfrro,
        compliance_score: 0,
        compliance_status: "MISSING"
      });

      // 9. Record entry in audit_log
      await supabase.from("audit_log").insert({
        actor_id: actorId,
        action: "REGISTER_STUDENT",
        resource: `students/${studentId}`,
        filters_applied: {
          registrationNumber: input.registrationNumber,
          fullName: input.fullName,
          nationality: input.nationalityCode
        }
      });

      return {
        student: {
          id: studentData.id,
          registrationNumber: studentData.registration_number,
          status: studentData.status,
          createdAt: new Date(studentData.created_at),
          updatedAt: new Date(studentData.updated_at),
          deletedAt: studentData.deleted_at ? new Date(studentData.deleted_at) : null,
          createdBy: studentData.created_by,
          updatedBy: studentData.updated_by
        },
        personal: {
          studentId: personalData.student_id,
          fullName: personalData.full_name,
          nationalityCode: personalData.nationality_code,
          gender: personalData.gender,
          dateOfBirth: personalData.date_of_birth ? new Date(personalData.date_of_birth) : null,
          bloodGroup: personalData.blood_group,
          religion: personalData.religion,
          maritalStatus: personalData.marital_status || null,
          physicalDisability: personalData.physical_disability !== undefined ? personalData.physical_disability : null,
          fatherName: personalData.father_name || null,
          fatherMobile: personalData.father_mobile || null,
          fatherMobileCountryCode: personalData.father_mobile_country_code || null,
          fatherMobileNumber: personalData.father_mobile_number || null,
          fatherWhatsapp: personalData.father_whatsapp || null,
          fatherWhatsappCountryCode: personalData.father_whatsapp_country_code || null,
          fatherWhatsappNumber: personalData.father_whatsapp_number || null,
          motherName: personalData.mother_name || null,
          motherMobile: personalData.mother_mobile || null,
          motherMobileCountryCode: personalData.mother_mobile_country_code || null,
          motherMobileNumber: personalData.mother_mobile_number || null,
          motherWhatsapp: personalData.mother_whatsapp || null,
          motherWhatsappCountryCode: personalData.mother_whatsapp_country_code || null,
          motherWhatsappNumber: personalData.mother_whatsapp_number || null,
          createdAt: new Date(personalData.created_at),
          updatedAt: new Date(personalData.updated_at),
          deletedAt: personalData.deleted_at ? new Date(personalData.deleted_at) : null,
          createdBy: personalData.created_by,
          updatedBy: personalData.updated_by
        },
        contact: {
          studentId: contactData.student_id,
          email: contactData.email,
          phoneHome: contactData.phone_home,
          phoneLocal: contactData.phone_local,
          permanentAddress: contactData.permanent_address,
          localAddress: contactData.local_address,
          createdAt: new Date(contactData.created_at),
          updatedAt: new Date(contactData.updated_at),
          deletedAt: contactData.deleted_at ? new Date(contactData.deleted_at) : null,
          createdBy: contactData.created_by,
          updatedBy: contactData.updated_by
        },
        academic: {
          studentId: academicData.student_id,
          programCode: academicData.program_code,
          admissionDate: academicData.admission_date ? new Date(academicData.admission_date) : null,
          expectedGraduation: academicData.expected_graduation ? new Date(academicData.expected_graduation) : null,
          currentSemester: academicData.current_semester,
          academicStatus: academicData.academic_status,
          admissionCategory: academicData.admission_category || null,
          admissionCategoryOther: academicData.admission_category_other || null,
          siiApplicationNumber: academicData.sii_application_number || null,
          iccrApplicationNumber: academicData.iccr_application_number || academicData.sii_application_number || null,
          createdAt: new Date(academicData.created_at),
          updatedAt: new Date(academicData.updated_at),
          deletedAt: academicData.deleted_at ? new Date(academicData.deleted_at) : null,
          createdBy: academicData.created_by,
          updatedBy: academicData.updated_by
        },
        relationships: relData ? [{
          id: relData.id,
          studentId: relData.student_id,
          relationshipType: relData.relationship_type,
          name: relData.name,
          email: relData.email,
          phone: relData.phone,
          address: relData.address,
          createdAt: new Date(relData.created_at),
          updatedAt: new Date(relData.updated_at),
          deletedAt: relData.deleted_at ? new Date(relData.deleted_at) : null,
          createdBy: relData.created_by,
          updatedBy: relData.updated_by
        }] : [],
        embassy: embassyData ? {
          studentId: embassyData.student_id,
          embassyName: embassyData.embassy_name,
          contactPerson: embassyData.contact_person,
          email: embassyData.email,
          phone: embassyData.phone,
          address: embassyData.address,
          createdAt: new Date(embassyData.created_at),
          updatedAt: new Date(embassyData.updated_at),
          deletedAt: embassyData.deleted_at ? new Date(embassyData.deleted_at) : null,
          createdBy: embassyData.created_by,
          updatedBy: embassyData.updated_by
        } : null
      };
    } catch (innerErr) {
      // Rollback the core student row on catastrophic detail failure
      await supabase.from("students").delete().eq("id", studentId);
      throw innerErr;
    }
  }

  async getStudentById(id: string): Promise<FullStudentProfile | null> {
    const supabase = getAdminSupabase();

    const { data: student, error } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        created_at,
        updated_at,
        deleted_at,
        created_by,
        updated_by,
        student_personal(*),
        student_contact(*),
        student_academic(*),
        student_relationships(*),
        student_embassy(*)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !student) {
      return null;
    }

    const personal = student.student_personal?.[0] || student.student_personal;
    const contact = student.student_contact?.[0] || student.student_contact;
    const academic = student.student_academic?.[0] || student.student_academic;
    const relationships: RelationshipRow[] = Array.isArray(student.student_relationships) ? student.student_relationships : [];
    const embassy = student.student_embassy?.[0] || student.student_embassy || null;

    return {
      student: {
        id: student.id,
        registrationNumber: student.registration_number,
        status: student.status,
        createdAt: new Date(student.created_at),
        updatedAt: new Date(student.updated_at),
        deletedAt: student.deleted_at ? new Date(student.deleted_at) : null,
        createdBy: student.created_by,
        updatedBy: student.updated_by
      },
      personal: {
        studentId: personal?.student_id || student.id,
        fullName: personal?.full_name || "Unknown Student",
        nationalityCode: personal?.nationality_code || null,
        gender: personal?.gender || null,
        dateOfBirth: personal?.date_of_birth ? new Date(personal.date_of_birth) : null,
        bloodGroup: personal?.blood_group || null,
        religion: personal?.religion || null,
        maritalStatus: personal?.marital_status || null,
        physicalDisability: personal?.physical_disability !== undefined ? personal?.physical_disability : null,
        fatherName: personal?.father_name || null,
        fatherMobile: personal?.father_mobile || null,
        fatherMobileCountryCode: personal?.father_mobile_country_code || null,
        fatherMobileNumber: personal?.father_mobile_number || null,
        fatherWhatsapp: personal?.father_whatsapp || null,
        fatherWhatsappCountryCode: personal?.father_whatsapp_country_code || null,
        fatherWhatsappNumber: personal?.father_whatsapp_number || null,
        motherName: personal?.mother_name || null,
        motherMobile: personal?.mother_mobile || null,
        motherMobileCountryCode: personal?.mother_mobile_country_code || null,
        motherMobileNumber: personal?.mother_mobile_number || null,
        motherWhatsapp: personal?.mother_whatsapp || null,
        motherWhatsappCountryCode: personal?.mother_whatsapp_country_code || null,
        motherWhatsappNumber: personal?.mother_whatsapp_number || null,
        createdAt: personal?.created_at ? new Date(personal.created_at) : new Date(student.created_at),
        updatedAt: personal?.updated_at ? new Date(personal.updated_at) : new Date(student.updated_at),
        deletedAt: personal?.deleted_at ? new Date(personal.deleted_at) : null,
        createdBy: personal?.created_by || null,
        updatedBy: personal?.updated_by || null
      },
      contact: {
        studentId: contact?.student_id || student.id,
        email: contact?.email || null,
        phoneHome: contact?.phone_home || null,
        phoneLocal: contact?.phone_local || null,
        phoneLocalCountryCode: contact?.phone_local_country_code || null,
        phoneLocalNumber: contact?.phone_local_number || null,
        phoneHomeCountryCode: contact?.phone_home_country_code || null,
        phoneHomeNumber: contact?.phone_home_number || null,
        permanentAddress: contact?.permanent_address || null,
        localAddress: contact?.local_address || null,
        createdAt: contact?.created_at ? new Date(contact.created_at) : new Date(student.created_at),
        updatedAt: contact?.updated_at ? new Date(contact.updated_at) : new Date(student.updated_at),
        deletedAt: contact?.deleted_at ? new Date(contact.deleted_at) : null,
        createdBy: contact?.created_by || null,
        updatedBy: contact?.updated_by || null
      },
      academic: {
        studentId: academic?.student_id || student.id,
        programId: academic?.program_id || null,
        programCode: academic?.program_code || null,
        overrideSchoolId: academic?.override_school_id || null,
        schoolOverrideReason: academic?.school_override_reason || null,
        admissionDate: academic?.admission_date ? new Date(academic.admission_date) : null,
        expectedGraduation: academic?.expected_graduation ? new Date(academic.expected_graduation) : null,
        currentSemester: academic?.current_semester ?? null,
        academicStatus: academic?.academic_status || "good_standing",
        admissionCategory: academic?.admission_category || null,
        admissionCategoryOther: academic?.admission_category_other || null,
        siiApplicationNumber: academic?.sii_application_number || null,
        iccrApplicationNumber: academic?.iccr_application_number || null,
        createdAt: academic?.created_at ? new Date(academic.created_at) : new Date(student.created_at),
        updatedAt: academic?.updated_at ? new Date(academic.updated_at) : new Date(student.updated_at),
        deletedAt: academic?.deleted_at ? new Date(academic.deleted_at) : null,
        createdBy: academic?.created_by || null,
        updatedBy: academic?.updated_by || null
      },
      relationships: relationships.map((r: RelationshipRow) => ({
        id: r.id,
        studentId: r.student_id,
        relationshipType: r.relationship_type,
        name: r.name,
        email: r.email || null,
        phone: r.phone,
        address: r.address || null,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
        deletedAt: r.deleted_at ? new Date(r.deleted_at) : null,
        createdBy: r.created_by,
        updatedBy: r.updated_by
      })),
      embassy: embassy ? {
        studentId: embassy.student_id,
        embassyName: embassy.embassy_name,
        contactPerson: embassy.contact_person,
        email: embassy.email,
        phone: embassy.phone,
        address: embassy.address,
        city: embassy.city || null,
        country: embassy.country || null,
        website: embassy.website || null,
        createdAt: new Date(embassy.created_at),
        updatedAt: new Date(embassy.updated_at),
        deletedAt: embassy.deleted_at ? new Date(embassy.deleted_at) : null,
        createdBy: embassy.created_by,
        updatedBy: embassy.updated_by
      } : null
    };
  }

  async getStudentByRegistrationNumber(regNum: string): Promise<FullStudentProfile | null> {
    const supabase = getAdminSupabase();

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("registration_number", regNum.trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (!student) return null;
    return this.getStudentById(student.id);
  }

  async updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile> {
    const supabase = getAdminSupabase();

    // 1. Update students table if status or registrationNumber provided
    const studentUpdates: Record<string, unknown> = {};
    if (input.status) studentUpdates.status = input.status;
    if (input.registrationNumber !== undefined) {
      studentUpdates.registration_number = input.registrationNumber && input.registrationNumber.trim() 
        ? input.registrationNumber.trim() 
        : null;
    }

    if (Object.keys(studentUpdates).length > 0) {
      studentUpdates.updated_at = new Date().toISOString();
      studentUpdates.updated_by = actorId;

      // Fetch previous registration number for audit logging
      let previousRegNumber: string | null = null;
      if (input.registrationNumber !== undefined) {
        const { data: prevStudent } = await supabase
          .from("students")
          .select("registration_number")
          .eq("id", id)
          .maybeSingle();
        previousRegNumber = prevStudent?.registration_number || null;
      }

      const { error: studentUpdateErr } = await supabase
        .from("students")
        .update(studentUpdates)
        .eq("id", id);

      if (studentUpdateErr) {
        if (studentUpdateErr.code === "23505") {
          throw new Error(`Enrollment number "${input.registrationNumber}" is already in use by another student.`);
        }
        throw new Error(`Failed to update student: ${studentUpdateErr.message}`);
      }

      // Log audit event if enrollment number was modified
      if (input.registrationNumber !== undefined) {
        const newReg = studentUpdates.registration_number as string | null;
        if (previousRegNumber !== newReg) {
          await supabase.from("audit_log").insert({
            actor_id: actorId,
            action: "UPDATE_STUDENT_REGISTRATION_NUMBER",
            resource: `students/${id}`,
            filters_applied: {
              studentId: id,
              previousRegistrationNumber: previousRegNumber,
              newRegistrationNumber: newReg
            }
          });
        }
      }
    }

    // 2. Update student_personal table if personal fields provided
    const personalUpdates: Record<string, unknown> = {};
    if (input.fullName !== undefined) personalUpdates.full_name = input.fullName.trim();
    if (input.nationalityCode !== undefined) {
      personalUpdates.nationality_code = input.nationalityCode && input.nationalityCode.trim()
        ? input.nationalityCode.trim().toUpperCase()
        : null;
    }
    if (input.gender !== undefined) personalUpdates.gender = input.gender || null;
    if (input.dateOfBirth !== undefined) personalUpdates.date_of_birth = this.formatDate(input.dateOfBirth);
    if (input.bloodGroup !== undefined) personalUpdates.blood_group = input.bloodGroup ? input.bloodGroup.trim() : null;
    if (input.maritalStatus !== undefined) personalUpdates.marital_status = input.maritalStatus || null;
    if (input.physicalDisability !== undefined) personalUpdates.physical_disability = input.physicalDisability;
    if (input.fatherName !== undefined) personalUpdates.father_name = input.fatherName ? input.fatherName.trim() : null;
    if (input.fatherMobile !== undefined) personalUpdates.father_mobile = input.fatherMobile ? input.fatherMobile.trim() : null;
    if (input.fatherMobileCountryCode !== undefined) personalUpdates.father_mobile_country_code = input.fatherMobileCountryCode ? input.fatherMobileCountryCode.trim() : null;
    if (input.fatherMobileNumber !== undefined) personalUpdates.father_mobile_number = input.fatherMobileNumber ? input.fatherMobileNumber.trim() : null;
    if (input.fatherWhatsapp !== undefined) personalUpdates.father_whatsapp = input.fatherWhatsapp ? input.fatherWhatsapp.trim() : null;
    if (input.fatherWhatsappCountryCode !== undefined) personalUpdates.father_whatsapp_country_code = input.fatherWhatsappCountryCode ? input.fatherWhatsappCountryCode.trim() : null;
    if (input.fatherWhatsappNumber !== undefined) personalUpdates.father_whatsapp_number = input.fatherWhatsappNumber ? input.fatherWhatsappNumber.trim() : null;
    if (input.motherName !== undefined) personalUpdates.mother_name = input.motherName ? input.motherName.trim() : null;
    if (input.motherMobile !== undefined) personalUpdates.mother_mobile = input.motherMobile ? input.motherMobile.trim() : null;
    if (input.motherMobileCountryCode !== undefined) personalUpdates.mother_mobile_country_code = input.motherMobileCountryCode ? input.motherMobileCountryCode.trim() : null;
    if (input.motherMobileNumber !== undefined) personalUpdates.mother_mobile_number = input.motherMobileNumber ? input.motherMobileNumber.trim() : null;
    if (input.motherWhatsapp !== undefined) personalUpdates.mother_whatsapp = input.motherWhatsapp ? input.motherWhatsapp.trim() : null;
    if (input.motherWhatsappCountryCode !== undefined) personalUpdates.mother_whatsapp_country_code = input.motherWhatsappCountryCode ? input.motherWhatsappCountryCode.trim() : null;
    if (input.motherWhatsappNumber !== undefined) personalUpdates.mother_whatsapp_number = input.motherWhatsappNumber ? input.motherWhatsappNumber.trim() : null;

    if (Object.keys(personalUpdates).length > 0) {
      personalUpdates.updated_at = new Date().toISOString();
      personalUpdates.updated_by = actorId;
      await supabase.from("student_personal").update(personalUpdates).eq("student_id", id);
    }

    // 3. Update student_contact table if contact fields provided
    const contactUpdates: Record<string, unknown> = {};
    if (input.email !== undefined) contactUpdates.email = input.email && input.email.trim() ? input.email.trim().toLowerCase() : null;
    if (input.phoneHome !== undefined) contactUpdates.phone_home = input.phoneHome && input.phoneHome.trim() ? input.phoneHome.trim() : null;
    if (input.phoneLocal !== undefined) contactUpdates.phone_local = input.phoneLocal ? input.phoneLocal.trim() : null;
    if (input.phoneLocalCountryCode !== undefined) contactUpdates.phone_local_country_code = input.phoneLocalCountryCode ? input.phoneLocalCountryCode.trim() : null;
    if (input.phoneLocalNumber !== undefined) contactUpdates.phone_local_number = input.phoneLocalNumber ? input.phoneLocalNumber.trim() : null;
    if (input.phoneHomeCountryCode !== undefined) contactUpdates.phone_home_country_code = input.phoneHomeCountryCode ? input.phoneHomeCountryCode.trim() : null;
    if (input.phoneHomeNumber !== undefined) contactUpdates.phone_home_number = input.phoneHomeNumber ? input.phoneHomeNumber.trim() : null;
    if (input.permanentAddress !== undefined) contactUpdates.permanent_address = input.permanentAddress && input.permanentAddress.trim() ? input.permanentAddress.trim() : null;
    if (input.localAddress !== undefined) contactUpdates.local_address = input.localAddress ? input.localAddress.trim() : null;
    if (Object.keys(contactUpdates).length > 0) {
      contactUpdates.updated_at = new Date().toISOString();
      contactUpdates.updated_by = actorId;
      await supabase.from("student_contact").update(contactUpdates).eq("student_id", id);
    }

    // 4. Update student_academic table if academic fields provided
    const academicUpdates: Record<string, unknown> = {};
    const progIdent = input.programId || input.programCode;
    let resolvedProg: AcademicProgram | null = null;

    if (progIdent && progIdent.trim()) {
      const programService = new AcademicProgramService();
      resolvedProg = await programService.getProgramByIdCodeOrName(progIdent.trim());
      academicUpdates.program_id = resolvedProg?.id || (input.programId?.trim() || null);
      academicUpdates.program_code = resolvedProg?.programCode || (input.programCode?.trim() || resolvedProg?.programName || progIdent.trim());
    } else if (input.programCode === null || input.programId === null) {
      academicUpdates.program_id = null;
      academicUpdates.program_code = null;
    }

    if (input.admissionDate !== undefined) academicUpdates.admission_date = this.formatDate(input.admissionDate);
    if (input.expectedGraduation !== undefined) academicUpdates.expected_graduation = this.formatDate(input.expectedGraduation);
    if (input.academicStatus) academicUpdates.academic_status = input.academicStatus;
    if (input.admissionCategory !== undefined) {
      academicUpdates.admission_category = input.admissionCategory || null;
      if (input.admissionCategory === "iccr") {
        if (input.iccrApplicationNumber !== undefined) {
          academicUpdates.iccr_application_number = input.iccrApplicationNumber ? input.iccrApplicationNumber.trim() : null;
        }
        if (input.siiApplicationNumber !== undefined) {
          academicUpdates.sii_application_number = input.siiApplicationNumber ? input.siiApplicationNumber.trim() : null;
        }
      } else if (input.admissionCategory === "sii") {
        // Data retention rule: switching to SII clears ICCR number, retains/updates SII number
        academicUpdates.iccr_application_number = null;
        if (input.siiApplicationNumber !== undefined) {
          academicUpdates.sii_application_number = input.siiApplicationNumber ? input.siiApplicationNumber.trim() : null;
        }
      } else {
        // Data retention rule: non-ICCR/non-SII category clears both application numbers
        academicUpdates.iccr_application_number = null;
        academicUpdates.sii_application_number = null;
      }
    } else {
      if (input.iccrApplicationNumber !== undefined) {
        academicUpdates.iccr_application_number = input.iccrApplicationNumber ? input.iccrApplicationNumber.trim() : null;
      }
      if (input.siiApplicationNumber !== undefined) {
        academicUpdates.sii_application_number = input.siiApplicationNumber ? input.siiApplicationNumber.trim() : null;
      }
    }
    if (input.admissionCategoryOther !== undefined) academicUpdates.admission_category_other = input.admissionCategoryOther ? input.admissionCategoryOther.trim() : null;
    if (input.overrideSchoolId !== undefined) academicUpdates.override_school_id = input.overrideSchoolId ? input.overrideSchoolId.trim() : null;
    if (input.schoolOverrideReason !== undefined) academicUpdates.school_override_reason = input.schoolOverrideReason ? input.schoolOverrideReason.trim() : null;

    if (progIdent || input.admissionDate) {
      // Re-calculate progression automatically based on updated course or admission date
      const { data: currentAcademic } = await supabase
        .from("student_academic")
        .select("program_id, program_code, admission_date, expected_graduation")
        .eq("student_id", id)
        .maybeSingle();

      const effectiveProgCode = (academicUpdates.program_code as string) || currentAcademic?.program_code;
      const effectiveProgId = (academicUpdates.program_id as string) || currentAcademic?.program_id;
      const admDate = input.admissionDate ? this.formatDate(input.admissionDate) : currentAcademic?.admission_date;

      if ((effectiveProgId || effectiveProgCode) && admDate) {
        const programService = new AcademicProgramService();
        const progConfig = resolvedProg || await programService.getProgramByIdCodeOrName(effectiveProgId || effectiveProgCode);

        // Fetch existing adjustments
        const { data: adjustmentsData } = await supabase
          .from("student_academic_adjustments")
          .select("*")
          .eq("student_id", id);

        const adjustments = (adjustmentsData || []).map(a => ({
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

        const progression = AcademicProgressionEngine.calculateProgression({
          admissionDate: admDate,
          courseConfig: {
            programName: progConfig?.programName || effectiveProgCode,
            programCode: progConfig?.programCode || effectiveProgCode,
            totalSemesters: progConfig?.totalSemesters || 8,
            semesterDuration: progConfig?.semesterDuration || 6,
            semesterDurationUnit: progConfig?.semesterDurationUnit || "months"
          },
          adjustments
        });

        academicUpdates.current_semester = progression.currentSemester;
        if (!input.expectedGraduation) {
          academicUpdates.expected_graduation = progression.expectedGraduationDateISO;
        }
      }
    }

    if (Object.keys(academicUpdates).length > 0) {
      academicUpdates.updated_at = new Date().toISOString();
      academicUpdates.updated_by = actorId;
      const { error: updateErr } = await supabase.from("student_academic").update(academicUpdates).eq("student_id", id);
      if (updateErr && (updateErr.message?.includes("override_school_id") || updateErr.message?.includes("iccr_application_number"))) {
        if (updateErr.message.includes("iccr_application_number")) {
          delete academicUpdates.iccr_application_number;
        }
        if (updateErr.message.includes("override_school_id")) {
          delete academicUpdates.override_school_id;
          delete academicUpdates.school_override_reason;
        }
        await supabase.from("student_academic").update(academicUpdates).eq("student_id", id);
      }
    }

    // 4.5. Update or insert primary emergency contact / relationship
    const hasRelUpdates = 
      input.relationshipName !== undefined || 
      input.relationshipPhone !== undefined || 
      input.relationshipType !== undefined || 
      input.relationshipEmail !== undefined || 
      input.relationshipAddress !== undefined;

    if (hasRelUpdates) {
      const { data: existingRel } = await supabase
        .from("student_relationships")
        .select("id")
        .eq("student_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingRel) {
        const relUpdatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          updated_by: actorId
        };
        if (input.relationshipType !== undefined) relUpdatePayload.relationship_type = input.relationshipType || "parent";
        if (input.relationshipName !== undefined) relUpdatePayload.name = input.relationshipName ? input.relationshipName.trim() : "";
        if (input.relationshipPhone !== undefined) relUpdatePayload.phone = input.relationshipPhone ? input.relationshipPhone.trim() : "";
        if (input.relationshipEmail !== undefined) relUpdatePayload.email = input.relationshipEmail ? input.relationshipEmail.trim() : null;
        if (input.relationshipAddress !== undefined) relUpdatePayload.address = input.relationshipAddress ? input.relationshipAddress.trim() : null;

        await supabase
          .from("student_relationships")
          .update(relUpdatePayload)
          .eq("id", existingRel.id);
      } else if (input.relationshipName && input.relationshipName.trim() && input.relationshipPhone && input.relationshipPhone.trim()) {
        await supabase
          .from("student_relationships")
          .insert({
            student_id: id,
            relationship_type: input.relationshipType || "parent",
            name: input.relationshipName.trim(),
            phone: input.relationshipPhone.trim(),
            email: input.relationshipEmail?.trim() || null,
            address: input.relationshipAddress?.trim() || null,
            created_by: actorId,
            updated_by: actorId
          });
      }
    }

    // 5. Update or Upsert student_embassy table
    const hasEmbassyInputs = 
      input.embassyName !== undefined ||
      input.embassyAddress !== undefined ||
      input.embassyCity !== undefined ||
      input.embassyCountry !== undefined ||
      input.embassyPhone !== undefined ||
      input.embassyEmail !== undefined ||
      input.embassyWebsite !== undefined ||
      input.embassyContactPerson !== undefined;

    if (hasEmbassyInputs) {
      const { data: existingEmbassy } = await supabase
        .from("student_embassy")
        .select("student_id")
        .eq("student_id", id)
        .maybeSingle();

      const embassyPayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: actorId
      };
      if (input.embassyName !== undefined) embassyPayload.embassy_name = input.embassyName ? input.embassyName.trim() : null;
      if (input.embassyAddress !== undefined) embassyPayload.address = input.embassyAddress ? input.embassyAddress.trim() : null;
      if (input.embassyCity !== undefined) embassyPayload.city = input.embassyCity ? input.embassyCity.trim() : null;
      if (input.embassyCountry !== undefined) embassyPayload.country = input.embassyCountry ? input.embassyCountry.trim() : null;
      if (input.embassyPhone !== undefined) embassyPayload.phone = input.embassyPhone ? input.embassyPhone.trim() : null;
      if (input.embassyEmail !== undefined) embassyPayload.email = input.embassyEmail ? input.embassyEmail.trim().toLowerCase() : null;
      if (input.embassyWebsite !== undefined) embassyPayload.website = input.embassyWebsite ? input.embassyWebsite.trim() : null;
      if (input.embassyContactPerson !== undefined) embassyPayload.contact_person = input.embassyContactPerson ? input.embassyContactPerson.trim() : null;

      if (existingEmbassy) {
        if (Object.keys(embassyPayload).length > 2) {
          await supabase
            .from("student_embassy")
            .update(embassyPayload)
            .eq("student_id", id);
        }
      } else if (input.embassyName && input.embassyName.trim()) {
        await supabase
          .from("student_embassy")
          .insert({
            student_id: id,
            embassy_name: input.embassyName.trim(),
            address: input.embassyAddress?.trim() || "Not Specified",
            city: input.embassyCity?.trim() || null,
            country: input.embassyCountry?.trim() || null,
            phone: input.embassyPhone?.trim() || null,
            email: input.embassyEmail?.trim() || null,
            website: input.embassyWebsite?.trim() || null,
            contact_person: input.embassyContactPerson?.trim() || null,
            created_by: actorId,
            updated_by: actorId
          });
      }
    }

    // 6. Record update audit log
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      action: "UPDATE_STUDENT",
      resource: `students/${id}`,
      filters_applied: input
    });

    const updated = await this.getStudentById(id);
    if (!updated) {
      throw new Error("Failed to retrieve updated student profile.");
    }
    return updated;
  }

  async listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]> {
    const supabase = getAdminSupabase();

    let query = supabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        created_at,
        updated_at,
        deleted_at,
        created_by,
        updated_by,
        student_personal!inner(*),
        student_contact!inner(*),
        student_academic!inner(*),
        student_relationships(*),
        student_embassy(*)
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data: results, error } = await query;

    if (error || !results) {
      console.error("[STUDENT_REPOSITORY] Error fetching students list:", error);
      return [];
    }

    const profiles: FullStudentProfile[] = [];

    for (const student of results) {
      const personal = student.student_personal?.[0] || student.student_personal;
      const contact = student.student_contact?.[0] || student.student_contact;
      const academic = student.student_academic?.[0] || student.student_academic;
      const relationships: RelationshipRow[] = Array.isArray(student.student_relationships) ? student.student_relationships : [];
      const embassy = student.student_embassy?.[0] || student.student_embassy || null;

      if (personal && contact && academic) {
        profiles.push({
          student: {
            id: student.id,
            registrationNumber: student.registration_number,
            status: student.status,
            createdAt: new Date(student.created_at),
            updatedAt: new Date(student.updated_at),
            deletedAt: student.deleted_at ? new Date(student.deleted_at) : null,
            createdBy: student.created_by,
            updatedBy: student.updated_by
          },
          personal: {
            studentId: personal.student_id,
            fullName: personal.full_name,
            nationalityCode: personal.nationality_code,
            gender: personal.gender,
            dateOfBirth: new Date(personal.date_of_birth),
            bloodGroup: personal.blood_group,
            religion: personal.religion,
            createdAt: new Date(personal.created_at),
            updatedAt: new Date(personal.updated_at),
            deletedAt: personal.deleted_at ? new Date(personal.deleted_at) : null,
            createdBy: personal.created_by,
            updatedBy: personal.updated_by
          },
          contact: {
            studentId: contact.student_id,
            email: contact.email,
            phoneHome: contact.phone_home,
            phoneLocal: contact.phone_local,
            permanentAddress: contact.permanent_address,
            localAddress: contact.local_address,
            createdAt: new Date(contact.created_at),
            updatedAt: new Date(contact.updated_at),
            deletedAt: contact.deleted_at ? new Date(contact.deleted_at) : null,
            createdBy: contact.created_by,
            updatedBy: contact.updated_by
          },
          academic: {
            studentId: academic.student_id,
            programCode: academic.program_code,
            admissionDate: new Date(academic.admission_date),
            expectedGraduation: new Date(academic.expected_graduation),
            currentSemester: academic.current_semester,
            academicStatus: academic.academic_status,
            createdAt: new Date(academic.created_at),
            updatedAt: new Date(academic.updated_at),
            deletedAt: academic.deleted_at ? new Date(academic.deleted_at) : null,
            createdBy: academic.created_by,
            updatedBy: academic.updated_by
          },
          relationships: relationships.map((r: RelationshipRow) => ({
            id: r.id,
            studentId: r.student_id,
            relationshipType: r.relationship_type,
            name: r.name,
            email: r.email || null,
            phone: r.phone,
            address: r.address || null,
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at),
            deletedAt: r.deleted_at ? new Date(r.deleted_at) : null,
            createdBy: r.created_by,
            updatedBy: r.updated_by
          })),
          embassy: embassy ? {
            studentId: embassy.student_id,
            embassyName: embassy.embassy_name,
            contactPerson: embassy.contact_person,
            email: embassy.email,
            phone: embassy.phone,
            address: embassy.address,
            city: embassy.city || null,
            country: embassy.country || null,
            website: embassy.website || null,
            createdAt: new Date(embassy.created_at),
            updatedAt: new Date(embassy.updated_at),
            deletedAt: embassy.deleted_at ? new Date(embassy.deleted_at) : null,
            createdBy: embassy.created_by,
            updatedBy: embassy.updated_by
          } : null
        });
      }
    }

    return profiles;
  }

  async softDeleteStudent(id: string, actorId: string | null): Promise<boolean> {
    const supabase = getAdminSupabase();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("students")
      .update({
        deleted_at: now,
        updated_at: now,
        updated_by: actorId
      })
      .eq("id", id);

    if (error) {
      console.error("[STUDENT_REPOSITORY] Soft delete student error:", error);
      return false;
    }

    // Soft delete associated child records
    await Promise.all([
      supabase.from("student_personal").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id),
      supabase.from("student_contact").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id),
      supabase.from("student_academic").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id),
      supabase.from("student_relationships").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id),
      supabase.from("student_embassy").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id),
      supabase.from("passport_versions").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id),
      supabase.from("visa_versions").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id),
      supabase.from("efrro_versions").update({ deleted_at: now, updated_at: now, updated_by: actorId }).eq("student_id", id)
    ]);

    // Record audit log
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      action: "DELETE_STUDENT",
      resource: `students/${id}`
    });

    return true;
  }

  /**
   * Records an auditable academic adjustment (override, repeat, leave, extension, course transfer) and updates progression
   */
  async recordAcademicAdjustment(
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
    },
    actorId: string | null
  ): Promise<{ success: boolean; adjustmentId?: string; currentSemester?: number; expectedGraduation?: string; error?: string }> {
    const supabase = getAdminSupabase();

    if (!input.reason || !input.reason.trim()) {
      throw new Error("A mandatory institutional reason is required to record an academic adjustment.");
    }
    if (!input.effectiveDate) {
      throw new Error("An effective date is required for the academic adjustment.");
    }

    // 1. Fetch current academic record
    const { data: academic, error: acadErr } = await supabase
      .from("student_academic")
      .select("program_code, admission_date, expected_graduation, current_semester, academic_status")
      .eq("student_id", studentId)
      .maybeSingle();

    if (acadErr || !academic) {
      throw new Error(`Academic record not found for student ${studentId}`);
    }

    const previousSem = academic.current_semester;
    const currentProgCode = academic.program_code;

    // 2. Insert into student_academic_adjustments
    const { data: adjRecord, error: adjErr } = await supabase
      .from("student_academic_adjustments")
      .insert({
        student_id: studentId,
        adjustment_type: input.adjustmentType,
        effective_date: this.formatDate(input.effectiveDate),
        previous_program_code: currentProgCode,
        new_program_code: input.newProgramCode?.trim() || currentProgCode,
        previous_semester: input.previousSemester ?? previousSem,
        adjusted_semester: input.adjustedSemester ?? null,
        reason: input.reason.trim(),
        notes: input.notes ? input.notes.trim() : null,
        created_by: actorId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (adjErr || !adjRecord) {
      throw new Error(`Failed to record academic adjustment: ${adjErr?.message || "Unknown error"}`);
    }

    // 3. Fetch all active adjustments for this student to recalculate progression
    const { data: allAdjustments } = await supabase
      .from("student_academic_adjustments")
      .select("*")
      .eq("student_id", studentId);

    const adjustments = (allAdjustments || []).map(a => ({
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

    // 4. Load program configuration
    const activeProgramCode = input.newProgramCode?.trim() || currentProgCode;
    const programService = new AcademicProgramService();
    const progConfig = await programService.getProgramByCodeOrName(activeProgramCode);

    const progression = AcademicProgressionEngine.calculateProgression({
      admissionDate: academic.admission_date,
      courseConfig: {
        programName: progConfig?.programName || activeProgramCode,
        programCode: progConfig?.programCode || activeProgramCode,
        totalSemesters: progConfig?.totalSemesters || 8,
        semesterDuration: progConfig?.semesterDuration || 6,
        semesterDurationUnit: progConfig?.semesterDurationUnit || "months"
      },
      adjustments
    });

    // 5. Update student_academic table
    const updatePayload: Record<string, unknown> = {
      current_semester: progression.currentSemester,
      expected_graduation: progression.expectedGraduationDateISO || academic.expected_graduation,
      updated_at: new Date().toISOString(),
      updated_by: actorId
    };

    if (input.newProgramCode && input.newProgramCode.trim() !== currentProgCode) {
      updatePayload.program_code = input.newProgramCode.trim();
    }

    await supabase
      .from("student_academic")
      .update(updatePayload)
      .eq("student_id", studentId);

    // 6. Record in audit log
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      action: "ACADEMIC_ADJUSTMENT_RECORDED",
      resource: `students/${studentId}/academic`,
      filters_applied: {
        adjustmentId: adjRecord.id,
        adjustmentType: input.adjustmentType,
        previousSemester: previousSem,
        newSemester: progression.currentSemester,
        reason: input.reason
      }
    });

    return {
      success: true,
      adjustmentId: adjRecord.id,
      currentSemester: progression.currentSemester,
      expectedGraduation: progression.expectedGraduationDateISO
    };
  }

  /**
   * Retrieves all historical academic adjustments for a student
   */
  async getAcademicAdjustments(studentId: string): Promise<AcademicAdjustmentRecord[]> {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("student_academic_adjustments")
      .select("*")
      .eq("student_id", studentId)
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      adjustmentType: row.adjustment_type,
      effectiveDate: row.effective_date,
      previousProgramCode: row.previous_program_code,
      newProgramCode: row.new_program_code,
      previousSemester: row.previous_semester,
      adjustedSemester: row.adjusted_semester,
      reason: row.reason,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));
  }
}
