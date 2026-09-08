"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator, UnauthorizedError } from "@/lib/auth/permissions";
import { SupabaseReportRepository } from "@/domain/reports/repositories/report.repository";
import { ReportingService } from "@/domain/reports/services/report.service";
import { DimensionalReportsService } from "@/domain/reports/services/dimensional-reports.service";
import { DimensionalExcelService } from "@/domain/reports/services/dimensional-excel.service";
import {
  ReportFilters,
  ReportPagination,
  DimensionReportFilters,
  ExportableDimensionType,
  DimensionalReportsData,
} from "@/domain/reports/types";
import { headers as getHeaders } from "next/headers";
import { Branding } from "@/config/branding";

const reportRepo = new SupabaseReportRepository();
const reportService = new ReportingService(reportRepo);
const dimensionalService = new DimensionalReportsService();

// Helper to resolve request IP and User Agent for audit logs
async function getRequestMetadata() {
  try {
    const headersList = await getHeaders();
    const ip = headersList.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "Unknown";
    return { ip, userAgent };
  } catch {
    return { ip: "127.0.0.1", userAgent: "Unknown" };
  }
}

async function getAdminUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new UnauthorizedError("Unauthorized: Please log in as an Administrator.");
  }
  requireAdministrator(user);
  return user;
}

/**
 * Fetches unified dimensional reporting data across all 10 student and compliance dimensions.
 * Strictly restricted to Administrators.
 */
export async function getDimensionalReportsAction(
  filters?: DimensionReportFilters
): Promise<DimensionalReportsData> {
  await getAdminUser();
  return dimensionalService.getDimensionalReports(filters);
}

/**
 * Generates and downloads Excel (.xlsx) workbooks for individual dimensions or unified multi-sheet workbooks.
 * Records secure audit logs for every generated file.
 * Strictly restricted to Administrators.
 */
export async function exportDimensionalReportExcelAction(
  dimension: ExportableDimensionType | "all",
  filters?: DimensionReportFilters
): Promise<{ success: boolean; base64: string; fileName: string; mimeType: string }> {
  const user = await getAdminUser();
  const data = await dimensionalService.getDimensionalReports(filters);

  let exportResult: { buffer: Buffer; fileName: string; mimeType: string };
  if (dimension === "all") {
    exportResult = DimensionalExcelService.exportAllDimensionsExcel(data);
  } else {
    exportResult = DimensionalExcelService.exportSingleDimensionExcel(dimension, data);
  }

  const { ip, userAgent } = await getRequestMetadata();
  const actorId = user.id;
  const actorEmail = user.email || Branding.supportEmail;

  await reportService.logAuditAction(
    actorId,
    actorEmail,
    "REPORT_EXPORTED",
    `reports/dimensional/${dimension}`,
    null,
    {
      dimension,
      fileName: exportResult.fileName,
      appliedFilters: filters,
      totalStudents: data.overview.totalStudents,
    },
    ip,
    userAgent
  );

  return {
    success: true,
    base64: exportResult.buffer.toString("base64"),
    fileName: exportResult.fileName,
    mimeType: exportResult.mimeType,
  };
}

export async function fetchStudentReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  await getAdminUser();
  return reportService.getStudentReport(filters, pagination, sortBy, sortOrder);
}

export async function fetchEfrroReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  await getAdminUser();
  return reportService.getEfrroReport(filters, pagination, sortBy, sortOrder);
}

export async function fetchNotificationReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  await getAdminUser();
  return reportService.getNotificationReport(filters, pagination, sortBy, sortOrder);
}

export async function fetchAuditReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  await getAdminUser();
  return reportService.getAuditReport(filters, pagination, sortBy, sortOrder);
}


/**
 * Server-side report exports compiling files and writing audit records.
 * Restricted strictly to Administrators.
 */
export async function exportReport(
  type: "student" | "efrro" | "notification" | "audit",
  filters: ReportFilters,
  format: "csv" | "excel"
) {
  const user = await getAdminUser();
  
  const { ip, userAgent } = await getRequestMetadata();
  const actorId = user.id;
  const actorEmail = user.email || Branding.supportEmail;

  switch (type) {
    case "student":
      return reportService.exportStudentReport(filters, format, actorId, actorEmail, ip, userAgent);
    case "efrro":
      return reportService.exportEfrroReport(filters, format, actorId, actorEmail, ip, userAgent);
    case "notification":
      return reportService.exportNotificationReport(filters, format, actorId, actorEmail, ip, userAgent);
    case "audit":
      return reportService.exportAuditReport(filters, format, actorId, actorEmail, ip, userAgent);
    default:
      throw new Error(`[EXPORT_FAILED] Unknown export report type: ${type}`);
  }
}

/**
 * Security: Unmasks PII (Passport, Visa, or eFRRO number) for a student
 * and immediately records a UNMASK_PII audit log.
 * Restricted strictly to Administrators.
 */
export async function unmaskIdentifier(
  studentId: string,
  documentType: "passport" | "visa" | "efrro"
): Promise<string> {
  const user = await getAdminUser();
  
  const supabase = getAdminSupabase();
  const { ip, userAgent } = await getRequestMetadata();
  
  const actorId = user.id;
  const actorEmail = user.email || Branding.supportEmail;

  console.log(`[SECURITY] Unmask request for student: ${studentId} document: ${documentType}`);

  // 1. Fetch raw active document number
  let docNumber = "";
  if (documentType === "passport") {
    const { data } = await supabase
      .from("passport_versions")
      .select("document_number")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    docNumber = data?.document_number || "N/A";
  } else if (documentType === "visa") {
    const { data } = await supabase
      .from("visa_versions")
      .select("document_number")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    docNumber = data?.document_number || "N/A";
  } else if (documentType === "efrro") {
    const { data } = await supabase
      .from("efrro_versions")
      .select("document_number")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    docNumber = data?.document_number || "N/A";
  }

  // 2. Insert security audit log
  await reportService.logAuditAction(
    actorId,
    actorEmail,
    "UNMASK_PII",
    `reports/unmask/${documentType}`,
    null,
    { studentId, documentType },
    ip,
    userAgent
  );

  return docNumber;
}
