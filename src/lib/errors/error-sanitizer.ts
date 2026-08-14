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
    normalized.includes("duplicate key")
  ) {
    const isSaveAction = context?.action?.includes("register") || context?.action?.includes("create") || context?.action?.includes("save");
    return {
      title: isSaveAction ? "Unable to save the student" : "Unable to Load Data",
      message: "The system could not connect to the database. Please try again.",
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
    return {
      title: "Validation Error",
      message: rawMessage,
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
