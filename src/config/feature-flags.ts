/**
 * Centralized Application Feature Flags
 * 
 * Controls feature toggles across the International Student Compliance Management System (ISCMS).
 * Designed for National Forensic Sciences University (NFSU).
 */

export const FEATURE_FLAGS = {
  /**
   * Temporary testing mode flag: Bypasses OTP authentication for Student Portal
   * and loads a fully functional demo student session for testing.
   * Default: true (Testing mode active until explicitly set to "false" in environment).
   */
  STUDENT_PORTAL_TEST_MODE: 
    process.env.NEXT_PUBLIC_STUDENT_PORTAL_TEST_MODE !== "false" && 
    process.env.STUDENT_PORTAL_TEST_MODE !== "false",

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
