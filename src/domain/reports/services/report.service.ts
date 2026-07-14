import { IReportRepository } from "../repositories/report.repository";
import { 
  DashboardMetrics, 
  ReportFilters, 
  ReportPagination, 
  StudentReportRow, 
  EfrroReportRow, 
  NotificationReportRow, 
  AuditReportRow, 
  PaginatedResult 
} from "../types";
import { ExporterService } from "./exporters";
import { SupabaseStorageService } from "@/domain/compliance/services/storage.service";

export class ReportingService {
  private storageService = new SupabaseStorageService();

  constructor(private repository: IReportRepository) {}

  /**
   * Retrieves summary count metadata metrics for the compliance dashboard.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.repository.getDashboardMetrics();
  }

  /**
   * Returns a paginated list of student compliance report rows based on filters.
   */
  async getStudentReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<PaginatedResult<StudentReportRow>> {
    return this.repository.getStudentReport(filters, pagination, sortBy, sortOrder);
  }

  /**
   * Returns a paginated list of eFRRO document reports rows.
   */
  async getEfrroReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<PaginatedResult<EfrroReportRow>> {
    return this.repository.getEfrroReport(filters, pagination, sortBy, sortOrder);
  }

  /**
   * Returns a paginated list of eFRRO alerts dispatches logs.
   */
  async getNotificationReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<PaginatedResult<NotificationReportRow>> {
    return this.repository.getNotificationReport(filters, pagination, sortBy, sortOrder);
  }

