import "./test-preload";
import { isStudentPortalOtpEnabled, isStudentPortalEnabled } from "../src/config/feature-flags";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("  ISCMS v0.2.0: STUDENT PORTAL IDENTIFIER AUTH TESTS  ");
  console.log("=======================================================\n");

  console.log("--- Section 1: Feature Flag & OTP Reversible Toggle ---");
  assert(isStudentPortalEnabled() === true, "Student portal is globally enabled");
  assert(isStudentPortalOtpEnabled() === false, "Student portal OTP is disabled by default for v0.2.0");

  console.log("\n--- Section 2: Identifier Input Validation ---");
  const { StudentPortalAuthService } = await import("../src/domain/student-portal/services/student-portal-auth.service");

  const emptyRes = await StudentPortalAuthService.authenticateByIdentifier("");
  assert(emptyRes.success === false, "Empty identifier is rejected");
  assert(emptyRes.error?.includes("Please enter your University Enrollment Number") === true, "Clear error on empty input");

  const shortRes = await StudentPortalAuthService.authenticateByIdentifier("A");
  assert(shortRes.success === false, "1-character identifier is rejected");

  console.log("\n=======================================================");
  console.log("  ALL STUDENT PORTAL AUTH TESTS PASSED SUCCESSFULLY!   ");
  console.log("=======================================================\n");
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
