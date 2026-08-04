/**
 * Centralized Application Feature Flags
 * 
 * Controls feature toggles across the International Student Compliance Management System (ISCMS).
 * Designed for National Forensic Sciences University (NFSU) production environment.
 */

export const FEATURE_FLAGS = {
  /**
   * Enables or disables the Student Portal and all /student/* routes & authentication.
   * Default: false (Temporarily disabled for official university submission while final verification is completed).
   */
  STUDENT_PORTAL_ENABLED: 
    process.env.NEXT_PUBLIC_STUDENT_PORTAL_ENABLED === "true" || 
    process.env.STUDENT_PORTAL_ENABLED === "true" || 
    false
} as const;

/**
 * Returns whether the Student Portal feature flag is enabled.
 */
export function isStudentPortalEnabled(): boolean {
  return FEATURE_FLAGS.STUDENT_PORTAL_ENABLED;
}
