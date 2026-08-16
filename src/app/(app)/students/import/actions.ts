"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator, requireInternalUser } from "@/lib/auth/permissions";
import { BulkStudentImportService } from "@/domain/import/services/bulk-student-import.service";
import { 
  ColumnMapping, 
  ValidationReport, 
  ValidationRowResult, 
  ImportBatchRecord, 
  ImportExecutionResult 
} from "@/domain/import/types/bulk-import.types";

async function getAdminUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    // In dev or local environment without full session cookies, allow fallback if development
    if (process.env.NODE_ENV === "development") {
      return { id: "dev-admin", email: "admin@iscms.internal" };
    }
    throw new Error("Unauthorized: Please log in as an Administrator.");
  }
  requireAdministrator(user);
  return user;
}

async function getInternalUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    if (process.env.NODE_ENV === "development") {
      return { id: "dev-admin", email: "admin@iscms.internal" };
    }
    throw new Error("Unauthorized");
  }
  requireInternalUser(user);
  return user;
}

/**
 * Server action: Parse uploaded spreadsheet buffer and extract headers + rows
 */
export async function parseUploadedSpreadsheetAction(
  fileBase64: string,
  fileName: string
): Promise<{
  success: boolean;
  headers?: string[];
  rawRows?: Record<string, string>[];
  autoMapping?: ColumnMapping;
  totalRows?: number;
  error?: string;
}> {
  try {
    await getAdminUser();

    // Security validation
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      return { success: false, error: "Unsupported file format. Please upload an .xlsx, .xls, or .csv file." };
    }

    const fileBuffer = Buffer.from(fileBase64, "base64");
    const MAX_IMPORT_SIZE_BYTES = 100 * 1024 * 1024; // Dedicated 100 MB bulk import limit
    if (fileBuffer.length > MAX_IMPORT_SIZE_BYTES) {
      return { success: false, error: "Import file exceeds the maximum allowed size of 100 MB." };
    }

    const { headers, rows } = BulkStudentImportService.parseSpreadsheet(fileBuffer);
    const autoMapping = BulkStudentImportService.generateAutoMapping(headers);

    return {
      success: true,
      headers,
      rawRows: rows,
      autoMapping,
      totalRows: rows.length
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PARSE_SPREADSHEET_ERROR]", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Validate mapped spreadsheet rows against domain and DB constraints
 */
export async function validateImportDataAction(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping
): Promise<{
  success: boolean;
  report?: ValidationReport;
  error?: string;
}> {
  try {
    await getAdminUser();
    const report = await BulkStudentImportService.validateSpreadsheetData(rawRows, mapping);
    return {
      success: true,
      report
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[VALIDATE_IMPORT_DATA_ERROR]", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Execute bulk import of validated records
 */
export async function executeBulkImportAction(params: {
  fileName: string;
  fileSizeBytes: number;
  totalRows: number;
  validatedRows: ValidationRowResult[];
}): Promise<{
  success: boolean;
  result?: ImportExecutionResult;
  error?: string;
}> {
  try {
    const admin = await getAdminUser();
    const result = await BulkStudentImportService.executeImport({
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      totalRows: params.totalRows,
      validatedRows: params.validatedRows,
      actorId: admin.id
    });

    return {
      success: true,
      result
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EXECUTE_BULK_IMPORT_ERROR]", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Generate and download official import template
 */
export async function downloadImportTemplateAction(format: "xlsx" | "csv" = "xlsx"): Promise<{
  success: boolean;
  base64?: string;
  fileName?: string;
  mimeType?: string;
  error?: string;
}> {
  try {
    await getInternalUser();
    const { buffer, fileName, mimeType } = BulkStudentImportService.generateImportTemplate(format);
    return {
      success: true,
      base64: buffer.toString("base64"),
      fileName,
      mimeType
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DOWNLOAD_TEMPLATE_ERROR]", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Fetch history of previous import batches
 */
export async function fetchImportHistoryAction(): Promise<{
  success: boolean;
  batches?: ImportBatchRecord[];
  error?: string;
}> {
  try {
    await getInternalUser();
    const batches = await BulkStudentImportService.listImportBatches();
    return {
      success: true,
      batches
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[FETCH_IMPORT_HISTORY_ERROR]", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Generate and download import error and warnings report (.xlsx)
 */
export async function downloadImportErrorReportAction(
  report: ValidationReport,
  executionErrors?: Array<{ rowNumber: number; registrationNumber: string; error: string }>
): Promise<{
  success: boolean;
  base64?: string;
  fileName?: string;
  mimeType?: string;
  error?: string;
}> {
  try {
    await getInternalUser();
    const { buffer, fileName, mimeType } = BulkStudentImportService.generateErrorReport(report, executionErrors);
    return {
      success: true,
      base64: buffer.toString("base64"),
      fileName,
      mimeType
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DOWNLOAD_ERROR_REPORT_ERROR]", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Controlled rollback of an import batch
 */
export async function rollbackImportBatchAction(batchId: string): Promise<{
  success: boolean;
  deletedCount?: number;
  message?: string;
  error?: string;
}> {
  try {
    const admin = await getAdminUser();
    const res = await BulkStudentImportService.rollbackBatch(batchId, admin.id);
    return {
      success: true,
      deletedCount: res.deletedCount,
      message: res.message
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ROLLBACK_IMPORT_BATCH_ERROR]", msg);
    return { success: false, error: msg };
  }
}

