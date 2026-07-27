"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { SupabaseReportRepository } from "@/domain/reports/repositories/report.repository";
import { ReportingService } from "@/domain/reports/services/report.service";
import { ReportFilters, ReportPagination } from "@/domain/reports/types";
import { headers as getHeaders } from "next/headers";
import { Branding } from "@/config/branding";

const reportRepo = new SupabaseReportRepository();
const reportService = new ReportingService(reportRepo);

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

export async function fetchStudentReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  return reportService.getStudentReport(filters, pagination, sortBy, sortOrder);
}

export async function fetchEfrroReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  return reportService.getEfrroReport(filters, pagination, sortBy, sortOrder);
}

export async function fetchNotificationReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  return reportService.getNotificationReport(filters, pagination, sortBy, sortOrder);
}

export async function fetchAuditReport(
  filters: ReportFilters,
  pagination: ReportPagination,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  return reportService.getAuditReport(filters, pagination, sortBy, sortOrder);
}

/**
 * Server-side report exports compiling files and writing audit records.
 */
export async function exportReport(
  type: "student" | "efrro" | "notification" | "audit",
  filters: ReportFilters,
  format: "csv" | "excel"
) {
  const { ip, userAgent } = await getRequestMetadata();
  const actorId = "c1010101-1010-1010-1010-101010101010"; // System placeholder admin UUID
  const actorEmail = Branding.supportEmail;

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
 */
export async function unmaskIdentifier(
  studentId: string,
  documentType: "passport" | "visa" | "efrro"
): Promise<string> {
  const supabase = getAdminSupabase();
  const { ip, userAgent } = await getRequestMetadata();
  
  const actorId = "c1010101-1010-1010-1010-101010101010";
  const actorEmail = Branding.supportEmail;

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
      .single();
    docNumber = data?.document_number || "N/A";
  } else if (documentType === "visa") {
    const { data } = await supabase
      .from("visa_versions")
      .select("document_number")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();
    docNumber = data?.document_number || "N/A";
  } else if (documentType === "efrro") {
    const { data } = await supabase
      .from("efrro_versions")
      .select("document_number")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();
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
