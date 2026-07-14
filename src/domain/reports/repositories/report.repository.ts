import { getAdminSupabase } from "@/lib/supabase/admin";
import { 
  ReportFilters, 
  ReportPagination, 
  StudentReportRow, 
  EfrroReportRow, 
  NotificationReportRow, 
  AuditReportRow, 
  DashboardMetrics,
  PaginatedResult
} from "../types";
import { ReportMapper } from "../mappers";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";

// =========================================================================
// Reusable Select Fragments (Canonical Table Hierarchy: students as Root)
// =========================================================================
const STUDENT_FIELDS = `
  id,
  registration_number,
  status
`;

const SNAPSHOT_FIELDS = `
  student_snapshot!inner(
    compliance_status,
    passport_number,
    visa_number,
    efrro_number
  )
`;

const EFRRO_SNAPSHOT_FIELDS = `
  student_snapshot!inner(
    efrro_status,
    efrro_expiry,
    efrro_number,
    days_until_efrro_expiry
  )
`;

const PERSONAL_FIELDS = `
  student_personal!inner(
    full_name,
    nationality_code,
    gender
  )
`;

const ACADEMIC_FIELDS = `
  student_academic(
    program_code,
    expected_graduation
  )
`;

const CONTACT_FIELDS = `
  student_contact(
    email,
    phone_home,
    phone_local
  )
`;

export interface IReportRepository {
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getStudentReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<StudentReportRow>>;
  getEfrroReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<EfrroReportRow>>;
  getNotificationReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<NotificationReportRow>>;
  getAuditReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<AuditReportRow>>;
  logAudit(log: Omit<AuditReportRow, "id" | "timestamp">): Promise<void>;
}

export class SupabaseReportRepository implements IReportRepository {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const supabase = getAdminSupabase();

    console.log("[REPORT_REPOSITORY] Querying metrics for operational dashboard...");
    
    // Execute dashboard count queries in parallel for efficiency
    const [
      totalRes,
      compliantRes,
      expiring30Res,
      expiring15Res,
      expiredRes,
      pendingEfrroRes,
      sentTodayRes,
      failedTodayRes,
      passportPendingRes,
      visaPendingRes,
      efrroPendingRes
    ] = await Promise.all([
      // Total active students
      supabase.from("student_snapshot").select("student_id", { count: "exact", head: true }),
      // Fully compliant (Passport, Visa, and eFRRO are COMPLIANT)
      supabase.from("student_snapshot").select("student_id", { count: "exact", head: true })
        .eq("compliance_status", "COMPLIANT"),
      // eFRRO Expiring (30 days)
      supabase.from("student_snapshot").select("student_id", { count: "exact", head: true })
        .eq("efrro_status", "WARNING")
        .lte("days_until_efrro_expiry", 30)
        .gt("days_until_efrro_expiry", 15),
      // eFRRO Expiring (15 days)
      supabase.from("student_snapshot").select("student_id", { count: "exact", head: true })
        .eq("efrro_status", "WARNING")
        .lte("days_until_efrro_expiry", 15)
        .gt("days_until_efrro_expiry", 0),
      // eFRRO Expired
      supabase.from("student_snapshot").select("student_id", { count: "exact", head: true })
        .eq("efrro_status", "EXPIRED"),
      // Pending eFRRO Verification
      supabase.from("student_snapshot").select("student_id", { count: "exact", head: true })
        .eq("efrro_status", "PENDING_VERIFICATION"),
      // Notifications Sent Today
      supabase.from(NOTIFICATION_TABLE_NAME).select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      // Notifications Failed Today
      supabase.from(NOTIFICATION_TABLE_NAME).select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      // Pending reviews for Passport, Visa, and eFRRO active versions
      supabase.from("passport_versions").select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("verification_status", "pending")
        .is("deleted_at", null),
      supabase.from("visa_versions").select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("verification_status", "pending")
        .is("deleted_at", null),
      supabase.from("efrro_versions").select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("verification_status", "pending")
        .is("deleted_at", null)
    ]);

    const totalStudents = totalRes.count || 0;
    const fullyCompliant = compliantRes.count || 0;
    const expiring30 = expiring30Res.count || 0;
    const expiring15 = expiring15Res.count || 0;
    const expired = expiredRes.count || 0;
    const pendingEfrro = pendingEfrroRes.count || 0;
    const sentToday = sentTodayRes.count || 0;
    const failedToday = failedTodayRes.count || 0;
    const passportPending = passportPendingRes.count || 0;
    const visaPending = visaPendingRes.count || 0;
    const efrroPending = efrroPendingRes.count || 0;

