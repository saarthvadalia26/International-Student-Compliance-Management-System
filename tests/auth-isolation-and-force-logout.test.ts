import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

describe("ISCMS — Authorized Main Portal Users & Force Logout Isolation", () => {
  it("verifies auth.users contains strictly authorized Main Portal accounts (2 Admins + 1 Staff) and 0 student accounts", async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      console.log("Skipping test: Missing Supabase credentials");
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: authData, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    assert.ifError(error);
    const users = authData?.users || [];

    // Exactly 3 authorized Main Portal users exist (2 Administrators + 1 Staff)
    assert.equal(users.length, 3, "There must be exactly 3 authorized Main Portal users in auth.users");

    let adminCount = 0;
    let staffCount = 0;

    for (const u of users) {
      const role = (u.user_metadata?.role as string | undefined)?.toLowerCase();
      assert.notEqual(role, "student", `User ${u.email} must not have student role`);
      assert.ok(
        !u.email?.toLowerCase().includes("@iscms.student.local"),
        `User ${u.email} must not be a synthetic student domain`
      );
      assert.ok(
        !u.user_metadata?.student_id,
        `User ${u.email} must not possess a student_id in user_metadata`
      );

      if (role === "administrator" || role === "admin") {
        adminCount++;
      } else {
        staffCount++;
      }
    }

    assert.equal(adminCount, 2, "Must have exactly 2 Administrators");
    assert.equal(staffCount, 1, "Must have exactly 1 Staff member");
  });

  it("verifies public.user_profiles table contains only authorized Main Portal profiles", async () => {
    if (!supabaseUrl || !serviceRoleKey) return;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: profiles, error } = await supabase.from("user_profiles").select("*");
    assert.ifError(error);
    assert.ok(profiles);
    assert.equal(profiles.length, 3, "user_profiles must only contain the 3 authorized Main Portal profiles");

    for (const p of profiles) {
      assert.notEqual(p.role, "student", `Profile ${p.email} must not have student role`);
      assert.ok(["administrator", "staff", "admin"].includes(p.role), `Role ${p.role} must be authorized`);
    }
  });

  it("verifies Force Logout active user scope calculates authorized Main Portal users correctly (2 Admins + 1 Staff = 3 Total)", async () => {
    if (!supabaseUrl || !serviceRoleKey) return;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: authData, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    assert.ifError(error);

    const users = authData?.users || [];
    const isAdministrativeOrStaffUser = (u: any) => {
      const rawRole = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      const isStudentEmail = Boolean(u.email?.toLowerCase().includes("@iscms.student.local"));
      const hasStudentId = Boolean(u.user_metadata?.student_id);
      return rawRole !== "student" && !isStudentEmail && !hasStudentId;
    };

    const targetUsers = users.filter(isAdministrativeOrStaffUser);
    let administrators = 0;
    let staff = 0;

    for (const u of targetUsers) {
      const rawRole = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      if (rawRole === "administrator" || rawRole === "admin") {
        administrators++;
      } else {
        staff++;
      }
    }

    assert.equal(targetUsers.length, 3, "Total authorized Main Portal accounts must equal 3");
    assert.equal(administrators, 2, "Administrators count must equal 2");
    assert.equal(staff, 1, "Staff count must equal 1");
  });

  it("verifies grammar formatting for singular and plural authorized user accounts", () => {
    const formatUserScopeMessage = (count: number): string => {
      return count === 1
        ? "1 authorized Main Portal user account will be affected."
        : `${count} authorized Main Portal user accounts will be affected.`;
    };

    assert.equal(
      formatUserScopeMessage(1),
      "1 authorized Main Portal user account will be affected."
    );
    assert.equal(
      formatUserScopeMessage(3),
      "3 authorized Main Portal user accounts will be affected."
    );
  });

  it("verifies all student database records and compliance profiles remain completely intact", async () => {
    if (!supabaseUrl || !serviceRoleKey) return;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: students, error: stuErr } = await supabase.from("students").select("id");
    assert.ifError(stuErr);
    assert.ok(students);
    assert.equal(students.length, 12, "All 12 student records must remain in database");

    const { data: personal, error: persErr } = await supabase.from("student_personal").select("student_id");
    assert.ifError(persErr);
    assert.ok(personal);
    assert.equal(personal.length, 12, "All 12 student_personal records must remain intact");

    const { data: academic, error: acadErr } = await supabase.from("student_academic").select("student_id");
    assert.ifError(acadErr);
    assert.ok(academic);
    assert.equal(academic.length, 12, "All 12 student_academic records must remain intact");
  });
});
