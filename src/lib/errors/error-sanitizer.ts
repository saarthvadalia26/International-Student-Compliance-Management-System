/**
 * Centralized Error Sanitizer & Human-Friendly Message Service — ISCMS
 *
 * Converts raw framework exceptions, database timeouts, Supabase auth errors,
 * and network failures into clear, professional, plain-English messages.
 *
 * SECURITY: Never exposes stack traces, SQL error codes, internal IDs, or digest IDs to the browser.
 */

export interface HumanFriendlyError {
  title: string;
  message: string;
  category: "auth" | "database" | "network" | "permission" | "validation" | "unknown";
  errorId?: string;
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

  const rawMessage = err instanceof Error ? err.message : String(err || "");
  const rawStack = err instanceof Error ? err.stack : undefined;
  const rawName = err instanceof Error ? err.name : "UnknownError";

  // Server-side diagnostic log (never sent to client)
  if (typeof window === "undefined") {
    console.error(`[SERVER_ERROR_LOG] [${timestamp}] [${errorId}]`, {
      name: rawName,
      message: rawMessage,
      stack: rawStack,
      context,
    });
  }

  const normalized = rawMessage.toLowerCase();

  // 1. Session & Authentication Errors
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
    };
  }

  // 2. Authorization & Permission Errors
  if (
    normalized.includes("403") ||
    normalized.includes("forbidden") ||
    normalized.includes("permission denied") ||
    normalized.includes("access denied") ||
    normalized.includes("restricted") ||
    normalized.includes("administrator access required")
  ) {
    return {
      title: "Access Restricted",
      message: "You don't have permission to perform this action.",
      category: "permission",
      errorId,
    };
  }

  // 3. Network & Connection Errors
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
    };
  }

  // 4. Database & Timeout Errors
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
    return {
      title: "Unable to Load Data",
      message: "Unable to load data. Please try again.",
      category: "database",
      errorId,
    };
  }

  // 5. Rate Limiting Errors
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
    };
  }

  // 6. Validation Errors (Preserve clean user-facing validation hints)
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
    };
  }

  // 7. Default Fallback for Uncaught Errors
  return {
    title: "Something went wrong",
    message: "Something went wrong. Please try again later.",
    category: "unknown",
    errorId,
  };
}

/**
 * Utility to extract user-facing string message from any error
 */
export function formatUserFacingError(err: unknown, context?: ErrorLogContext): string {
  return sanitizeError(err, context).message;
}
