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
  STUDENT_PORTAL_ENABLED: true,

  /**
   * Student Portal Authentication Mode (v0.2.0):
   * - "IDENTIFIER": Login with Enrollment Number or Passport Number without OTP (default for v0.2.0 until WhatsApp API is ready).
   * - "OTP": Login with WhatsApp OTP verification code.
   * 
   * Reversible toggle: Can be enabled via STUDENT_PORTAL_OTP_ENABLED=true or STUDENT_PORTAL_AUTH_MODE=OTP.
   */
  STUDENT_PORTAL_OTP_ENABLED:
    process.env.NEXT_PUBLIC_STUDENT_PORTAL_OTP_ENABLED === "true" ||
    process.env.STUDENT_PORTAL_OTP_ENABLED === "true" ||
    process.env.STUDENT_PORTAL_AUTH_MODE === "OTP"
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

/**
 * Returns whether WhatsApp OTP verification is active for Student Portal login.
 * Defaults to false for v0.2.0 (direct identifier login).
 */
export function isStudentPortalOtpEnabled(): boolean {
  return FEATURE_FLAGS.STUDENT_PORTAL_OTP_ENABLED;
}
