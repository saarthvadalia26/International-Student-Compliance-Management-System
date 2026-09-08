import { getAdminSupabase } from "@/lib/supabase/admin";
import { 
  ReportFilters, 
  ReportPagination, 
  StudentReportRow, 
  EfrroReportRow, 
  NotificationReportRow, 
  AuditReportRow, 
  DashboardMetrics,
  ComplianceDrilldownCategory,
  ComplianceDrilldownResponse,
  ComplianceDrilldownItem,
  PaginatedResult
} from "../types";
import { ReportMapper } from "../mappers";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";
import { LEGACY_PROGRAM_ALIASES, DEFAULT_FALLBACK_PROGRAMS } from "@/domain/academic-programs/academic-program.service";
import { parseDateOnlyString } from "@/lib/utils/date";

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
    program_id,
    program_code,
    override_school_id,
    school_override_reason,
    admission_category,
    iccr_application_number,
    sii_application_number,
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
  getDashboardDrilldown(category: ComplianceDrilldownCategory): Promise<ComplianceDrilldownResponse>;
  getStudentReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<StudentReportRow>>;
  getEfrroReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<EfrroReportRow>>;
  getNotificationReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<NotificationReportRow>>;
  getAuditReport(filters: ReportFilters, pagination: ReportPagination, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<PaginatedResult<AuditReportRow>>;
  logAudit(log: Omit<AuditReportRow, "id" | "timestamp">): Promise<void>;
}

export class SupabaseReportRepository implements IReportRepository {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const supabase = getAdminSupabase();

    console.log("[REPORT_REPOSITORY] Querying unified metrics for operational dashboard...");

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTime = today.getTime();
    const thirtyDaysAgo = new Date(todayTime - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Execute queries in parallel
    const [
      studentsRes,
      snapshotRes,
      sentTodayRes,
      failedNotifRes,
      pRenewalsRes,
      vRenewalsRes,
      eRenewalsRes
    ] = await Promise.all([
      // Total active non-deleted students
      supabase.from("students").select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "active"),
      // Authoritative snapshots of active non-deleted students
      supabase.from("student_snapshot").select(`
        student_id,
        passport_number,
        passport_expiry,
        passport_status,
        visa_number,
        visa_expiry,
        visa_status,
        efrro_number,
        efrro_expiry,
        efrro_status,
        compliance_status,
        students!inner(id, status, deleted_at)
      `)
        .is("students.deleted_at", null)
        .eq("students.status", "active"),
      // Notifications sent today (Email + WhatsApp)
      supabase.from(NOTIFICATION_TABLE_NAME).select("id, channel")
        .in("status", ["sent", "delivered"])
        .gte("created_at", new Date(todayTime).toISOString()),
      // Failed notifications requiring attention
      supabase.from(NOTIFICATION_TABLE_NAME).select("id, channel, status")
        .in("status", ["failed", "bounced"]),
      // Document renewals recorded in last 30 days (version_number > 1 strictly)
      supabase.from("passport_versions").select("id", { count: "exact", head: true })
        .gt("version_number", 1)
        .is("deleted_at", null)
        .gte("created_at", thirtyDaysAgo),
      supabase.from("visa_versions").select("id", { count: "exact", head: true })
        .gt("version_number", 1)
        .is("deleted_at", null)
        .gte("created_at", thirtyDaysAgo),
      supabase.from("efrro_versions").select("id", { count: "exact", head: true })
        .gt("version_number", 1)
        .is("deleted_at", null)
        .gte("created_at", thirtyDaysAgo)
    ]);

    const totalStudents = studentsRes.count || 0;
    const snapshots = snapshotRes.data || [];

    // Helper: calculate integer days remaining from YYYY-MM-DD
    const calcDays = (expStr?: string | null): number | null => {
      if (!expStr) return null;
      const parts = parseDateOnlyString(String(expStr));
      if (!parts) {
        const d = new Date(expStr);
        if (isNaN(d.getTime())) return null;
        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return Math.round((target - todayTime) / (1000 * 60 * 60 * 24));
      }
      const target = new Date(parts.year, parts.month - 1, parts.day).getTime();
      return Math.round((target - todayTime) / (1000 * 60 * 60 * 24));
    };

    let fullyCompliantCount = 0;
    let studentExpiring30Count = 0;
    let studentCritical15Count = 0;
    let studentExpiredCount = 0;

