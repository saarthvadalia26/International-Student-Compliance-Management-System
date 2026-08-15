import { getAdminSupabase } from "@/lib/supabase/admin";
import { 
  FullStudentProfile, 
  RegisterStudentInput, 
  UpdateStudentInput, 
  StudentFilterOptions
} from "./student.types";

export interface IStudentRepository {
  createStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  getStudentById(id: string): Promise<FullStudentProfile | null>;
  getStudentByRegistrationNumber(regNum: string): Promise<FullStudentProfile | null>;
  updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]>;
  softDeleteStudent(id: string, actorId: string | null): Promise<boolean>;
}

interface RelationshipRow {
  id: string;
  student_id: string;
  relationship_type: "parent" | "guardian" | "local_sponsor";
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
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .insert({
        registration_number: input.registrationNumber.trim(),
        status: "active",
        created_by: actorId,
        updated_by: actorId
      })
      .select()
      .single();

    if (studentError || !studentData) {
      if (studentError?.code === "23505") {
        throw new Error(`Student with registration number "${input.registrationNumber}" already exists.`);
      }
      throw new Error(`Failed to create core student record: ${studentError?.message || "Unknown database error"}`);
    }

    const studentId = studentData.id;

    try {
      // 2. Insert into student_personal table
      const dobFormatted = this.formatDate(input.dateOfBirth);
      const { data: personalData, error: personalError } = await supabase
        .from("student_personal")
        .insert({
          student_id: studentId,
          full_name: input.fullName.trim(),
          nationality_code: input.nationalityCode.trim().toUpperCase(),
          gender: input.gender || "prefer_not_to_say",
          date_of_birth: dobFormatted,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (personalError || !personalData) {
        throw new Error(`Failed to create personal identity record: ${personalError?.message || "Unknown database error"}`);
      }

      // 3. Insert into student_contact table
      const { data: contactData, error: contactError } = await supabase
        .from("student_contact")
        .insert({
          student_id: studentId,
          email: input.email.trim().toLowerCase(),
          phone_home: input.phoneHome.trim(),
          phone_local: input.phoneLocal?.trim() || null,
          permanent_address: input.permanentAddress.trim(),
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

      // 4. Insert into student_academic table
      const admFormatted = this.formatDate(input.admissionDate);
      const expGradFormatted = this.formatDate(input.expectedGraduation);
      const { data: academicData, error: academicError } = await supabase
        .from("student_academic")
        .insert({
          student_id: studentId,
          program_code: input.programCode.trim(),
          admission_date: admFormatted,
          expected_graduation: expGradFormatted,
          current_semester: input.currentSemester || 1,
          academic_status: "good_standing",
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (academicError || !academicData) {
        throw new Error(`Failed to create academic record: ${academicError?.message || "Unknown database error"}`);
      }

      // 5. Insert into student_relationships table (Emergency Contact)
      const { data: relData, error: relError } = await supabase
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

      if (relError || !relData) {
        console.warn("[STUDENT_REPOSITORY] Warning: Failed to insert emergency contact:", relError);
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

      // 7. Student Snapshot initialization (Stores metadata; document status is NOT_UPLOADED / MISSING until physical file is uploaded)
      const passportExp = this.formatDate(input.passportExpiry);
      const visaExp = this.formatDate(input.visaExpiry);

      // 8. Insert student_snapshot row for instant compliance and directory queries
      // Note: Entering passport/visa metadata numbers does NOT mean a document is uploaded or pending verification.
      await supabase.from("student_snapshot").insert({
        student_id: studentId,
        passport_status: "MISSING",
        passport_expiry: passportExp,
        passport_number: input.passportNumber?.trim() || null,
        visa_status: "MISSING",
        visa_expiry: visaExp,
        visa_number: input.visaNumber?.trim() || null,
        efrro_status: "MISSING",
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
          dateOfBirth: new Date(personalData.date_of_birth),
          bloodGroup: personalData.blood_group,
          religion: personalData.religion,
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
          admissionDate: new Date(academicData.admission_date),
          expectedGraduation: new Date(academicData.expected_graduation),
          currentSemester: academicData.current_semester,
          academicStatus: academicData.academic_status,
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

    if (!personal || !contact || !academic) {
      return null;
    }

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

    // 1. Update students table if status provided
    if (input.status) {
      await supabase
        .from("students")
        .update({
          status: input.status,
          updated_at: new Date().toISOString(),
          updated_by: actorId
        })
        .eq("id", id);
    }

    // 2. Update student_personal table if personal fields provided
    const personalUpdates: Record<string, unknown> = {};
    if (input.fullName) personalUpdates.full_name = input.fullName.trim();
    if (input.gender) personalUpdates.gender = input.gender;
    if (input.dateOfBirth) personalUpdates.date_of_birth = this.formatDate(input.dateOfBirth);
    if (Object.keys(personalUpdates).length > 0) {
      personalUpdates.updated_at = new Date().toISOString();
      personalUpdates.updated_by = actorId;
      await supabase.from("student_personal").update(personalUpdates).eq("student_id", id);
    }

    // 3. Update student_contact table if contact fields provided
    const contactUpdates: Record<string, unknown> = {};
    if (input.email) contactUpdates.email = input.email.trim().toLowerCase();
    if (input.phoneHome) contactUpdates.phone_home = input.phoneHome.trim();
    if (input.phoneLocal !== undefined) contactUpdates.phone_local = input.phoneLocal ? input.phoneLocal.trim() : null;
    if (input.permanentAddress) contactUpdates.permanent_address = input.permanentAddress.trim();
    if (input.localAddress !== undefined) contactUpdates.local_address = input.localAddress ? input.localAddress.trim() : null;
    if (Object.keys(contactUpdates).length > 0) {
      contactUpdates.updated_at = new Date().toISOString();
      contactUpdates.updated_by = actorId;
      await supabase.from("student_contact").update(contactUpdates).eq("student_id", id);
    }

    // 4. Update student_academic table if academic fields provided
    const academicUpdates: Record<string, unknown> = {};
    if (input.programCode) academicUpdates.program_code = input.programCode.trim();
    if (input.currentSemester) academicUpdates.current_semester = input.currentSemester;
    if (input.academicStatus) academicUpdates.academic_status = input.academicStatus;
    if (Object.keys(academicUpdates).length > 0) {
      academicUpdates.updated_at = new Date().toISOString();
      academicUpdates.updated_by = actorId;
      await supabase.from("student_academic").update(academicUpdates).eq("student_id", id);
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
      if (input.embassyName !== undefined) embassyPayload.embassy_name = input.embassyName.trim();
      if (input.embassyAddress !== undefined) embassyPayload.address = input.embassyAddress.trim();
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
}
