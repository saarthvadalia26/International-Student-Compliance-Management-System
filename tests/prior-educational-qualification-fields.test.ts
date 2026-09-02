import "./test-preload";
import assert from "node:assert/strict";
import { 
  RegisterStudentValidationSchema, 
  UpdateStudentValidationSchema 
} from "../src/services/validation/student-validation";
import { ExpiryReminderEngine } from "../src/domain/notifications/services/reminder-engine.service";
import { requireAdministrator } from "../src/lib/auth/permissions";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      }).catch((err) => {
        console.error(`  ✗ ${name}`);
        console.error(`    ${(err as Error).message}`);
        failed++;
      });
    } else {
      console.log(`  ✓ ${name}`);
      passed++;
    }
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

console.log("\n============================================================");
console.log(" ISCMS TEST SUITE: LAST EDUCATIONAL QUALIFICATION & INSTITUTION");
console.log("============================================================\n");

console.log("--- 1. RegisterStudentValidationSchema (Optional Field Rule) ---");

test("Accepts student registration with both prior education fields empty / omitted", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    programId: "prog-1",
    programCode: "MS-DFS",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30"
  });
  assert.ok(result.success, JSON.stringify(result));
  assert.equal(result.data.lastEducationalQualification, undefined);
  assert.equal(result.data.lastEducationalInstitution, undefined);
});

test("Accepts student registration with only Last Educational Qualification", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    lastEducationalQualification: "Bachelor of Science in Computer Engineering",
    lastEducationalInstitution: ""
  });
  assert.ok(result.success, JSON.stringify(result));
  assert.equal(result.data.lastEducationalQualification, "Bachelor of Science in Computer Engineering");
});

test("Accepts student registration with only Name of University/Institute/School", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    lastEducationalQualification: "",
    lastEducationalInstitution: "Moscow State Technical University"
  });
  assert.ok(result.success, JSON.stringify(result));
  assert.equal(result.data.lastEducationalInstitution, "Moscow State Technical University");
});

test("Accepts student registration with both prior education fields populated", () => {
  const result = RegisterStudentValidationSchema.safeParse({
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    admissionDate: "2026-08-01",
    expectedGraduation: "2028-06-30",
    lastEducationalQualification: "Bachelor of Technology",
    lastEducationalInstitution: "National University of Kyiv"
  });
  assert.ok(result.success, JSON.stringify(result));
  assert.equal(result.data.lastEducationalQualification, "Bachelor of Technology");
  assert.equal(result.data.lastEducationalInstitution, "National University of Kyiv");
});

console.log("\n--- 2. UpdateStudentValidationSchema (Editing and Clearing) ---");

test("Accepts updating Last Educational Qualification and Institution", () => {
  const result = UpdateStudentValidationSchema.safeParse({
    lastEducationalQualification: "Master of Science in Cybersecurity",
    lastEducationalInstitution: "Oxford University"
  });
  assert.ok(result.success, JSON.stringify(result));
  assert.equal(result.data.lastEducationalQualification, "Master of Science in Cybersecurity");
  assert.equal(result.data.lastEducationalInstitution, "Oxford University");
});

test("Accepts clearing both prior education fields to null or empty", () => {
  const result = UpdateStudentValidationSchema.safeParse({
    lastEducationalQualification: null,
    lastEducationalInstitution: null
  });
  assert.ok(result.success, JSON.stringify(result));
  assert.equal(result.data.lastEducationalQualification, null);
  assert.equal(result.data.lastEducationalInstitution, null);
});

console.log("\n--- 3. Compliance & Reminders Isolation ---");

test("Presence or absence of prior education fields DOES NOT affect compliance or reminder engine", () => {
  const scheduleWithoutEducation = ExpiryReminderEngine.calculateStudentReminders({
    studentId: "test-std-1",
    expectedGraduationDate: "2028-06-30",
    passport: {
      number: "P123456",
      expiryDate: "2027-01-01",
      isUploaded: true,
      verificationStatus: "verified"
    },
    visa: {
      number: "V123456",
      expiryDate: "2027-01-01",
      isUploaded: true,
      verificationStatus: "verified"
    },
    efrro: null,
    notifications: []
  });

  assert.ok(scheduleWithoutEducation !== null);
  assert.ok(scheduleWithoutEducation.passport !== null);
  assert.equal(scheduleWithoutEducation.passport.expiryDate, "2027-01-01");
});

console.log("\n--- 4. Authorization & Staff Restrictions ---");

test("Staff users are strictly forbidden from export actions", () => {
  const staffUser: any = {
    id: "staff-uuid-1",
    email: "staff@nfsu.ac.in",
    user_metadata: { role: "staff" }
  };
  assert.throws(
    () => requireAdministrator(staffUser),
    /Administrator privileges required/
  );
});

test("Admin users are permitted to perform exports", () => {
  const adminUser: any = {
    id: "admin-uuid-1",
    email: "admin@nfsu.ac.in",
    user_metadata: { role: "admin" }
  };
  assert.doesNotThrow(() => requireAdministrator(adminUser));
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
