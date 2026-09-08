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
import { normalizeCountryInputSync } from "@/domain/countries/country-utils";
import { parseDateToISO } from "@/lib/utils/date";

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
    return parseDateToISO(dateVal);
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
        ? (normalizeCountryInputSync(input.nationalityCode)?.isoAlpha3 || input.nationalityCode.trim().toUpperCase()) 
        : null;

      const { data: personalData, error: personalError } = await supabase
        .from("student_personal")
        .insert({
          student_id: studentId,
          full_name: input.fullName.trim(),
          nationality_code: nationalityCode,
          gender: input.gender || null,
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
          father_email: input.fatherEmail && input.fatherEmail.trim() ? input.fatherEmail.trim().toLowerCase() : null,
          mother_name: input.motherName?.trim() || null,
          mother_mobile: input.motherMobile?.trim() || null,
          mother_mobile_country_code: input.motherMobileCountryCode?.trim() || null,
          mother_mobile_number: input.motherMobileNumber?.trim() || null,
          mother_whatsapp: input.motherWhatsapp?.trim() || null,
          mother_whatsapp_country_code: input.motherWhatsappCountryCode?.trim() || null,
          mother_whatsapp_number: input.motherWhatsappNumber?.trim() || null,
          mother_email: input.motherEmail && input.motherEmail.trim() ? input.motherEmail.trim().toLowerCase() : null,
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
          present_address: (input.presentAddress && input.presentAddress.trim()) ? input.presentAddress.trim() : (input.localAddress?.trim() || null),
          local_address: (input.presentAddress && input.presentAddress.trim()) ? input.presentAddress.trim() : (input.localAddress?.trim() || null),
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

      const resolvedIccrNo = input.iccrApplicationNumber ? input.iccrApplicationNumber.trim() : null;
      const resolvedSiiNo = input.siiApplicationNumber ? input.siiApplicationNumber.trim() : null;
      const rawCampus = input.nfsuCampus ? input.nfsuCampus.trim() : null;
      const resolvedNfsuCampus = rawCampus && rawCampus.toLowerCase() === "gandhinagar"
        ? "Gandhinagar Headquarter"
        : rawCampus;
      const resolvedScholarshipScheme = input.scholarshipSchemeName ? input.scholarshipSchemeName.trim() : (input.iccrScholarshipSchemeName ? input.iccrScholarshipSchemeName.trim() : null);
      const joiningDateFormatted = this.formatDate(input.joiningDate);

      let { data: academicData, error: academicError } = await supabase
        .from("student_academic")
        .insert({
          student_id: studentId,
          program_id: programIdVal,
          program_code: programCodeVal,
          override_school_id: input.overrideSchoolId?.trim() || null,
          school_override_reason: input.overrideSchoolId ? (input.schoolOverrideReason?.trim() || null) : null,
          admission_date: admFormatted,
          joining_date: joiningDateFormatted,
          expected_graduation: expGradFormatted,
          current_semester: calculatedSemester,
          academic_status: "good_standing",
          admission_category: input.admissionCategory || null,
          last_educational_qualification: input.lastEducationalQualification ? input.lastEducationalQualification.trim() : null,
          last_educational_institution: input.lastEducationalInstitution ? input.lastEducationalInstitution.trim() : null,
          admission_category_other: input.admissionCategory === "other" ? (input.admissionCategoryOther?.trim() || null) : (input.admissionCategoryOther?.trim() || null),
          sii_application_number: resolvedSiiNo,
          iccr_application_number: resolvedIccrNo,
          iccr_scholarship_scheme_name: resolvedScholarshipScheme,
          nfsu_campus: resolvedNfsuCampus,
          admission_academic_year: input.admissionAcademicYear ? input.admissionAcademicYear.trim() : null,
          fee_payment_category: input.feePaymentCategory || null,
          tuition_fee_amount: input.tuitionFeeAmount !== undefined && input.tuitionFeeAmount !== null ? input.tuitionFeeAmount : null,
          tuition_fee_currency: input.tuitionFeeCurrency || null,
          hostel_fee_amount: input.hostelFeeAmount !== undefined && input.hostelFeeAmount !== null ? input.hostelFeeAmount : null,
          hostel_fee_currency: input.hostelFeeCurrency || null,
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
            joining_date: joiningDateFormatted,
            expected_graduation: expGradFormatted,
            current_semester: calculatedSemester,
            academic_status: "good_standing",
            admission_category: input.admissionCategory || null,
            admission_category_other: input.admissionCategory === "other" ? (input.admissionCategoryOther?.trim() || null) : (input.admissionCategoryOther?.trim() || null),
            sii_application_number: resolvedSiiNo,
            nfsu_campus: resolvedNfsuCampus,
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
      const hasAnyEmbassyData = Boolean(
        input.embassyName?.trim() ||
        input.embassyAddress?.trim() ||
        input.embassyCity?.trim() ||
        input.embassyCountry?.trim() ||
        input.embassyPhone?.trim() ||
        input.embassyEmail?.trim() ||
        input.embassyWebsite?.trim() ||
        input.embassyContactPerson?.trim()
      );

      if (hasAnyEmbassyData) {
        const { data: embResult } = await supabase
          .from("student_embassy")
          .insert({
            student_id: studentId,
            embassy_name: input.embassyName?.trim() || "Not Specified",
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

      // 8. Calculate initial document and compliance statuses based on supplied metadata
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const calcStatus = (num: string | null, exp: string | null): string => {
        if (!num || !num.trim() || !exp || !exp.trim()) return "MISSING";
        const expDate = new Date(exp);
        expDate.setHours(0, 0, 0, 0);
        if (isNaN(expDate.getTime())) return "MISSING";
        const diff = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return "EXPIRED";
        if (diff <= 30) return "WARNING";
        return "COMPLIANT";
      };

      const passportStatus = calcStatus(passportNum, passportExp);
      const visaStatus = calcStatus(visaNum, visaExp);
      const efrroStatus = calcStatus(efrroNum, efrroExp);

      let overallCompliance = "COMPLIANT";
      if (passportStatus === "EXPIRED" || visaStatus === "EXPIRED" || efrroStatus === "EXPIRED") {
        overallCompliance = "EXPIRED";
      } else if (passportStatus === "MISSING" || visaStatus === "MISSING" || efrroStatus === "MISSING") {
        overallCompliance = "MISSING";
      } else if (passportStatus === "WARNING" || visaStatus === "WARNING" || efrroStatus === "WARNING") {
        overallCompliance = "WARNING";
      }

      const complianceScore = overallCompliance === "COMPLIANT" ? 100 : overallCompliance === "WARNING" ? 70 : overallCompliance === "EXPIRED" ? 10 : 0;

      // Insert student_snapshot row for instant compliance and directory queries
      await supabase.from("student_snapshot").insert({
        student_id: studentId,
        passport_status: passportStatus,
        passport_number: passportNum,
        passport_issue_date: passportIssue,
        passport_expiry: passportExp,
        passport_place_of_issue: passportPlace,
        visa_status: visaStatus,
        visa_number: visaNum,
        visa_issue_date: visaIssue,
        visa_expiry: visaExp,
        visa_type: visaType,
        efrro_status: efrroStatus,
        efrro_number: efrroNum,
        efrro_issue_date: efrroIssue,
        efrro_expiry: efrroExp,
        days_until_efrro_expiry: daysUntilEfrro,
        compliance_score: complianceScore,
        compliance_status: overallCompliance
      });

      // 8.5. Insert into student_bank_details table if bank details provided
      let bankData: Record<string, unknown> | null = null;
      const bankNameVal = (input.bankName || input.bankDetails?.bankName)?.trim() || null;
      const accountNumVal = (input.accountNumber || input.bankDetails?.accountNumber)?.trim() || null;
      const ifscVal = (input.ifscCode || input.bankDetails?.ifscCode)?.trim() || null;
      const branchAddrVal = (input.branchAddress || input.bankDetails?.branchAddress)?.trim() || null;

      if (bankNameVal || accountNumVal || ifscVal || branchAddrVal) {
        const { data: insertedBank } = await supabase
          .from("student_bank_details")
          .insert({
            student_id: studentId,
            bank_name: bankNameVal,
            account_number: accountNumVal,
            ifsc_code: ifscVal,
            branch_address: branchAddrVal
          })
          .select()
          .maybeSingle();
        bankData = insertedBank;
      }

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
          fatherEmail: personalData.father_email || null,
          motherName: personalData.mother_name || null,
          motherMobile: personalData.mother_mobile || null,
          motherMobileCountryCode: personalData.mother_mobile_country_code || null,
          motherMobileNumber: personalData.mother_mobile_number || null,
          motherWhatsapp: personalData.mother_whatsapp || null,
          motherWhatsappCountryCode: personalData.mother_whatsapp_country_code || null,
          motherWhatsappNumber: personalData.mother_whatsapp_number || null,
          motherEmail: personalData.mother_email || null,
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
          presentAddress: contactData.present_address || contactData.local_address || null,
          localAddress: contactData.local_address || contactData.present_address || null,
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
          joiningDate: academicData.joining_date ? new Date(academicData.joining_date) : null,
          expectedGraduation: academicData.expected_graduation ? new Date(academicData.expected_graduation) : null,
          currentSemester: academicData.current_semester,
          academicStatus: academicData.academic_status,
          admissionCategory: academicData.admission_category || null,
          admissionCategoryOther: academicData.admission_category_other || null,
          siiApplicationNumber: academicData.sii_application_number || null,
          iccrApplicationNumber: academicData.iccr_application_number || null,
          iccrScholarshipSchemeName: academicData.iccr_scholarship_scheme_name || null,
          scholarshipSchemeName: academicData.iccr_scholarship_scheme_name || null,
          nfsuCampus: academicData.nfsu_campus || null,
          admissionAcademicYear: academicData.admission_academic_year || null,
          feePaymentCategory: academicData.fee_payment_category || null,
          tuitionFeeAmount: academicData.tuition_fee_amount !== null && academicData.tuition_fee_amount !== undefined ? Number(academicData.tuition_fee_amount) : null,
          tuitionFeeCurrency: academicData.tuition_fee_currency || null,
          hostelFeeAmount: academicData.hostel_fee_amount !== null && academicData.hostel_fee_amount !== undefined ? Number(academicData.hostel_fee_amount) : null,
          hostelFeeCurrency: academicData.hostel_fee_currency || null,
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
        } : null,
        bankDetails: bankData ? {
          id: bankData.id as string,
          studentId: bankData.student_id as string,
          bankName: (bankData.bank_name as string) || null,
          accountNumber: (bankData.account_number as string) || null,
          ifscCode: (bankData.ifsc_code as string) || null,
          branchAddress: (bankData.branch_address as string) || null,
          createdAt: bankData.created_at ? new Date(bankData.created_at as string) : undefined,
          updatedAt: bankData.updated_at ? new Date(bankData.updated_at as string) : undefined,
          deletedAt: bankData.deleted_at ? new Date(bankData.deleted_at as string) : null
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
        student_embassy(*),
        student_bank_details(*)
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
    const bank = student.student_bank_details?.[0] || student.student_bank_details || null;

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
        fatherEmail: personal?.father_email || null,
        motherName: personal?.mother_name || null,
        motherMobile: personal?.mother_mobile || null,
        motherMobileCountryCode: personal?.mother_mobile_country_code || null,
        motherMobileNumber: personal?.mother_mobile_number || null,
        motherWhatsapp: personal?.mother_whatsapp || null,
        motherWhatsappCountryCode: personal?.mother_whatsapp_country_code || null,
        motherWhatsappNumber: personal?.mother_whatsapp_number || null,
        motherEmail: personal?.mother_email || null,
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
        presentAddress: contact?.present_address || contact?.local_address || null,
        localAddress: contact?.local_address || contact?.present_address || null,
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
        joiningDate: academic?.joining_date ? new Date(academic.joining_date) : null,
        expectedGraduation: academic?.expected_graduation ? new Date(academic.expected_graduation) : null,
        currentSemester: academic?.current_semester ?? null,
        academicStatus: academic?.academic_status || "good_standing",
        admissionCategory: academic?.admission_category || null,
        lastEducationalQualification: academic?.last_educational_qualification || null,
        lastEducationalInstitution: academic?.last_educational_institution || null,
        admissionCategoryOther: academic?.admission_category_other || null,
        siiApplicationNumber: academic?.sii_application_number || null,
        iccrApplicationNumber: academic?.iccr_application_number || null,
        iccrScholarshipSchemeName: academic?.iccr_scholarship_scheme_name || null,
        scholarshipSchemeName: academic?.iccr_scholarship_scheme_name || null,
        nfsuCampus: academic?.nfsu_campus || null,
        admissionAcademicYear: academic?.admission_academic_year || null,
        feePaymentCategory: academic?.fee_payment_category || null,
        tuitionFeeAmount: academic?.tuition_fee_amount !== null && academic?.tuition_fee_amount !== undefined ? Number(academic.tuition_fee_amount) : null,
        tuitionFeeCurrency: academic?.tuition_fee_currency || null,
        hostelFeeAmount: academic?.hostel_fee_amount !== null && academic?.hostel_fee_amount !== undefined ? Number(academic.hostel_fee_amount) : null,
        hostelFeeCurrency: academic?.hostel_fee_currency || null,
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
      } : null,
      bankDetails: bank ? {
        id: bank.id,
        studentId: bank.student_id,
        bankName: bank.bank_name || null,
        accountNumber: bank.account_number || null,
        ifscCode: bank.ifsc_code || null,
        branchAddress: bank.branch_address || null,
        createdAt: bank.created_at ? new Date(bank.created_at) : undefined,
        updatedAt: bank.updated_at ? new Date(bank.updated_at) : undefined,
        deletedAt: bank.deleted_at ? new Date(bank.deleted_at) : null
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
        ? (normalizeCountryInputSync(input.nationalityCode)?.isoAlpha3 || input.nationalityCode.trim().toUpperCase())
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
    if (input.fatherEmail !== undefined) personalUpdates.father_email = input.fatherEmail && input.fatherEmail.trim() ? input.fatherEmail.trim().toLowerCase() : null;
    if (input.motherName !== undefined) personalUpdates.mother_name = input.motherName ? input.motherName.trim() : null;
    if (input.motherMobile !== undefined) personalUpdates.mother_mobile = input.motherMobile ? input.motherMobile.trim() : null;
    if (input.motherMobileCountryCode !== undefined) personalUpdates.mother_mobile_country_code = input.motherMobileCountryCode ? input.motherMobileCountryCode.trim() : null;
    if (input.motherMobileNumber !== undefined) personalUpdates.mother_mobile_number = input.motherMobileNumber ? input.motherMobileNumber.trim() : null;
    if (input.motherWhatsapp !== undefined) personalUpdates.mother_whatsapp = input.motherWhatsapp ? input.motherWhatsapp.trim() : null;
    if (input.motherWhatsappCountryCode !== undefined) personalUpdates.mother_whatsapp_country_code = input.motherWhatsappCountryCode ? input.motherWhatsappCountryCode.trim() : null;
    if (input.motherWhatsappNumber !== undefined) personalUpdates.mother_whatsapp_number = input.motherWhatsappNumber ? input.motherWhatsappNumber.trim() : null;
    if (input.motherEmail !== undefined) personalUpdates.mother_email = input.motherEmail && input.motherEmail.trim() ? input.motherEmail.trim().toLowerCase() : null;

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
    if (input.presentAddress !== undefined) {
      const pVal = input.presentAddress && input.presentAddress.trim() ? input.presentAddress.trim() : null;
      contactUpdates.present_address = pVal;
      contactUpdates.local_address = pVal;
    } else if (input.localAddress !== undefined) {
      const lVal = input.localAddress && input.localAddress.trim() ? input.localAddress.trim() : null;
      contactUpdates.local_address = lVal;
      contactUpdates.present_address = lVal;
    }
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
    if (input.joiningDate !== undefined) academicUpdates.joining_date = this.formatDate(input.joiningDate);
    if (input.expectedGraduation !== undefined) academicUpdates.expected_graduation = this.formatDate(input.expectedGraduation);
    if (input.academicStatus) academicUpdates.academic_status = input.academicStatus;
    if (input.admissionCategory !== undefined) {
      academicUpdates.admission_category = input.admissionCategory || null;
    }
    if (input.iccrApplicationNumber !== undefined) {
      academicUpdates.iccr_application_number = input.iccrApplicationNumber ? input.iccrApplicationNumber.trim() : null;
    }
    if (input.iccrScholarshipSchemeName !== undefined || input.scholarshipSchemeName !== undefined) {
      const schemeVal = input.scholarshipSchemeName !== undefined ? input.scholarshipSchemeName : input.iccrScholarshipSchemeName;
      academicUpdates.iccr_scholarship_scheme_name = schemeVal ? schemeVal.trim() : null;
    }
    if (input.siiApplicationNumber !== undefined) {
      academicUpdates.sii_application_number = input.siiApplicationNumber ? input.siiApplicationNumber.trim() : null;
    }
    if (input.nfsuCampus !== undefined) {
      const rawCampus = input.nfsuCampus ? input.nfsuCampus.trim() : null;
      academicUpdates.nfsu_campus = rawCampus && rawCampus.toLowerCase() === "gandhinagar"
        ? "Gandhinagar Headquarter"
        : rawCampus;
    }
    if (input.admissionAcademicYear !== undefined) {
      academicUpdates.admission_academic_year = input.admissionAcademicYear ? input.admissionAcademicYear.trim() : null;
    }
    if (input.feePaymentCategory !== undefined) {
      academicUpdates.fee_payment_category = input.feePaymentCategory || null;
    }
    if (input.tuitionFeeAmount !== undefined) {
      academicUpdates.tuition_fee_amount = input.tuitionFeeAmount !== null ? input.tuitionFeeAmount : null;
    }
    if (input.tuitionFeeCurrency !== undefined) {
      academicUpdates.tuition_fee_currency = input.tuitionFeeCurrency || null;
    }
    if (input.hostelFeeAmount !== undefined) {
      academicUpdates.hostel_fee_amount = input.hostelFeeAmount !== null ? input.hostelFeeAmount : null;
    }
    if (input.hostelFeeCurrency !== undefined) {
      academicUpdates.hostel_fee_currency = input.hostelFeeCurrency || null;
    }
    if (input.admissionCategoryOther !== undefined) academicUpdates.admission_category_other = input.admissionCategoryOther ? input.admissionCategoryOther.trim() : null;
    if (input.lastEducationalQualification !== undefined) {
      academicUpdates.last_educational_qualification = input.lastEducationalQualification ? input.lastEducationalQualification.trim() : null;
    }
    if (input.lastEducationalInstitution !== undefined) {
      academicUpdates.last_educational_institution = input.lastEducationalInstitution ? input.lastEducationalInstitution.trim() : null;
    }
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

      const hasAnyMeaningfulValue = Boolean(
        (input.embassyName !== undefined && input.embassyName && input.embassyName.trim()) ||
        (input.embassyAddress !== undefined && input.embassyAddress && input.embassyAddress.trim()) ||
        (input.embassyCity !== undefined && input.embassyCity && input.embassyCity.trim()) ||
        (input.embassyCountry !== undefined && input.embassyCountry && input.embassyCountry.trim()) ||
        (input.embassyPhone !== undefined && input.embassyPhone && input.embassyPhone.trim()) ||
        (input.embassyEmail !== undefined && input.embassyEmail && input.embassyEmail.trim()) ||
        (input.embassyWebsite !== undefined && input.embassyWebsite && input.embassyWebsite.trim()) ||
        (input.embassyContactPerson !== undefined && input.embassyContactPerson && input.embassyContactPerson.trim())
      );

      // If existingEmbassy exists and all provided embassy fields are cleared/empty
      if (existingEmbassy && !hasAnyMeaningfulValue) {
        await supabase
          .from("student_embassy")
          .delete()
          .eq("student_id", id);
      } else if (existingEmbassy) {
        const embassyPayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          updated_by: actorId
        };
        if (input.embassyName !== undefined) embassyPayload.embassy_name = input.embassyName && input.embassyName.trim() ? input.embassyName.trim() : "Not Specified";
        if (input.embassyAddress !== undefined) embassyPayload.address = input.embassyAddress && input.embassyAddress.trim() ? input.embassyAddress.trim() : "Not Specified";
        if (input.embassyCity !== undefined) embassyPayload.city = input.embassyCity && input.embassyCity.trim() ? input.embassyCity.trim() : null;
        if (input.embassyCountry !== undefined) embassyPayload.country = input.embassyCountry && input.embassyCountry.trim() ? input.embassyCountry.trim() : null;
        if (input.embassyPhone !== undefined) embassyPayload.phone = input.embassyPhone && input.embassyPhone.trim() ? input.embassyPhone.trim() : null;
        if (input.embassyEmail !== undefined) embassyPayload.email = input.embassyEmail && input.embassyEmail.trim() ? input.embassyEmail.trim().toLowerCase() : null;
        if (input.embassyWebsite !== undefined) embassyPayload.website = input.embassyWebsite && input.embassyWebsite.trim() ? input.embassyWebsite.trim() : null;
        if (input.embassyContactPerson !== undefined) embassyPayload.contact_person = input.embassyContactPerson && input.embassyContactPerson.trim() ? input.embassyContactPerson.trim() : null;

        await supabase
          .from("student_embassy")
          .update(embassyPayload)
          .eq("student_id", id);
      } else if (hasAnyMeaningfulValue) {
        await supabase
          .from("student_embassy")
          .insert({
            student_id: id,
            embassy_name: input.embassyName && input.embassyName.trim() ? input.embassyName.trim() : "Not Specified",
            address: input.embassyAddress && input.embassyAddress.trim() ? input.embassyAddress.trim() : "Not Specified",
            city: input.embassyCity && input.embassyCity.trim() ? input.embassyCity.trim() : null,
            country: input.embassyCountry && input.embassyCountry.trim() ? input.embassyCountry.trim() : null,
            phone: input.embassyPhone && input.embassyPhone.trim() ? input.embassyPhone.trim() : null,
            email: input.embassyEmail && input.embassyEmail.trim() ? input.embassyEmail.trim().toLowerCase() : null,
            website: input.embassyWebsite && input.embassyWebsite.trim() ? input.embassyWebsite.trim() : null,
            contact_person: input.embassyContactPerson && input.embassyContactPerson.trim() ? input.embassyContactPerson.trim() : null,
            created_by: actorId,
            updated_by: actorId
          });
      }
    }

    // 5.5. Update or Upsert student_bank_details table
    const hasBankInputs =
      input.bankName !== undefined ||
      input.accountNumber !== undefined ||
      input.ifscCode !== undefined ||
      input.branchAddress !== undefined ||
      input.bankDetails !== undefined;

    if (hasBankInputs) {
      const bankNameVal = input.bankName !== undefined 
        ? (input.bankName ? input.bankName.trim() : null) 
        : (input.bankDetails?.bankName ? input.bankDetails.bankName.trim() : (input.bankDetails !== undefined ? null : undefined));
      const accountNumVal = input.accountNumber !== undefined 
        ? (input.accountNumber ? input.accountNumber.trim() : null) 
        : (input.bankDetails?.accountNumber ? input.bankDetails.accountNumber.trim() : (input.bankDetails !== undefined ? null : undefined));
      const ifscVal = input.ifscCode !== undefined 
        ? (input.ifscCode ? input.ifscCode.trim() : null) 
        : (input.bankDetails?.ifscCode ? input.bankDetails.ifscCode.trim() : (input.bankDetails !== undefined ? null : undefined));
      const branchAddrVal = input.branchAddress !== undefined 
        ? (input.branchAddress ? input.branchAddress.trim() : null) 
        : (input.bankDetails?.branchAddress ? input.bankDetails.branchAddress.trim() : (input.bankDetails !== undefined ? null : undefined));

      const { data: existingBank } = await supabase
        .from("student_bank_details")
        .select("id")
        .eq("student_id", id)
        .maybeSingle();

      const bankPayload: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      if (bankNameVal !== undefined) bankPayload.bank_name = bankNameVal;
      if (accountNumVal !== undefined) bankPayload.account_number = accountNumVal;
      if (ifscVal !== undefined) bankPayload.ifsc_code = ifscVal;
      if (branchAddrVal !== undefined) bankPayload.branch_address = branchAddrVal;

      if (existingBank) {
        if (Object.keys(bankPayload).length > 1) {
          await supabase
            .from("student_bank_details")
            .update(bankPayload)
            .eq("student_id", id);
        }
      } else if (bankNameVal || accountNumVal || ifscVal || branchAddrVal) {
        await supabase
          .from("student_bank_details")
          .insert({
            student_id: id,
            bank_name: bankNameVal || null,
            account_number: accountNumVal || null,
            ifsc_code: ifscVal || null,
            branch_address: branchAddrVal || null
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
        student_embassy(*),
        student_bank_details(*)
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
      const bank = student.student_bank_details?.[0] || student.student_bank_details || null;

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
            joiningDate: academic.joining_date ? new Date(academic.joining_date) : null,
            expectedGraduation: new Date(academic.expected_graduation),
            currentSemester: academic.current_semester,
            academicStatus: academic.academic_status,
            scholarshipSchemeName: academic.iccr_scholarship_scheme_name || null,
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
          } : null,
          bankDetails: bank ? {
            id: bank.id,
            studentId: bank.student_id,
            bankName: bank.bank_name || null,
            accountNumber: bank.account_number || null,
            ifscCode: bank.ifsc_code || null,
            branchAddress: bank.branch_address || null,
            createdAt: bank.created_at ? new Date(bank.created_at) : undefined,
            updatedAt: bank.updated_at ? new Date(bank.updated_at) : undefined,
            deletedAt: bank.deleted_at ? new Date(bank.deleted_at) : null
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
      supabase.from("student_bank_details").update({ deleted_at: now, updated_at: now }).eq("student_id", id),
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
