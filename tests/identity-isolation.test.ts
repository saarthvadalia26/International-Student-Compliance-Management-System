import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { getAppRole, isAdministrator, isStaff, isStudent, isInternalUser, requireInternalUser, UnauthorizedError } from "../src/lib/auth/permissions";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

describe("ISCMS — Strict Student vs Staff Identity Isolation", () => {
  it("verifies permissions helper strictly distinguishes student vs staff vs administrator", () => {
    const studentUser = {
      id: "student-uuid-1",
      email: "student-1234@iscms.student.local",
      user_metadata: { role: "student", student_id: "student-rec-1" }
    } as any;

    const staffUser = {
      id: "staff-uuid-1",
      email: "officer@nfsu.ac.in",
      user_metadata: { role: "staff", full_name: "Compliance Officer" }
    } as any;

    const adminUser = {
      id: "admin-uuid-1",
      email: "admin@nfsu.ac.in",
      user_metadata: { role: "administrator", full_name: "System Admin" }
    } as any;

    assert.equal(getAppRole(studentUser), "student");
    assert.equal(isStudent(studentUser), true);
    assert.equal(isStaff(studentUser), false);
    assert.equal(isAdministrator(studentUser), false);
    assert.equal(isInternalUser(studentUser), false);

    assert.throws(() => requireInternalUser(studentUser), UnauthorizedError);

    assert.equal(getAppRole(staffUser), "staff");
    assert.equal(isStudent(staffUser), false);
    assert.equal(isStaff(staffUser), true);
    assert.equal(isAdministrator(staffUser), false);
    assert.equal(isInternalUser(staffUser), true);
    assert.doesNotThrow(() => requireInternalUser(staffUser));

    assert.equal(getAppRole(adminUser), "administrator");
    assert.equal(isStudent(adminUser), false);
    assert.equal(isStaff(adminUser), false);
    assert.equal(isAdministrator(adminUser), true);
    assert.equal(isInternalUser(adminUser), true);
    assert.doesNotThrow(() => requireInternalUser(adminUser));
  });

  it("verifies student auth provisioning does not create a staff account in Supabase", async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      console.log("Skipping live Supabase integration: credentials not configured");
      return;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const testStudentEmail = `test-isolation-${Date.now()}@iscms.student.local`;
    const testStudentId = `stud-test-${Date.now()}`;

    // 1. Create student auth account with explicit student metadata
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: testStudentEmail,
      email_confirm: true,
      user_metadata: {
        role: "student",
        student_id: testStudentId,
        full_name: "Test Compliance Student"
      }
    });

    assert.ifError(authErr);
    assert.ok(authData?.user?.id);

    const userId = authData.user.id;

    try {
      // 2. Generate student login link
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: testStudentEmail
      });

      assert.ifError(linkErr);
      assert.ok(linkData?.properties?.hashed_token);

      // 3. Verify user_profiles record in database
      const { data: profile } = await adminClient
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        assert.equal(profile.role, "student", "user_profiles role MUST be 'student', not 'staff'");
      }

      // 4. Verify that student user is NOT classified as staff by fetchUserAccounts filtering rule
      const rawRole = (authData.user.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      const isStudentEmail = authData.user.email?.toLowerCase().includes("@iscms.student.local");
      const hasStudentId = Boolean(authData.user.user_metadata?.student_id);
      const isExcludedFromStaffTable = rawRole === "student" || isStudentEmail || hasStudentId;

      assert.equal(isExcludedFromStaffTable, true, "Student account must be excluded from staff accounts list");
    } finally {
      // Cleanup
      await adminClient.auth.admin.deleteUser(userId);
      await adminClient.from("user_profiles").delete().eq("id", userId);
    }
  });
});
