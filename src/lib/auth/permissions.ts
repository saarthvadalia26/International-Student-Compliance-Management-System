/**
 * Authorization Permissions Helper
 *
 * Single source of truth for all role checks across the ISCMS application.
 * Works on both server (Server Actions, Route Handlers) and client (Hooks).
 *
 * Role model:
 *   administrator — Full system access including admin-only features
 *   staff         — Operational access (students, documents, reminders, reports)
 *   student       — Student portal only
 */

import type { User } from "@supabase/supabase-js";

/** All first-class application roles */
export type AppRole = "administrator" | "staff" | "student";

/** Centralized role constants */
export const USER_ROLES = {
  ADMINISTRATOR: "administrator" as const,
  STAFF: "staff" as const,
  STUDENT: "student" as const,
} as const;

/** Normalizes the raw role string from user_metadata to a canonical AppRole */
export function getAppRole(user: User | null | undefined): AppRole | null {
  if (!user) return null;
  const raw = ((user.app_metadata?.role || user.user_metadata?.role) as string | undefined)?.toLowerCase().trim();
  if (raw === USER_ROLES.ADMINISTRATOR || raw === "admin") return USER_ROLES.ADMINISTRATOR;
  if (raw === USER_ROLES.STAFF) return USER_ROLES.STAFF;
  if (raw === USER_ROLES.STUDENT) return USER_ROLES.STUDENT;
  return null;
}

/** Returns true when the user holds the Administrator role */
export function isAdministrator(user: User | null | undefined): boolean {
  return getAppRole(user) === "administrator";
}

/** Returns true when the user holds the Staff role (but not Administrator) */
export function isStaff(user: User | null | undefined): boolean {
  return getAppRole(user) === "staff";
}

/** Returns true when the user is any internal staff member (admin OR staff) */
export function isInternalUser(user: User | null | undefined): boolean {
  const role = getAppRole(user);
  return role === "administrator" || role === "staff";
}

/** Returns true when the user is in the student portal */
export function isStudent(user: User | null | undefined): boolean {
  return getAppRole(user) === "student";
}

/**
 * Asserts the caller is an Administrator.
 * Throws a typed Unauthorized error if not. Use in Server Actions and Route Handlers.
 */
export function requireAdministrator(user: User | null | undefined): asserts user is User {
  if (!user) {
    throw new UnauthorizedError("Authentication required.");
  }
  if (!isAdministrator(user)) {
    throw new UnauthorizedError(
      "Forbidden: Administrator privileges required for this operation."
    );
  }
}

/**
 * Asserts the caller is any authenticated internal user (administrator or staff).
 * Throws a typed Unauthorized error if not.
 */
export function requireInternalUser(user: User | null | undefined): asserts user is User {
  if (!user) {
    throw new UnauthorizedError("Authentication required.");
  }
  if (!isInternalUser(user)) {
    throw new UnauthorizedError("Forbidden: Staff or Administrator access required.");
  }
}

/** Typed authorization error for clean server action error handling */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}