    return {
      totalStudents,
      fullyCompliantStudents: fullyCompliant,
      efrroExpiring30Days: expiring30,
      efrroExpiring15Days: expiring15,
      efrroExpired: expired,
      pendingEfrroVerification: pendingEfrro,
      notificationsSentToday: sentToday,
      failedNotificationsToday: failedToday,
      pendingUploadReviews: passportPending + visaPending + efrroPending
    };
  }

  async getStudentReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    sortBy: string = "full_name",
    sortOrder: "asc" | "desc" = "asc"
  ): Promise<PaginatedResult<StudentReportRow>> {
    const supabase = getAdminSupabase();
    console.log(`[REPORT_REPOSITORY] Querying student report page: ${pagination.page}, limit: ${pagination.limit}`);

    // Build the query starting from students and inner joining child relations
    let query = supabase
      .from("students")
      .select(`
        ${STUDENT_FIELDS},
        ${SNAPSHOT_FIELDS},
        ${PERSONAL_FIELDS},
        ${ACADEMIC_FIELDS},
        ${CONTACT_FIELDS}
      `, { count: "exact" });

    // Apply filters
    if (filters.complianceStatus) {
      query = query.eq("student_snapshot.compliance_status", filters.complianceStatus);
    }
    if (filters.country) {
      query = query.eq("student_personal.nationality_code", filters.country);
    }
    if (filters.gender) {
      query = query.eq("student_personal.gender", filters.gender);
    }
    if (filters.school || filters.course) {
      if (filters.course) {
        query = query.eq("student_academic.program_code", filters.course);
      }
    }

    // Apply global search matching multiple columns
    if (filters.search) {
      const searchVal = `%${filters.search}%`;
      query = query.or(
        `student_snapshot.passport_number.ilike.${searchVal},` +
        `student_snapshot.visa_number.ilike.${searchVal},` +
        `student_snapshot.efrro_number.ilike.${searchVal},` +
        `registration_number.ilike.${searchVal},` +
        `student_personal.full_name.ilike.${searchVal},` +
        `student_contact.email.ilike.${searchVal},` +
        `student_contact.phone_home.ilike.${searchVal},` +
        `student_contact.phone_local.ilike.${searchVal}`
      );
    }

    // Handle sort parameters using standard syntax for inner-joined children
    if (sortBy === "registration_number") {
      query = query.order("registration_number", { ascending: sortOrder === "asc" });
    } else if (sortBy === "full_name") {
      query = query.order("student_personal(full_name)", { ascending: sortOrder === "asc" });
    } else if (sortBy === "compliance_status") {
      query = query.order("student_snapshot(compliance_status)", { ascending: sortOrder === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Pagination bounds
    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    // Load reference data mapping to resolve names
    const { data: refData } = await supabase
      .from("reference_data")
      .select("code, display_name, category")
      .in("category", ["school", "course", "gender"]);

    const refMap: Record<string, string> = {};
    const courseToSchoolMap: Record<string, string> = {};
    if (refData) {
      refData.forEach(r => {
        refMap[r.code] = r.display_name;
        if (r.category === "course") {
          courseToSchoolMap[r.code] = "School of Forensic Sciences"; // standard default school
        }
      });
    }

    const mappedData = (data || []).map(row => {
      const snapshot = Array.isArray(row.student_snapshot) ? row.student_snapshot[0] : row.student_snapshot;
      const personal = Array.isArray(row.student_personal) ? row.student_personal[0] : row.student_personal;
      const academic = Array.isArray(row.student_academic) ? row.student_academic[0] : row.student_academic;
      const code = academic?.program_code || "";
      return ReportMapper.toStudentReportRow({
        student_id: row.id,
        registration_number: row.registration_number,
        full_name: personal?.full_name,
        nationality: refMap[personal?.nationality_code] || personal?.nationality_code,
        school: courseToSchoolMap[code] || "School of Forensic Sciences",
        programme: refMap[code] || code,
        expected_graduation: academic?.expected_graduation,
        status: row.status,
        compliance_status: snapshot?.compliance_status
      });
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pagination.limit);

    return {
      data: mappedData,
      totalCount,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    };
  }

  async getEfrroReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    sortBy: string = "full_name",
    sortOrder: "asc" | "desc" = "asc"
  ): Promise<PaginatedResult<EfrroReportRow>> {
    const supabase = getAdminSupabase();
    console.log(`[REPORT_REPOSITORY] Querying eFRRO report page: ${pagination.page}`);

    // Query starting from students, inner joining efrro snapshot and personal
    let query = supabase
      .from("students")
      .select(`
        id,
        registration_number,
        ${EFRRO_SNAPSHOT_FIELDS},
        ${PERSONAL_FIELDS},
        student_contact(
          email,
          phone_home,
          phone_local
        )
      `, { count: "exact" });

    // Apply eFRRO filters
    if (filters.efrroStatus) {
      if (filters.efrroStatus === "expired") {
        query = query.eq("student_snapshot.efrro_status", "EXPIRED");
      } else if (filters.efrroStatus === "pending") {
        query = query.eq("student_snapshot.efrro_status", "PENDING_VERIFICATION");
      } else if (filters.efrroStatus === "verified") {
        query = query.eq("student_snapshot.efrro_status", "COMPLIANT");
      } else if (filters.efrroStatus === "rejected") {
        query = query.eq("student_snapshot.efrro_status", "REJECTED");
      }
    }

    if (filters.expiringWithinDays) {
      query = query.lte("student_snapshot.days_until_efrro_expiry", filters.expiringWithinDays)
                   .gt("student_snapshot.days_until_efrro_expiry", 0);
    }

    if (filters.search) {
      const searchVal = `%${filters.search}%`;
      query = query.or(
        `student_snapshot.efrro_number.ilike.${searchVal},` +
        `registration_number.ilike.${searchVal},` +
        `student_personal.full_name.ilike.${searchVal},` +
        `student_contact.email.ilike.${searchVal},` +
        `student_contact.phone_home.ilike.${searchVal}`
      );
    }

    // Sort order mapping
    if (sortBy === "expiry_date") {
      query = query.order("student_snapshot(efrro_expiry)", { ascending: sortOrder === "asc", nullsFirst: false });
    } else if (sortBy === "days_remaining") {
      query = query.order("student_snapshot(days_until_efrro_expiry)", { ascending: sortOrder === "asc", nullsFirst: false });
    } else {
      query = query.order("student_personal(full_name)", { ascending: sortOrder === "asc" });
    }

    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    // Query active efrro details for verification statuses and reviewers name
    const studentIds = (data || []).map(r => r.id);
    let efrroVersions: Record<string, unknown>[] = [];
    let lastNotifications: Record<string, unknown>[] = [];

    if (studentIds.length > 0) {
      const [versionsRes, notifsRes] = await Promise.all([
        supabase
          .from("efrro_versions")
          .select("student_id, verification_status, verified_at, verified_by")
          .in("student_id", studentIds)
          .eq("is_active", true)
          .is("deleted_at", null),
        supabase
          .from(NOTIFICATION_TABLE_NAME)
          .select("student_id, created_at, trigger_source, status")
          .in("student_id", studentIds)
          .eq("document_type", "efrro")
          .order("created_at", { ascending: false })
      ]);
      if (versionsRes.error) {
        throw new Error(`[DB_QUERY_FAILED] ${versionsRes.error.message}`);
      }
      if (notifsRes.error) {
        throw new Error(`[DB_QUERY_FAILED] ${notifsRes.error.message}`);
      }
      efrroVersions = versionsRes.data || [];
      lastNotifications = notifsRes.data || [];
    }

    const mappedData = (data || []).map(row => {
      const snapshot = Array.isArray(row.student_snapshot) ? row.student_snapshot[0] : row.student_snapshot;
      const personal = Array.isArray(row.student_personal) ? row.student_personal[0] : row.student_personal;
      const activeVer = efrroVersions.find(v => v.student_id === row.id);
      const studentNotifs = lastNotifications.filter(n => n.student_id === row.id);
      const lastNotif = studentNotifs[0];

      return ReportMapper.toEfrroReportRow({
        student_id: row.id,
        registration_number: row.registration_number,
        full_name: personal?.full_name,
        efrro_number: snapshot?.efrro_number,
        efrro_expiry: snapshot?.efrro_expiry,
        days_until_efrro_expiry: snapshot?.days_until_efrro_expiry,
        efrro_status: snapshot?.efrro_status,
        reminder_rule: lastNotif ? lastNotif.trigger_source : null,
        reminder_sent: studentNotifs.length > 0,
        last_reminder_sent_at: lastNotif ? lastNotif.created_at : null,
        upload_status: snapshot?.efrro_number ? "uploaded" : "missing",
        verification_status: activeVer ? activeVer.verification_status : null,
        reviewer_name: activeVer && activeVer.verified_by ? "Compliance Officer" : null,
        reviewed_at: activeVer ? activeVer.verified_at : null,
      });
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pagination.limit);

    return {
      data: mappedData,
      totalCount,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    };
  }

  async getNotificationReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sortBy: string = "created_at",
    sortOrder: "asc" | "desc" = "desc"
  ): Promise<PaginatedResult<NotificationReportRow>> {
    const supabase = getAdminSupabase();
    console.log(`[REPORT_REPOSITORY] Fetching notifications report page: ${pagination.page}`);

    let query = supabase
      .from(NOTIFICATION_TABLE_NAME)
      .select(`
        id,
        status,
        channel,
        recipient_address,
        retry_count,
        scheduled_for,
        trigger_source,
        created_at,
        next_retry_at,
        student_id,
        student:students!inner(
          registration_number,
          student_personal!inner(
            full_name
          )
        )
      `, { count: "exact" })
      .eq("document_type", "efrro"); // notifications report is strictly eFRRO only

    if (filters.complianceStatus) {
      query = query.eq("status", filters.complianceStatus);
    }

    if (filters.search) {
      const searchVal = `%${filters.search}%`;
      query = query.or(
        `students.registration_number.ilike.${searchVal},` +
        `students.student_personal.full_name.ilike.${searchVal},` +
        `recipient_address.ilike.${searchVal}`
      );
    }

    query = query.order("created_at", { ascending: sortOrder === "asc" });

    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    // Query eFRRO active status logs to resolve if document uploaded
    const studentIds = (data || []).map(r => r.student_id);
    let activeEfrros: Record<string, unknown>[] = [];
    if (studentIds.length > 0) {
      const { data: efrros } = await supabase
        .from("efrro_versions")
        .select("student_id, verification_status")
        .in("student_id", studentIds)
        .eq("is_active", true)
        .is("deleted_at", null);
      activeEfrros = efrros || [];
    }

    const mappedData = (data || []).map(row => {
      const student = Array.isArray(row.student) ? row.student[0] : row.student;
      const personal = student && (Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal);
      const activeEfrro = activeEfrros.find(e => e.student_id === row.student_id);

      // Parse trigger source threshold days
      let ruleDays = 30;
      if (row.trigger_source?.includes("15")) ruleDays = 15;
      else if (row.trigger_source?.includes("expi")) ruleDays = 0;

      return ReportMapper.toNotificationReportRow({
        notification_id: row.id,
        student_name: personal?.full_name,
        registration_number: student?.registration_number,
        reminder_date: row.created_at,
        reminder_rule_days: ruleDays,
        channel: row.channel,
        status: row.status,
        retry_count: row.retry_count,
        last_attempt_at: row.created_at,
        next_retry_at: row.next_retry_at,
        upload_link_generated: true,
        document_uploaded: !!activeEfrro,
        verification_status: activeEfrro ? activeEfrro.verification_status : null,
      });
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pagination.limit);

    return {
      data: mappedData,
      totalCount,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    };
  }

  async getAuditReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sortBy: string = "timestamp",
    sortOrder: "asc" | "desc" = "desc"
  ): Promise<PaginatedResult<AuditReportRow>> {
    const supabase = getAdminSupabase();
    console.log(`[REPORT_REPOSITORY] Querying audit logs page: ${pagination.page}`);

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" });

    if (filters.search) {
      const searchVal = `%${filters.search}%`;
      query = query.or(`action.ilike.${searchVal},actor_email.ilike.${searchVal},resource.ilike.${searchVal}`);
    }

    query = query.order("timestamp", { ascending: sortOrder === "asc" });

    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    const mappedData = (data || []).map(row => ReportMapper.toAuditReportRow(row));
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pagination.limit);

    return {
      data: mappedData,
      totalCount,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    };
  }

  async logAudit(log: Omit<AuditReportRow, "id" | "timestamp">): Promise<void> {
    const supabase = getAdminSupabase();
    console.log(`[REPORT_REPOSITORY] Writing security audit log for action: ${log.action}`);
    
    const { error } = await supabase
      .from("audit_log")
      .insert({
        actor_id: log.actorId,
        actor_email: log.actorEmail,
        action: log.action,
        resource: log.resource,
        export_type: log.exportType,
        filters_applied: log.filtersApplied,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error(`[DB_AUDIT_LOG_FAILED] Failed to record audit log: ${error.message}`);
    }
  }
}
