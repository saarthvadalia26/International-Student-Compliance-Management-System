/**
 * Centralized Error Sanitizer & Human-Friendly Message Service — ISCMS
 *
 * Converts raw framework exceptions, database timeouts, Supabase auth errors,
 * and network failures into clear, professional, plain-English messages.
 *
 * SECURITY: Never exposes stack traces, SQL error codes, internal IDs, API secrets,
 * or digest IDs to regular users. Provides safe diagnostic metadata only for Administrators.
 */

export interface DiagnosticMetadata {
  logReferenceId: string;
  category: "auth" | "database" | "network" | "permission" | "validation" | "unknown";
  timestamp: string;
  route: string;
  statusCode: number;
}

export interface HumanFriendlyError {
  title: string;
  message: string;
  category: "auth" | "database" | "network" | "permission" | "validation" | "unknown";
  errorId: string;
  diagnostics: DiagnosticMetadata;
}

export interface ErrorLogContext {
  route?: string;
  userId?: string;
  action?: string;
}

function generateErrorId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "ERR-";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Sanitizes any raw exception into a professional, human-friendly error object.
 * Simultaneously records full diagnostic logs on the server.
 */
export function sanitizeError(err: unknown, context?: ErrorLogContext): HumanFriendlyError {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();
  const route = context?.route ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  const rawMessage = err instanceof Error ? err.message : String(err || "");
  const rawStack = err instanceof Error ? err.stack : undefined;
  const rawName = err instanceof Error ? err.name : "UnknownError";

  // Server-side diagnostic log (never sent to client response)
  if (typeof window === "undefined") {
    console.error(`[SERVER_DIAGNOSTIC_LOG] [${timestamp}] [${errorId}]`, {
      name: rawName,
      message: rawMessage,
      stack: rawStack,
      context,
    });
  }

  const normalized = rawMessage.toLowerCase();

  // 1. Session & Authentication Errors (Status: 401)
  if (
    normalized.includes("jwt expired") ||
    normalized.includes("jwt_expired") ||
    normalized.includes("session_not_found") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("token is expired") ||
    normalized.includes("unauthorized") ||
    normalized.includes("not authenticated")
  ) {
    return {
      title: "Session Expired",
      message: "Your session has expired. Please sign in again.",
      category: "auth",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "auth",
        timestamp,
        route,
        statusCode: 401,
      },
    };
  }

  // 2. Authorization & Permission Errors (Status: 403)
  if (
    normalized.includes("403") ||
    normalized.includes("forbidden") ||
    normalized.includes("permission denied") ||
    normalized.includes("access denied") ||
    normalized.includes("restricted") ||
    normalized.includes("administrator access required") ||
    normalized.includes("authentication required")
  ) {
    return {
      title: "Access Restricted",
      message: "You do not have permission to perform this action.",
      category: "permission",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "permission",
        timestamp,
        route,
        statusCode: 403,
      },
    };
  }

  // 2.1 Specific Duplicate Entity Errors (Status: 409)
  if (
    (normalized.includes("registration") && (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("registration_number_key") || normalized.includes("registration_number")))
  ) {
    return {
      title: "Student already exists",
      message: "A student with this registration number is already registered.",
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 409,
      },
    };
  }

  if (
    normalized.includes("email") && (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("unique constraint") || (normalized.includes("duplicate key") && normalized.includes("email")))
  ) {
    return {
      title: "Student already exists",
      message: "A student with this email address is already registered.",
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 409,
      },
    };
  }

  // 2.2 Database Check Constraints & Document Validation (Status: 400)
  if (
    normalized.includes("chk_passport_expiry_after_issue") ||
    normalized.includes("chk_visa_expiry_after_issue") ||
    normalized.includes("chk_efrro_expiry_after_issue") ||
    normalized.includes("expiry_after_issue") ||
    normalized.includes("expiry date must be strictly after")
  ) {
    return {
      title: "Invalid Expiration Date",
      message: "The document expiration date must be after the issue date. Please check the entered dates.",
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 400,
      },
    };
  }

  if (normalized.includes("chk_upload_auth_valid_dates")) {
    return {
      title: "Invalid Authorization Dates",
      message: "The authorization valid until date must be after the start date.",
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 400,
      },
    };
  }

  if (normalized.includes("chk_academic_graduation_after_admission")) {
    return {
      title: "Invalid Graduation Date",
      message: "Expected graduation date must be after the admission date.",
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 400,
      },
    };
  }

  if (
    normalized.includes("violates check constraint") ||
    normalized.includes("check constraint")
  ) {
    return {
      title: "Invalid Information Provided",
      message: "Some of the provided details do not meet validation requirements. Please review your input and try again.",
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 400,
      },
    };
  }

  // 2.3 Storage & File Upload Errors (Status: 500)
  if (
    normalized.includes("[storage_write_failed]") ||
    normalized.includes("[storage_upload_failed]") ||
    normalized.includes("[storage_upload_error]") ||
    normalized.includes("storage_write_failed") ||
    normalized.includes("storage write failed") ||
    normalized.includes("storage_upload_failed")
  ) {
    return {
      title: "File Upload Failed",
      message: "We were unable to store your file. Please verify the file is not corrupted and try again.",
      category: "database",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "database",
        timestamp,
        route,
        statusCode: 500,
      },
    };
  }

  // 3. Network & Connection Errors (Status: 503)
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network error") ||
    normalized.includes("enotfound") ||
    normalized.includes("econnrefused") ||
    normalized.includes("connection lost") ||
    normalized.includes("offline")
  ) {
    return {
      title: "Connection Lost",
      message: "Connection lost. Please check your internet connection.",
      category: "network",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "network",
        timestamp,
        route,
        statusCode: 503,
      },
    };
  }

  // 4. Database & Timeout Errors (Status: 500)
  if (
    normalized.includes("pgrst") ||
    normalized.includes("postgres") ||
    normalized.includes("database") ||
    normalized.includes("deadlock") ||
    normalized.includes("timeout") ||
    normalized.includes("statement_timeout") ||
    normalized.includes("violates foreign key") ||
    normalized.includes("duplicate key") ||
    normalized.includes("[db_insert_failed]") ||
    normalized.includes("[db_update_failed]") ||
    normalized.includes("[db_query_failed]")
  ) {
    const isSaveAction = context?.action?.includes("register") || context?.action?.includes("create") || context?.action?.includes("save") || context?.action?.includes("upload");
    return {
      title: isSaveAction ? "Unable to save record" : "Unable to Load Data",
      message: isSaveAction ? "The system could not save the document record. Please try again." : "The system could not connect to the database. Please try again.",
      category: "database",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "database",
        timestamp,
        route,
        statusCode: 500,
      },
    };
  }

  // 5. Rate Limiting Errors (Status: 429)
  if (
    normalized.includes("rate limit") ||
    normalized.includes("429") ||
    normalized.includes("too many requests")
  ) {
    return {
      title: "Request Limit Reached",
      message: "Too many requests. Please try again in a few moments.",
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 429,
      },
    };
  }

  // 6. Validation Errors (Status: 400)
  if (
    normalized.includes("required") ||
    normalized.includes("invalid email") ||
    normalized.includes("password must be") ||
    normalized.includes("cannot demote") ||
    normalized.includes("cannot delete") ||
    normalized.includes("action denied")
  ) {
    // Clean any bracketed internal prefix like [ACTION_FAILED]
    const cleanMsg = rawMessage.replace(/^\[[A-Z0-9_]+\]\s*/i, "");
    return {
      title: "Validation Error",
      message: cleanMsg,
      category: "validation",
      errorId,
      diagnostics: {
        logReferenceId: errorId,
        category: "validation",
        timestamp,
        route,
        statusCode: 400,
      },
    };
  }

  // 7. Default Fallback for Uncaught Errors (Status: 500)
  return {
    title: "Something went wrong",
    message: "Something went wrong. The requested operation could not be completed. Please try again or contact the system administrator.",
    category: "unknown",
    errorId,
    diagnostics: {
      logReferenceId: errorId,
      category: "unknown",
      timestamp,
      route,
      statusCode: 500,
    },
  };
}

/**
 * Utility to extract user-facing string message from any error
 */
export function formatUserFacingError(err: unknown, context?: ErrorLogContext): string {
  return sanitizeError(err, context).message;
}
