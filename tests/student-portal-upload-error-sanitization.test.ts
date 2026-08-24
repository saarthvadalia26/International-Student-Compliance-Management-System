import "./test-preload";
import { sanitizeError, formatUserFacingError } from "../src/lib/errors/error-sanitizer";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTests() {
  console.log("=================================================================");
  console.log("  STUDENT PORTAL UPLOAD & ERROR SANITIZER TEST SUITE");
  console.log("=================================================================\n");

  // 1. Test check constraint error message translation
  console.log("--- 1. Check Constraint Error Sanitization ---");
  const constraintErr = new Error(`[DB_INSERT_FAILED] Failed to record passport version: new row for relation "passport_versions" violates check constraint "chk_passport_expiry_after_issue"`);
  const sanitizedConstraint = sanitizeError(constraintErr, { action: "uploadStudentDocumentAction", route: "/student/efrro" });
  
  assert(
    sanitizedConstraint.title === "Invalid Expiration Date",
    `Check constraint title should be "Invalid Expiration Date", got "${sanitizedConstraint.title}"`
  );
  assert(
    sanitizedConstraint.message.includes("The document expiration date must be after the issue date"),
    `Message is plain English without SQL syntax: "${sanitizedConstraint.message}"`
  );
  assert(
    !sanitizedConstraint.message.includes("passport_versions") && !sanitizedConstraint.message.includes("chk_passport_expiry_after_issue"),
    "Message does not leak raw table names or SQL constraint identifiers"
  );

  // 2. Test formatUserFacingError helper for Visa and eFRRO
  console.log("\n--- 2. Visa and eFRRO Constraint Sanitization ---");
  const visaConstraintErr = new Error(`[DB_INSERT_FAILED] Failed to record visa version: new row for relation "visa_versions" violates check constraint "chk_visa_expiry_after_issue"`);
  const sanitizedVisa = sanitizeError(visaConstraintErr, { action: "uploadStudentDocumentAction", route: "/student/efrro" });
  assert(
    sanitizedVisa.title === "Invalid Expiration Date" && sanitizedVisa.message.includes("The document expiration date must be after the issue date"),
    "Visa check constraint is translated to user-friendly message without raw SQL"
  );

  const efrroConstraintErr = new Error(`[DB_INSERT_FAILED] Failed to record efrro version: new row for relation "efrro_versions" violates check constraint "chk_efrro_expiry_after_issue"`);
  const sanitizedEfrro = sanitizeError(efrroConstraintErr, { action: "uploadStudentDocumentAction", route: "/student/efrro" });
  assert(
    sanitizedEfrro.title === "Invalid Expiration Date" && sanitizedEfrro.message.includes("The document expiration date must be after the issue date"),
    "eFRRO check constraint is translated to user-friendly message without raw SQL"
  );

  // 3. Test generic check constraint
  console.log("\n--- 3. Generic Check Constraint Sanitization ---");
  const genericCheckErr = new Error('new row for relation "visa_versions" violates check constraint "chk_visa_number_not_empty"');
  const sanitizedGeneric = sanitizeError(genericCheckErr);
  assert(
    sanitizedGeneric.message.includes("Some of the provided details do not meet validation requirements"),
    `Generic check constraint is translated to clean message: "${sanitizedGeneric.message}"`
  );

  // 4. Test storage failure sanitization
  console.log("\n--- 4. Storage Write Error Sanitization ---");
  const storageErr = new Error("[STORAGE_WRITE_FAILED] Connection to R2 bucket timed out");
  const sanitizedStorage = sanitizeError(storageErr);
  assert(
    sanitizedStorage.message.includes("We were unable to store your file"),
    `Storage failure translated to friendly message: "${sanitizedStorage.message}"`
  );

  // 5. Test DB insert failure sanitization
  console.log("\n--- 5. DB Insert Failure Sanitization ---");
  const dbInsertErr = new Error("[DB_INSERT_FAILED] Postgres connection terminated unexpectedly");
  const sanitizedDb = sanitizeError(dbInsertErr, { action: "uploadStudentDocumentAction" });
  assert(
    sanitizedDb.message.includes("The system could not save the document record"),
    `DB insert failure is clear and polite: "${sanitizedDb.message}"`
  );

  console.log("\n=================================================================");
  console.log("  ALL SANITIZATION & UPLOAD DATE CHECKS PASSED! ✅");
  console.log("=================================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
