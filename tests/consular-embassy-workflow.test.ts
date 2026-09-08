/**
 * ISCMS Automated Test Suite: Consular & Embassy Info End-to-End Workflow
 *
 * Verifies:
 * TEST A — Create student without consular info: succeeds, pending information identifies "Consular & Embassy Information".
 * TEST B — Create student with consular info: succeeds, "Consular & Embassy Information" is not pending.
 * TEST C — Edit missing info: adding consular info removes it from pending information.
 * TEST D — Clear info: clearing optional consular fields returns it to pending information.
 * TEST E — Field optionality & format validation: all fields remain optional, email format validation works.
 */

import "./test-preload";
import assert from "node:assert/strict";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { ProfileCompletionEngine } from "../src/domain/students/services/profile-completion.service";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

console.log("\n============================================================");
console.log(" ISCMS TEST SUITE: CONSULAR & EMBASSY WORKFLOW & COMPLETENESS");
console.log("============================================================\n");

// --------------------------------------------------------------------------
// TEST A — CREATE WITHOUT CONSULAR INFO
// --------------------------------------------------------------------------
test("TEST A — Create without consular info: succeeds, Pending Information identifies missing consular info", () => {
  const payloadWithoutConsular = {
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    dateOfBirth: "2001-05-20",
    gender: "female",
    // Consular fields intentionally left empty/undefined
    embassyName: "",
    embassyAddress: "",
    embassyCity: "",
    embassyCountry: "",
    embassyPhone: "",
    embassyEmail: "",
    embassyWebsite: "",
    embassyContactPerson: ""
  };

  // 1. Zod validation for registration must succeed
  const parseResult = RegisterStudentValidationSchema.safeParse(payloadWithoutConsular);
  assert.equal(parseResult.success, true, "Registration schema must succeed with empty consular fields");

  // 2. Profile completion evaluation must detect missing Consular & Embassy Information
  const evaluation = ProfileCompletionEngine.evaluate({
    fullName: payloadWithoutConsular.fullName,
    nationalityCode: payloadWithoutConsular.nationalityCode,
    dateOfBirth: payloadWithoutConsular.dateOfBirth,
    gender: payloadWithoutConsular.gender,
    embassyName: null,
    embassyAddress: null
  });

  assert.ok(
    evaluation.missingItems.includes("Consular & Embassy Information"),
    "Pending Information must explicitly identify 'Consular & Embassy Information'"
  );

  const consularSection = evaluation.sections.find(s => s.id === "consular");
  assert.ok(consularSection, "Consular section must exist in section evaluation");
  assert.equal(consularSection.percentage, 0, "Consular section percentage must be 0% when empty");
  assert.ok(consularSection.missingFields.includes("Consular & Embassy Information"), "Missing fields must include the section item");
});

// --------------------------------------------------------------------------
// TEST B — CREATE WITH CONSULAR INFO
// --------------------------------------------------------------------------
test("TEST B — Create with consular info: succeeds, Consular & Embassy Information is not pending", () => {
  const payloadWithConsular = {
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    dateOfBirth: "2001-05-20",
    gender: "female",
    embassyName: "Embassy of the Russian Federation",
    embassyAddress: "Shantipath, Chanakyapuri, New Delhi",
    embassyCity: "New Delhi",
    embassyCountry: "Russia",
    embassyPhone: "+91-11-2611-0640",
    embassyEmail: "indconsul@yandex.ru",
    embassyWebsite: "https://india.mid.ru",
    embassyContactPerson: "First Secretary (Consular)"
  };

  // 1. Zod validation succeeds
  const parseResult = RegisterStudentValidationSchema.safeParse(payloadWithConsular);
  assert.equal(parseResult.success, true, "Registration schema must accept valid consular information");

  // 2. Profile completion evaluation must NOT flag consular info as missing
  const evaluation = ProfileCompletionEngine.evaluate({
    fullName: payloadWithConsular.fullName,
    nationalityCode: payloadWithConsular.nationalityCode,
    embassy: {
      name: payloadWithConsular.embassyName,
      address: payloadWithConsular.embassyAddress,
      city: payloadWithConsular.embassyCity,
      country: payloadWithConsular.embassyCountry,
      phone: payloadWithConsular.embassyPhone,
      email: payloadWithConsular.embassyEmail,
      website: payloadWithConsular.embassyWebsite,
      contactPerson: payloadWithConsular.embassyContactPerson
    }
  });

  assert.ok(
    !evaluation.missingItems.includes("Consular & Embassy Information"),
    "Consular & Embassy Information must NOT be in missingItems when provided"
  );

  const consularSection = evaluation.sections.find(s => s.id === "consular");
  assert.ok(consularSection, "Consular section must exist");
  assert.equal(consularSection.percentage, 100, "Consular section percentage must be 100% when populated");
  assert.equal(consularSection.missingFields.length, 0, "No missing fields in consular section");
});