  /**
   * Returns a paginated list of compliance officer action audit trails.
   */
  async getAuditReport(
    filters: ReportFilters,
    pagination: ReportPagination,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<PaginatedResult<AuditReportRow>> {
    return this.repository.getAuditReport(filters, pagination, sortBy, sortOrder);
  }

  /**
   * Directly records an administrator audit event.
   */
  async logAuditAction(
    actorId: string | null,
    actorEmail: string | null,
    action: string,
    resource: string,
    exportType: string | null = null,
    filtersApplied: Record<string, unknown> = {},
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<void> {
    await this.repository.logAudit({
      actorId,
      actorEmail,
      action,
      resource,
      exportType,
      filtersApplied,
      ipAddress,
      userAgent
    });
  }

  /**
   * Generates a short-lived (5-minute) signed URL to download private documents.
   */
  async generateSignedUrl(filePath: string): Promise<string> {
    return this.storageService.generateSignedUrl(filePath, 300);
  }

  /**
   * Generates server-side CSV or Excel files for the general Student compliance list report.
   */
  async exportStudentReport(
    filters: ReportFilters,
    format: "csv" | "excel",
    actorId: string | null,
    actorEmail: string | null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    // Retrieve first 10,000 records to support export
    const reportData = await this.repository.getStudentReport(filters, { page: 1, limit: 10000 });
    
    const headers = [
      "Registration Number",
      "Full Name",
      "Nationality",
      "School",
      "Programme",
      "Expected Graduation",
      "Status",
      "Compliance Status"
    ];

    const rows = reportData.data.map(row => [
      row.registrationNumber,
      row.fullName,
      row.nationality,
      row.school,
      row.programme,
      row.expectedGraduation ? row.expectedGraduation.toISOString().split("T")[0] : "N/A",
      row.status,
      row.complianceStatus
    ]);

    const content = format === "csv" 
      ? ExporterService.exportToCsv(headers, rows)
      : ExporterService.exportToExcel(headers, rows);

    const ext = format === "csv" ? "csv" : "xls";
    const mimeType = format === "csv" ? "text/csv" : "application/vnd.ms-excel";
    const filename = `Student_Compliance_Report_${new Date().toISOString().split("T")[0]}.${ext}`;

    // Record action log
    await this.logAuditAction(
      actorId,
      actorEmail,
      `EXPORT_${format.toUpperCase()}`,
      "reports/students",
      format,
      filters as Record<string, unknown>,
      ipAddress,
      userAgent
    );

    return { data: content, filename, mimeType };
  }

  /**
   * Generates server-side CSV or Excel files for the eFRRO status list report.
   */
  async exportEfrroReport(
    filters: ReportFilters,
    format: "csv" | "excel",
    actorId: string | null,
    actorEmail: string | null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const reportData = await this.repository.getEfrroReport(filters, { page: 1, limit: 10000 });

    const headers = [
      "Registration Number",
      "Full Name",
      "eFRRO Number",
      "Expiry Date",
      "Days Remaining",
      "Status",
      "Reminder Sent",
      "Last Reminder Date",
      "Verification Status"
    ];

    const rows = reportData.data.map(row => [
      row.registrationNumber,
      row.fullName,
      ExporterService.maskIdentifier(row.efrroNumber), // Security: Mask document number by default
      row.expiryDate ? row.expiryDate.toISOString().split("T")[0] : "N/A",
      row.daysRemaining !== null ? String(row.daysRemaining) : "N/A",
      row.complianceStatus,
      row.reminderSent ? "Yes" : "No",
      row.lastReminderSentAt ? row.lastReminderSentAt.toISOString().split("T")[0] : "N/A",
      row.verificationStatus || "N/A"
    ]);

    const content = format === "csv" 
      ? ExporterService.exportToCsv(headers, rows)
      : ExporterService.exportToExcel(headers, rows);

    const ext = format === "csv" ? "csv" : "xls";
    const mimeType = format === "csv" ? "text/csv" : "application/vnd.ms-excel";
    const filename = `eFRRO_Report_${new Date().toISOString().split("T")[0]}.${ext}`;

    await this.logAuditAction(
      actorId,
      actorEmail,
      `EXPORT_${format.toUpperCase()}`,
      "reports/efrro",
      format,
      filters as Record<string, unknown>,
      ipAddress,
      userAgent
    );

    return { data: content, filename, mimeType };
  }

  /**
   * Generates server-side CSV or Excel files for the eFRRO notifications history report.
   */
  async exportNotificationReport(
    filters: ReportFilters,
    format: "csv" | "excel",
    actorId: string | null,
    actorEmail: string | null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const reportData = await this.repository.getNotificationReport(filters, { page: 1, limit: 10000 });

    const headers = [
      "Student Name",
      "Registration Number",
      "Reminder Date",
      "Rule Days",
      "Channel",
      "Status",
      "Retry Count",
      "Last Attempt"
    ];

    const rows = reportData.data.map(row => [
      row.studentName,
      row.registrationNumber,
      row.reminderDate.toISOString().split("T")[0],
      String(row.reminderRuleDays),
      row.channel,
      row.status,
      String(row.retryCount),
      row.lastAttemptAt ? row.lastAttemptAt.toISOString() : "N/A"
    ]);

    const content = format === "csv" 
      ? ExporterService.exportToCsv(headers, rows)
      : ExporterService.exportToExcel(headers, rows);

    const ext = format === "csv" ? "csv" : "xls";
    const mimeType = format === "csv" ? "text/csv" : "application/vnd.ms-excel";
    const filename = `Notification_Log_Report_${new Date().toISOString().split("T")[0]}.${ext}`;

    await this.logAuditAction(
      actorId,
      actorEmail,
      `EXPORT_${format.toUpperCase()}`,
      "reports/notifications",
      format,
      filters as Record<string, unknown>,
      ipAddress,
      userAgent
    );

    return { data: content, filename, mimeType };
  }

  /**
   * Generates server-side CSV or Excel files for the administrative action audit report.
   */
  async exportAuditReport(
    filters: ReportFilters,
    format: "csv" | "excel",
    actorId: string | null,
    actorEmail: string | null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const reportData = await this.repository.getAuditReport(filters, { page: 1, limit: 10000 });

    const headers = [
      "Actor Email",
      "Action",
      "Timestamp",
      "Resource",
      "Export Type",
      "Filters Applied",
      "IP Address"
    ];

    const rows = reportData.data.map(row => [
      row.actorEmail || "System/Unknown",
      row.action,
      row.timestamp.toISOString(),
      row.resource,
      row.exportType || "N/A",
      JSON.stringify(row.filtersApplied),
      row.ipAddress || "N/A"
    ]);

    const content = format === "csv" 
      ? ExporterService.exportToCsv(headers, rows)
      : ExporterService.exportToExcel(headers, rows);

    const ext = format === "csv" ? "csv" : "xls";
    const mimeType = format === "csv" ? "text/csv" : "application/vnd.ms-excel";
    const filename = `Security_Audit_Report_${new Date().toISOString().split("T")[0]}.${ext}`;

    await this.logAuditAction(
      actorId,
      actorEmail,
      `EXPORT_${format.toUpperCase()}`,
      "reports/audit",
      format,
      filters as Record<string, unknown>,
      ipAddress,
      userAgent
    );

    return { data: content, filename, mimeType };
  }
}
