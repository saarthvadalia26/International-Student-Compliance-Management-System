/**
 * Configuration constants for the Notification Engine.
 * Provides a single source of truth for table names and metadata.
 */
export const NOTIFICATION_TABLE_NAME = "notifications";

/**
 * Checks if a database error is due to a missing table (e.g. notifications not migrated).
 * Returns true for PostgREST/PostgreSQL table not found errors (code 42P01 or schema cache errors).
 */
export function isTableNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  
  const err = error as { code?: string; message?: string };
  const code = err.code;
  const message = err.message || "";

  return (
    code === "42P01" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache error") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}
