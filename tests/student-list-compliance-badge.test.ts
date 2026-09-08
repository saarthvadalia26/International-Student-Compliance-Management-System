import "./test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import assert from "node:assert/strict";
import { getStudentsListAction } from "../src/app/(app)/students/actions";

async function testStudentListComplianceBadges() {
  console.log("============================================================");
  console.log(" ISCMS TEST: STUDENT LIST MISSING COMPLIANCE BADGE EVALUATION");
  console.log("============================================================");

  const res = await getStudentsListAction();
  assert.equal(res.success, true, "getStudentsListAction should succeed");
  assert.ok(res.students.length > 0, "Should have students loaded");

  let missingEfrroCount = 0;
  let missingVisaAndEfrroCount = 0;
  let missingPassportCount = 0;

  for (const s of res.students) {
    assert.ok(Array.isArray(s.missingDocuments), `Student ${s.fullName} must have missingDocuments array`);
    
    if (s.missingDocuments.includes("eFRRO") && !s.missingDocuments.includes("Visa") && !s.missingDocuments.includes("Passport")) {
      missingEfrroCount++;
    } else if (s.missingDocuments.includes("Visa") && s.missingDocuments.includes("eFRRO") && !s.missingDocuments.includes("Passport")) {
      missingVisaAndEfrroCount++;
    } else if (s.missingDocuments.includes("Passport")) {
      missingPassportCount++;
    }
  }

  console.log(`✓ Total Students Evaluated: ${res.students.length}`);
  console.log(`✓ Students missing only eFRRO: ${missingEfrroCount} (Badge will display: "Missing eFRRO")`);
  console.log(`✓ Students missing Visa & eFRRO: ${missingVisaAndEfrroCount} (Badge will display: "Missing Visa & eFRRO")`);
  console.log(`✓ Students missing Passport: ${missingPassportCount}`);

  assert.equal(missingEfrroCount, 63, "Expected exactly 63 students with missing eFRRO");
  assert.equal(missingVisaAndEfrroCount, 4, "Expected exactly 4 students with missing Visa & eFRRO");

  console.log("============================================================");
  console.log(" RESULTS: ALL COMPLIANCE BADGE ASSERTIONS PASSED (100%)");
  console.log("============================================================");
}

testStudentListComplianceBadges().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
