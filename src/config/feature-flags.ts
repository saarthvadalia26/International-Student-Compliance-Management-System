/**
 * Centralized Application Feature Flags
 * 
 * Controls feature toggles across the International Student Compliance Management System (ISCMS).
 * Designed for National Forensic Sciences University (NFSU).
 */

export const FEATURE_FLAGS = {
  /**
   * Development/testing mode flag: Bypasses OTP authentication for Student Portal
   * and loads a fully functional demo student session for testing.
   *
   * PRODUCTION SAFETY: Defaults to FALSE (secure). Must be explicitly set to "true"
   * in the environment for development/testing only. Never enable in production.
   *
   * To enable for local development: STUDENT_PORTAL_TEST_MODE=true
   */
  STUDENT_PORTAL_TEST_MODE:
    process.env.NEXT_PUBLIC_STUDENT_PORTAL_TEST_MODE === "true" ||
    process.env.STUDENT_PORTAL_TEST_MODE === "true",

  /**
   * Enables or disables the Student Portal.
   */
  STUDENT_PORTAL_ENABLED: true
} as const;

/**
 * Returns whether the Student Portal test mode is enabled (bypassing authentication).
 */
export function isStudentPortalTestMode(): boolean {
  return FEATURE_FLAGS.STUDENT_PORTAL_TEST_MODE;
}

/**
 * Returns whether the Student Portal is enabled.
 */
export function isStudentPortalEnabled(): boolean {
  return FEATURE_FLAGS.STUDENT_PORTAL_ENABLED;
}
