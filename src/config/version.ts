import pkg from "../../package.json";

/**
 * Authoritative Canonical Application Version Source of Truth.
 * 
 * - Stored canonically in root `package.json` as a valid semantic version (e.g., "0.2.0").
 * - Formatted for user-facing surfaces with a 'v' prefix via `getDisplayAppVersion()` (e.g., "v0.2.0").
 */
export const APP_VERSION: string = pkg.version || "0.2.0";

/**
 * Formats a semantic version string with a leading 'v' prefix for UI presentation.
 * If already prefixed with 'v', returns the value idempotently.
 * 
 * @example
 * getDisplayAppVersion("0.2.0") // "v0.2.0"
 * getDisplayAppVersion("v0.2.0") // "v0.2.0"
 */
export function getDisplayAppVersion(version: string = APP_VERSION): string {
  if (!version) return `v${APP_VERSION}`;
  return version.startsWith("v") ? version : `v${version}`;
}