// --------------------------------------------------------------------------
// TEST C — EDIT MISSING INFO
// --------------------------------------------------------------------------
test("TEST C — Edit missing info: adding consular information to incomplete student removes it from pending", () => {
  const initialStudent = {
    fullName: "Khadija Noor",
    nationalityCode: "PAK",
    email: "khadija@example.com",
    embassyName: null,
    embassyAddress: null
  };

  // Initial evaluation: missing
  const initialEval = ProfileCompletionEngine.evaluate(initialStudent);
  assert.ok(initialEval.missingItems.includes("Consular & Embassy Information"), "Initial state has missing consular info");

  // Staff updates consular info
  const updatedStudent = {
    ...initialStudent,
    embassy: {
      name: "High Commission of Pakistan",
      address: "2/50-G, Shantipath, Chanakyapuri, New Delhi",
      city: "New Delhi",
      country: "Pakistan",
      phone: "+91-11-2688-9033",
      email: "consular@pakhc.org.in",
      website: "https://pakhc.org.in",
      contactPerson: "Consular Attaché"
    }
  };

  const updatedEval = ProfileCompletionEngine.evaluate(updatedStudent);
  assert.ok(
    !updatedEval.missingItems.includes("Consular & Embassy Information"),
    "After update, Consular & Embassy Information must disappear from pending"
  );
  assert.ok(
    updatedEval.percentage > initialEval.percentage,
    `Profile completion percentage must increase (was ${initialEval.percentage}%, now ${updatedEval.percentage}%)`
  );
});

// --------------------------------------------------------------------------
// TEST D — CLEAR INFO
// --------------------------------------------------------------------------
test("TEST D — Clear info: clearing optional consular fields returns it to pending information", () => {
  const populatedStudent = {
    fullName: "Carlos Silva",
    nationalityCode: "BRA",
    embassy: {
      name: "Embassy of Brazil",
      address: "8, Aurangzeb Road, New Delhi",
      city: "New Delhi",
      country: "Brazil",
      phone: "+91-11-2301-7301",
      email: "brasemb.delhi@itamaraty.gov.br",
      website: "https://novadelhi.itamaraty.gov.br",
      contactPerson: "Vice Consul"
    }
  };

  const populatedEval = ProfileCompletionEngine.evaluate(populatedStudent);
  assert.ok(!populatedEval.missingItems.includes("Consular & Embassy Information"), "Populated student has no consular pending item");

  // Staff clears all consular fields
  const clearedStudent = {
    fullName: "Carlos Silva",
    nationalityCode: "BRA",
    embassy: {
      name: "Not Specified",
      address: "Not Specified",
      city: "",
      country: "",
      phone: "",
      email: "",
      website: "",
      contactPerson: ""
    },
    embassyName: "",
    embassyAddress: "",
    embassyCity: "",
    embassyCountry: "",
    embassyPhone: "",
    embassyEmail: "",
    embassyWebsite: "",
    embassyContactPerson: ""
  };

  const clearedEval = ProfileCompletionEngine.evaluate(clearedStudent);
  assert.ok(
    clearedEval.missingItems.includes("Consular & Embassy Information"),
    "After clearing consular info, Consular & Embassy Information must reappear in missingItems"
  );
  const clearedSection = clearedEval.sections.find(s => s.id === "consular");
  assert.equal(clearedSection?.percentage, 0, "Consular section percentage must return to 0%");
  assert.ok(
    clearedEval.percentage < populatedEval.percentage,
    `Profile completion score must decrease when consular info is cleared (${clearedEval.percentage}% < ${populatedEval.percentage}%)`
  );
});

// --------------------------------------------------------------------------
// TEST E — FIELD OPTIONALITY & VALIDATION FORMAT
// --------------------------------------------------------------------------
test("TEST E — Field optionality & validation format: all fields optional, email format verified", () => {
  // 1. All fields omitted
  const omittedResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Tenzin Wangchuk"
  });
  assert.equal(omittedResult.success, true, "Register schema allows completely omitting consular fields");

  // 2. All fields null
  const nullResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Tenzin Wangchuk",
    embassyName: null,
    embassyAddress: null,
    embassyCity: null,
    embassyCountry: null,
    embassyPhone: null,
    embassyEmail: null,
    embassyWebsite: null,
    embassyContactPerson: null
  });
  assert.equal(nullResult.success, true, "Register schema allows null for all consular fields");

  // 3. Update schema allows partial consular updates
  const updateResult = UpdateStudentValidationSchema.safeParse({
    embassyPhone: "+91 9988776655"
  });
  assert.equal(updateResult.success, true, "Update schema allows updating only phone");

  // 4. Invalid consular email is rejected with descriptive error
  const invalidEmailResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Tenzin Wangchuk",
    embassyEmail: "not-a-valid-email"
  });
  assert.equal(invalidEmailResult.success, false, "Invalid email format must be rejected");
  if (!invalidEmailResult.success) {
    const emailIssue = invalidEmailResult.error.issues.find(i => i.path.includes("embassyEmail"));
    assert.ok(emailIssue, "Must report error on embassyEmail path");
    assert.equal(emailIssue.message, "Invalid consular email address format");
  }

  // 5. Valid consular email is accepted
  const validEmailResult = RegisterStudentValidationSchema.safeParse({
    fullName: "Tenzin Wangchuk",
    embassyEmail: "embassy.delhi@gov.bt"
  });
  assert.equal(validEmailResult.success, true, "Valid email format must be accepted");
});

console.log("\n============================================================");
console.log(` RESULTS: ${passed} passed, ${failed} failed`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
}