    let expiring30Docs = 0;
    let critical15Docs = 0;
    let expiredDocs = 0;

    const expiringByDocType = {
      passport: { critical15: 0, expiring30: 0, expired: 0, valid: 0 },
      visa: { critical15: 0, expiring30: 0, expired: 0, valid: 0 },
      efrro: { critical15: 0, expiring30: 0, expired: 0, valid: 0 }
    };

    snapshots.forEach((s: any) => {
      const pDays = calcDays(s.passport_expiry);
      const vDays = calcDays(s.visa_expiry);
      const eDays = calcDays(s.efrro_expiry);

      const pNum = (s.passport_number || "").trim();
      const vNum = (s.visa_number || "").trim();
      const eNum = (s.efrro_number || "").trim();

      const pHasValidData = Boolean(pNum && s.passport_expiry && pDays !== null);
      const vHasValidData = Boolean(vNum && s.visa_expiry && vDays !== null);
      const eHasValidData = Boolean(eNum && s.efrro_expiry && eDays !== null);

      let sHasExpired = false;
      let sHasCritical = false;
      let sHas30 = false;

      // Passport evaluation
      if (pDays !== null) {
        if (pDays < 0) {
          sHasExpired = true;
          expiredDocs++;
          expiringByDocType.passport.expired++;
        } else if (pDays <= 15) {
          sHasCritical = true;
          sHas30 = true;
          critical15Docs++;
          expiring30Docs++;
          expiringByDocType.passport.critical15++;
          expiringByDocType.passport.expiring30++;
        } else if (pDays <= 30) {
          sHas30 = true;
          expiring30Docs++;
          expiringByDocType.passport.expiring30++;
        } else {
          expiringByDocType.passport.valid++;
        }
      }

      // Visa evaluation
      if (vDays !== null) {
        if (vDays < 0) {
          sHasExpired = true;
          expiredDocs++;
          expiringByDocType.visa.expired++;
        } else if (vDays <= 15) {
          sHasCritical = true;
          sHas30 = true;
          critical15Docs++;
          expiring30Docs++;
          expiringByDocType.visa.critical15++;
          expiringByDocType.visa.expiring30++;
        } else if (vDays <= 30) {
          sHas30 = true;
          expiring30Docs++;
          expiringByDocType.visa.expiring30++;
        } else {
          expiringByDocType.visa.valid++;
        }
      }

      // eFRRO evaluation
      if (eDays !== null) {
        if (eDays < 0) {
          sHasExpired = true;
          expiredDocs++;
          expiringByDocType.efrro.expired++;
        } else if (eDays <= 15) {
          sHasCritical = true;
          sHas30 = true;
          critical15Docs++;
          expiring30Docs++;
          expiringByDocType.efrro.critical15++;
          expiringByDocType.efrro.expiring30++;
        } else if (eDays <= 30) {
          sHas30 = true;
          expiring30Docs++;
          expiringByDocType.efrro.expiring30++;
        } else {
          expiringByDocType.efrro.valid++;
        }
      }

      if (sHasExpired) studentExpiredCount++;
      if (sHasCritical) studentCritical15Count++;
      if (sHas30) studentExpiring30Count++;

      // Fully compliant: POSITIVE COMPLIANCE. All 3 required documents (Passport, Visa, eFRRO)
      // must be positively present, valid, and have > 30 days remaining.
      // Absence of compliance data must never be interpreted as proof of compliance.
      const isFullyCompliant = 
        pHasValidData && vHasValidData && eHasValidData &&
        !sHasExpired && !sHas30;

      if (isFullyCompliant) {
        fullyCompliantCount++;
      }
    });

    // Notification channel breakdown
    let sentEmail = 0;
    let sentWhatsApp = 0;
    (sentTodayRes.data || []).forEach((n: any) => {
      const ch = (n.channel || "").toLowerCase();
      if (ch.includes("whatsapp")) sentWhatsApp++;
      else sentEmail++;
    });

    // Authoritative Renewals counts:
    // Only actual document versions where version_number > 1.
    // Original documents (version_number <= 1) contribute exactly 0 renewals.
    const pRen = pRenewalsRes.count || 0;
    const vRen = vRenewalsRes.count || 0;
    const eRen = eRenewalsRes.count || 0;
    const renewalsRecorded = pRen + vRen + eRen;

