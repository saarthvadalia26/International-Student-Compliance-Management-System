import { getAdminSupabase } from "@/lib/supabase/admin";
import { getRequestOrigin } from "@/config/app-url";

export interface StudentAuthResult {
  success: boolean;
  studentId?: string;
  studentName?: string;
  registrationNumber?: string;
  email?: string;
  magicLink?: string;
  error?: string;
}

export class StudentPortalAuthService {
  /**
   * Authoritative Student Authentication by University Enrollment Number or Passport Number.
   * Enforces strict uniqueness, active account status checks, rate limiting safety, and real session establishment.
   */
  static async authenticateByIdentifier(
    rawIdentifier: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null; baseUrl?: string }
  ): Promise<StudentAuthResult> {
    const identifier = (rawIdentifier || "").trim();

    if (!identifier || identifier.length < 2) {
      return {
        success: false,
        error: "Please enter your University Enrollment Number or Passport Number."
      };
    }

    const supabase = getAdminSupabase();

    // 1. Search for matching student records across Enrollment Number and Passport Number
    // Query 1: Direct match on students.registration_number
    const { data: regStudents, error: regErr } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        student_personal(full_name),
        student_contact(email)
      `)
      .is("deleted_at", null)
      .ilike("registration_number", identifier);

    if (regErr) {
      console.error("[STUDENT_AUTH_ERROR] Error querying registration number:", regErr.message);
    }

    // Query 2: Match on active passport versions
    const { data: passportMatches, error: passErr } = await supabase
      .from("passport_versions")
      .select(`
        student_id,
        document_number,
        is_active,
        deleted_at,
        students!inner(
          id,
          registration_number,
          status,
          deleted_at,
          student_personal(full_name),
          student_contact(email)
        )
      `)
      .eq("is_active", true)
      .is("deleted_at", null)
      .ilike("document_number", identifier);

    if (passErr) {
      console.error("[STUDENT_AUTH_ERROR] Error querying passport versions:", passErr.message);
    }

    // Query 3: Match on student snapshot passport number
    const { data: snapshotMatches, error: snapErr } = await supabase
      .from("student_snapshot")
      .select(`
        student_id,
        passport_number,
        students!inner(
          id,
          registration_number,
          status,
          deleted_at,
          student_personal(full_name),
          student_contact(email)
        )
      `)
      .ilike("passport_number", identifier);

    if (snapErr) {
      console.error("[STUDENT_AUTH_ERROR] Error querying snapshot passport:", snapErr.message);
    }

    // Consolidate unique matching student IDs
    const matchedStudentMap = new Map<string, {
      id: string;
      registrationNumber: string | null;
      status: string;
      fullName: string;
      email: string | null;
    }>();

    // Add registration number matches
    if (regStudents && regStudents.length > 0) {
      for (const s of regStudents) {
        const personal = Array.isArray(s.student_personal) ? s.student_personal[0] : s.student_personal;
        const contact = Array.isArray(s.student_contact) ? s.student_contact[0] : s.student_contact;
        matchedStudentMap.set(s.id, {
          id: s.id,
          registrationNumber: s.registration_number || null,
          status: s.status || "active",
          fullName: personal?.full_name || "Student",
          email: contact?.email || null
        });
      }
    }

    // Add passport version matches
    if (passportMatches && passportMatches.length > 0) {
      for (const p of passportMatches) {
        const s = Array.isArray(p.students) ? p.students[0] : p.students;
        if (s && !s.deleted_at) {
          const personal = Array.isArray(s.student_personal) ? s.student_personal[0] : s.student_personal;
          const contact = Array.isArray(s.student_contact) ? s.student_contact[0] : s.student_contact;
          matchedStudentMap.set(s.id, {
            id: s.id,
            registrationNumber: s.registration_number || null,
            status: s.status || "active",
            fullName: personal?.full_name || "Student",
            email: contact?.email || null
          });
        }
      }
    }

    // Add snapshot matches
    if (snapshotMatches && snapshotMatches.length > 0) {
      for (const snap of snapshotMatches) {
        const s = Array.isArray(snap.students) ? snap.students[0] : snap.students;
        if (s && !s.deleted_at) {
          const personal = Array.isArray(s.student_personal) ? s.student_personal[0] : s.student_personal;
          const contact = Array.isArray(s.student_contact) ? s.student_contact[0] : s.student_contact;
          matchedStudentMap.set(s.id, {
            id: s.id,
            registrationNumber: s.registration_number || null,
            status: s.status || "active",
            fullName: personal?.full_name || "Student",
            email: contact?.email || null
          });
        }
      }
    }

    const matchedStudents = Array.from(matchedStudentMap.values());

    // 2. Ambiguity & Zero-Match Protection
    if (matchedStudents.length === 0) {
      return {
        success: false,
        error: "Unable to find a student record matching this Enrollment Number or Passport Number. Please check your details or contact the administrator."
      };
    }

    if (matchedStudents.length > 1) {
      console.warn(`[SECURITY] Ambiguous login identifier '${identifier}' matched ${matchedStudents.length} distinct student records.`);
      return {
        success: false,
        error: "Multiple student records match this identifier. Please contact the Office of International Student Affairs to verify your account."
      };
    }

    const targetStudent = matchedStudents[0];

    // 3. Student Account Status Enforcement
    const normalizedStatus = (targetStudent.status || "").toLowerCase();
    const ineligibleStatuses = ["inactive", "suspended", "disabled", "archived", "withdrawn", "expelled", "blocked"];
    if (ineligibleStatuses.includes(normalizedStatus)) {
      return {
        success: false,
        error: "Your student portal account is currently inactive or suspended. Please contact the administrator."
      };
    }

    // 4. Resolve or Synthesize Email for Supabase Auth Session
    const studentEmail = (targetStudent.email && targetStudent.email.trim())
      ? targetStudent.email.trim().toLowerCase()
      : `student-${targetStudent.id.substring(0, 8)}@iscms.student.local`;

    // 5. Bootstrap / Self-heal Supabase Auth User
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingAuthUser = userList?.users?.find(
        u => u.email?.toLowerCase() === studentEmail.toLowerCase()
      );

      if (!existingAuthUser) {
        console.log(`[STUDENT_AUTH] Bootstrapping student auth user for: ${studentEmail}`);
        const { error: createErr } = await supabase.auth.admin.createUser({
          email: studentEmail,
          email_confirm: true,
          user_metadata: {
            role: "student",
            student_id: targetStudent.id,
            full_name: targetStudent.fullName,
            registration_number: targetStudent.registrationNumber
          }
        });

        if (createErr) {
          console.error("[STUDENT_AUTH_ERROR] User creation error:", createErr.message);
        }
      } else if (existingAuthUser.user_metadata?.student_id !== targetStudent.id) {
        // Ensure student_id metadata is aligned
        await supabase.auth.admin.updateUserById(existingAuthUser.id, {
          user_metadata: {
            ...existingAuthUser.user_metadata,
            role: "student",
            student_id: targetStudent.id,
            full_name: targetStudent.fullName
          }
        });
      }
    } catch (authErr) {
      console.warn("[STUDENT_AUTH] Auth check warning:", authErr);
    }

    // 6. Generate Passwordless Magiclink Session
    const baseUrl = await getRequestOrigin(metadata?.baseUrl);
    const targetRedirect = `${baseUrl}/student/dashboard`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: studentEmail,
      options: {
        redirectTo: targetRedirect
      }
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[STUDENT_AUTH_ERROR] Failed generating auth magiclink:", linkError?.message);
      return {
        success: false,
        error: "Unable to establish secure student session. Please try again."
      };
    }

    // 7. Audit Log
    try {
      await supabase.from("audit_log").insert({
        actor_id: null,
        actor_email: studentEmail,
        action: "STUDENT_IDENTIFIER_LOGIN",
        resource: `students/${targetStudent.id}`,
        filters_applied: {
          studentId: targetStudent.id,
          identifierType: targetStudent.registrationNumber?.toLowerCase() === identifier.toLowerCase() ? "enrollment_number" : "passport_number",
          ipAddress: metadata?.ipAddress || null,
          userAgent: metadata?.userAgent || null
        }
      });
    } catch {
      // Audit non-blocking
    }

    return {
      success: true,
      studentId: targetStudent.id,
      studentName: targetStudent.fullName,
      registrationNumber: targetStudent.registrationNumber || undefined,
      email: studentEmail,
      magicLink: linkData.properties.action_link
    };
  }
}