    const renewalsByDocType = {
      passport: pRen,
      visa: vRen,
      efrro: eRen
    };

    const sentToday = sentTodayRes.data?.length || 0;
    const failedNotifications = failedNotifRes.data?.length || 0;

    return {
      totalStudents,
      fullyCompliantStudents: fullyCompliantCount,
      expiringIn30Days: studentExpiring30Count,
      criticalIn15Days: studentCritical15Count,
      expiredDocuments: studentExpiredCount,
      renewalsRecorded,
      notificationsSentToday: sentToday,
      failedNotifications,
      failedNotificationsToday: failedNotifications,

      documentCounts: {
        expiringIn30DaysDocs: expiring30Docs,
        criticalIn15DaysDocs: critical15Docs,
        expiredDocs
      },
      notificationsByChannel: {
        email: sentEmail,
        whatsapp: sentWhatsApp
      },
      renewalsByDocType,
      expiringByDocType
    };
  }

  async getDashboardDrilldown(category: ComplianceDrilldownCategory): Promise<ComplianceDrilldownResponse> {
    const supabase = getAdminSupabase();
    const cat = String(category).replace(/-/g, "_") as ComplianceDrilldownCategory;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTime = today.getTime();
    const thirtyDaysAgo = new Date(todayTime - 30 * 24 * 60 * 60 * 1000).toISOString();

    const calcDays = (expStr?: string | null): number | null => {
      if (!expStr) return null;
      const parts = parseDateOnlyString(String(expStr));
      if (!parts) {
        const d = new Date(expStr);
        if (isNaN(d.getTime())) return null;
        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return Math.round((target - todayTime) / (1000 * 60 * 60 * 24));
      }
      const target = new Date(parts.year, parts.month - 1, parts.day).getTime();
      return Math.round((target - todayTime) / (1000 * 60 * 60 * 24));
    };

    if (cat === "renewals") {
      const [pRes, vRes, eRes, studentsRes] = await Promise.all([
        supabase.from("passport_versions")
          .select("id, student_id, version_number, document_number, issue_date, expiry_date, created_at")
          .gt("version_number", 1)
          .is("deleted_at", null)
          .gte("created_at", thirtyDaysAgo),
        supabase.from("visa_versions")
          .select("id, student_id, version_number, document_number, issue_date, expiry_date, created_at")
          .gt("version_number", 1)
          .is("deleted_at", null)
          .gte("created_at", thirtyDaysAgo),
        supabase.from("efrro_versions")
          .select("id, student_id, version_number, document_number, issue_date, expiry_date, created_at")
          .gt("version_number", 1)
          .is("deleted_at", null)
          .gte("created_at", thirtyDaysAgo),
        supabase.from("students")
          .select("id, registration_number, student_personal(full_name)")
          .is("deleted_at", null)
      ]);

      const studentMap = new Map<string, { name: string; regNo: string }>();
      (studentsRes.data || []).forEach((s: any) => {
        studentMap.set(s.id, {
          name: s.student_personal?.full_name || "Unknown Student",
          regNo: s.registration_number || "—"
        });
      });

      const items: ComplianceDrilldownItem[] = [];

      const addVersionRows = (rows: any[] | null, docType: "passport" | "visa" | "efrro") => {
        (rows || []).forEach(r => {
          const verNum = Number(r.version_number);
          // Strictly exclude any non-renewal versions (Original is verNum <= 1)
          if (!verNum || verNum <= 1) return;

          const sInfo = studentMap.get(r.student_id);
          items.push({
            id: r.id,
            studentId: r.student_id,
            studentName: sInfo?.name || "Unknown Student",
            registrationNumber: sInfo?.regNo || "—",
            documentType: docType,
            documentNumber: r.document_number,
            issueDate: r.issue_date,
            expiryDate: r.expiry_date,
            versionLabel: `Renewal ${verNum - 1}`,
            recordedAt: r.created_at
          });
        });
      };

      addVersionRows(pRes.data, "passport");
      addVersionRows(vRes.data, "visa");
      addVersionRows(eRes.data, "efrro");

      items.sort((a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime());

      const byDocType = {
        passport: items.filter(i => i.documentType === "passport").length,
        visa: items.filter(i => i.documentType === "visa").length,
        efrro: items.filter(i => i.documentType === "efrro").length
      };

      return {
        category: "renewals",
        title: "Recent Document Renewals (Last 30 Days)",
        totalCount: items.length,
        items,
        byDocType
      };
    }

    if (cat === "failed_notifications") {
      const { data: notifRows } = await supabase
        .from(NOTIFICATION_TABLE_NAME)
        .select(`
          id,
          student_id,
          document_type,
          channel,
          status,
          retry_count,
          created_at,
          notification_context,
          students(registration_number, student_personal(full_name))
        `)
        .in("status", ["failed", "bounced"])
        .order("created_at", { ascending: false });

      const items: ComplianceDrilldownItem[] = (notifRows || []).map((n: any) => {
        const s = n.students;
        const ctx = n.notification_context || {};
        return {
          id: n.id,
          studentId: n.student_id,
          studentName: s?.student_personal?.full_name || "Unknown Student",
          registrationNumber: s?.registration_number || "—",
          documentType: n.document_type,
          channel: n.channel,
          status: n.status,
          retryCount: n.retry_count,
          failureReason: ctx.error_message || ctx.failure_reason || ctx.reason || "Dispatch delivery failure",
          timestamp: n.created_at
        };
      });

      const byDocType = {
        passport: items.filter(i => i.documentType === "passport").length,
        visa: items.filter(i => i.documentType === "visa").length,
        efrro: items.filter(i => i.documentType === "efrro").length
      };

      return {
        category: "failed_notifications",
        title: "Failed Notification Dispatches",
        totalCount: items.length,
        items,
        byDocType
      };
    }

    if (cat === "notifications_today") {
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const { data: notifRows } = await supabase
        .from(NOTIFICATION_TABLE_NAME)
        .select(`
          id,
          student_id,
          document_type,
          channel,
          status,
          retry_count,
          created_at,
          notification_context,
          students(registration_number, student_personal(full_name))
        `)
        .gte("created_at", todayStart)
        .order("created_at", { ascending: false });

      const items: ComplianceDrilldownItem[] = (notifRows || []).map((n: any) => {
        const s = n.students;
        return {
          id: n.id,
          studentId: n.student_id,
          studentName: s?.student_personal?.full_name || "Unknown Student",
          registrationNumber: s?.registration_number || "—",
          documentType: n.document_type,
          channel: n.channel,
          status: n.status,
          retryCount: n.retry_count,
          timestamp: n.created_at
        };
      });

      const byDocType = {
        passport: items.filter(i => i.documentType === "passport").length,
        visa: items.filter(i => i.documentType === "visa").length,
        efrro: items.filter(i => i.documentType === "efrro").length
      };

      return {
        category: "notifications_today",
        title: "Notifications Dispatched Today",
        totalCount: items.length,
        items,
        byDocType
      };
    }

    if (cat === "total_students" || cat === "compliant") {
      const { data: students } = await supabase
        .from("students")
        .select(`
          id,
          registration_number,
          student_personal(full_name, nationality),
          academic_programs(name),
          student_snapshot(
            passport_number,
            passport_expiry,
            passport_status,
            visa_number,
            visa_expiry,
            visa_status,
            efrro_number,
            efrro_expiry,
            efrro_status,
            overall_compliance_status
          )
        `)
        .is("deleted_at", null)
        .eq("status", "active");

      const items: ComplianceDrilldownItem[] = [];

      (students || []).forEach((st: any) => {
        const snap = st.student_snapshot;
        const compStatus = snap?.overall_compliance_status || "NON_COMPLIANT";
        if (cat === "compliant" && compStatus !== "COMPLIANT") {
          return;
        }

        const sName = st.student_personal?.full_name || "Unknown Student";
        const regNo = st.registration_number || "—";
        const program = st.academic_programs?.name || null;
        const nationality = st.student_personal?.nationality || null;

        items.push({
          id: st.id,
          studentId: st.id,
          studentName: sName,
          registrationNumber: regNo,
          complianceStatus: compStatus,
          academicProgram: program,
          nationality: nationality,
          passportExpiry: snap?.passport_expiry || null,
          visaExpiry: snap?.visa_expiry || null,
          efrroExpiry: snap?.efrro_expiry || null,
          status: compStatus
        });
      });

      items.sort((a, b) => a.studentName.localeCompare(b.studentName));

      const byDocType = {
        passport: items.filter(i => Boolean(i.passportExpiry)).length,
        visa: items.filter(i => Boolean(i.visaExpiry)).length,
        efrro: items.filter(i => Boolean(i.efrroExpiry)).length
      };

      return {
        category: cat,
        title: cat === "compliant" ? "Fully Compliant Students" : "All Active International Students",
        totalCount: items.length,
        items,
        byDocType
      };
    }

    // Otherwise: expiring_30, critical_15, expired
    const { data: students } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        student_personal(full_name),
        student_snapshot(
          passport_number,
          passport_expiry,
          passport_status,
          visa_number,
          visa_expiry,
          visa_status,
          efrro_number,
          efrro_expiry,
          efrro_status
        )
      `)
      .is("deleted_at", null)
      .eq("status", "active");

    const items: ComplianceDrilldownItem[] = [];

    (students || []).forEach((st: any) => {
      const snap = st.student_snapshot;
      if (!snap) return;

      const sName = st.student_personal?.full_name || "Unknown Student";
      const regNo = st.registration_number || "—";

      const checkAndAdd = (
        docType: "passport" | "visa" | "efrro",
        docNum?: string | null,
        expStr?: string | null
      ) => {
        if (!expStr) return;
        const days = calcDays(expStr);
        if (days === null) return;

        let matches = false;
        if (cat === "expired" && days < 0) {
          matches = true;
        } else if (cat === "critical_15" && days >= 0 && days <= 15) {
          matches = true;
        } else if (cat === "expiring_30" && days >= 0 && days <= 30) {
          matches = true;
        }

        if (matches) {
          items.push({
            id: `${st.id}-${docType}`,
            studentId: st.id,
            studentName: sName,
            registrationNumber: regNo,
            documentType: docType,
            documentNumber: docNum || "—",
            expiryDate: expStr,
            daysRemaining: days >= 0 ? days : null,
            daysExpired: days < 0 ? Math.abs(days) : null,
            status: days < 0 ? "EXPIRED" : days <= 15 ? "CRITICAL" : "WARNING"
          });
        }
      };

      checkAndAdd("passport", snap.passport_number, snap.passport_expiry);
      checkAndAdd("visa", snap.visa_number, snap.visa_expiry);
      checkAndAdd("efrro", snap.efrro_number, snap.efrro_expiry);
    });

    if (cat === "expired") {
      items.sort((a, b) => (b.daysExpired || 0) - (a.daysExpired || 0));
    } else {
      items.sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));
    }

    const byDocType = {
      passport: items.filter(i => i.documentType === "passport").length,
      visa: items.filter(i => i.documentType === "visa").length,
      efrro: items.filter(i => i.documentType === "efrro").length
    };

    const titleMap: Record<string, string> = {
      expiring_30: "Documents Expiring in 30 Days",
      critical_15: "Critical Expiries (Within 15 Days)",
      expired: "Expired Compliance Documents"
    };

    return {
      category,
      title: titleMap[category] || "Compliance Drill-down",
      totalCount: items.length,
      items,
      byDocType
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

    let data: any = null;
    let error: any = null;
    let count: number | null = null;

    const initialRes = await query;
    data = initialRes.data;
    error = initialRes.error;
    count = initialRes.count;

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    // Load reference data mapping to resolve names
    const { data: refData } = await supabase
      .from("reference_data")
      .select("code, display_name, category")
      .in("category", ["school", "course", "gender"]);

    // Load academic programs mapping for canonical names, levels, and schools
    const { data: progData } = await supabase
      .from("academic_programs")
      .select("id, program_code, program_name, school_name, academic_level");

    // Load canonical schools mapping
    const { data: schoolsData } = await supabase
      .from("schools")
      .select("id, name, code");

    const schoolsMap: Record<string, string> = {};
    if (schoolsData) {
      schoolsData.forEach(s => {
        schoolsMap[s.id] = s.name;
      });
    }

    const progNameMap: Record<string, string> = {};
    const progLevelMap: Record<string, string> = {};
    const progSchoolMap: Record<string, string> = {};

    const allPrograms = (progData && progData.length > 0)
      ? progData.map(p => ({
          id: p.id,
          programCode: p.program_code,
          programName: p.program_name,
          schoolName: p.school_name,
          academicLevel: p.academic_level
        }))
      : DEFAULT_FALLBACK_PROGRAMS;

    allPrograms.forEach(p => {
      const code = p.programCode || "";
      const name = p.programName || "";
      const school = p.schoolName || "Academic Department";
      const level = p.academicLevel ? String(p.academicLevel) : "";

      if (p.id) {
        progNameMap[p.id] = name;
        progNameMap[p.id.toLowerCase()] = name;
        if (level) progLevelMap[p.id] = level;
        if (school) progSchoolMap[p.id] = school;
      }
      if (code) {
        progNameMap[code] = name;
        progNameMap[code.toLowerCase()] = name;
        progNameMap[code.replace(/_/g, "-")] = name;
        progNameMap[code.replace(/_/g, "-").toLowerCase()] = name;
        progNameMap[code.replace(/-/g, "_")] = name;
        progNameMap[code.replace(/-/g, "_").toLowerCase()] = name;
        if (level) progLevelMap[code] = level;
        if (level) progLevelMap[code.toLowerCase()] = level;
        if (school) progSchoolMap[code] = school;
        if (school) progSchoolMap[code.toLowerCase()] = school;
      }
      if (name) {
        progNameMap[name] = name;
        progNameMap[name.toLowerCase()] = name;
        const norm = name.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
        progNameMap[norm] = name;
        if (level) progLevelMap[name] = level;
        if (school) progSchoolMap[name] = school;
      }
    });

    // Populate aliases
    Object.entries(LEGACY_PROGRAM_ALIASES).forEach(([alias, targetCode]) => {
      const canonicalName = progNameMap[targetCode.toLowerCase()];
      if (canonicalName) {
        progNameMap[alias] = canonicalName;
        progNameMap[alias.toLowerCase()] = canonicalName;
        progNameMap[alias.replace(/_/g, "-").toLowerCase()] = canonicalName;
      }
    });

    const refMap: Record<string, string> = {};
    const courseToSchoolMap: Record<string, string> = {};
    if (refData) {
      refData.forEach(r => {
        refMap[r.code] = r.display_name;
        if (r.category === "course") {
          courseToSchoolMap[r.code] = "Academic Department";
        }
      });
    }

    const mappedData = ((data || []) as any[]).map((row: any) => {
      const snapshot = Array.isArray(row.student_snapshot) ? row.student_snapshot[0] : row.student_snapshot;
      const personal = Array.isArray(row.student_personal) ? row.student_personal[0] : row.student_personal;
      const academic = Array.isArray(row.student_academic) ? row.student_academic[0] : row.student_academic;
      const progId = academic?.program_id || "";
      const code = academic?.program_code || "";
      const normalizedCode = code ? code.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase() : "";

      const resolvedProgramme = (progId && progNameMap[progId]) 
        || (progId && progNameMap[progId.toLowerCase()])
        || (code && progNameMap[code]) 
        || (code && progNameMap[code.toLowerCase()]) 
        || (code && progNameMap[code.replace(/_/g, "-").toLowerCase()])
        || (normalizedCode && progNameMap[normalizedCode])
        || refMap[code] 
        || code 
        || "Not assigned yet";

      const isOverridden = Boolean(academic?.override_school_id);
      const resolvedSchool = (isOverridden && academic?.override_school_id && schoolsMap[academic.override_school_id])
        ? schoolsMap[academic.override_school_id]
        : ((progId && progSchoolMap[progId]) 
          || (code && progSchoolMap[code]) 
          || (resolvedProgramme && progSchoolMap[resolvedProgramme]) 
          || courseToSchoolMap[code] 
          || "Not provided");

      const resolvedLevel = (progId && progLevelMap[progId]) 
        || (code && progLevelMap[code]) 
        || (resolvedProgramme && progLevelMap[resolvedProgramme]) 
        || null;

      return ReportMapper.toStudentReportRow({
        student_id: row.id,
        registration_number: row.registration_number,
        full_name: personal?.full_name,
        nationality: refMap[personal?.nationality_code] || personal?.nationality_code,
        school: resolvedSchool,
        programme: resolvedProgramme,
        academic_level: resolvedLevel,
        expected_graduation: academic?.expected_graduation,
        status: row.status,
        compliance_status: snapshot?.compliance_status,
        admission_category: academic?.admission_category || null,
        iccr_application_number: academic?.iccr_application_number || null,
        sii_application_number: academic?.sii_application_number || null,
        nfsu_campus: academic?.nfsu_campus || null
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

export const reportRepository = new SupabaseReportRepository();
