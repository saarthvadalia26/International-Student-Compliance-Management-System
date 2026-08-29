import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

describe("ISCMS — Student Auth Removal & Force Logout Isolation", () => {
  it("verifies auth.users contains strictly administrative accounts and 0 student accounts", async () => {
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

    // Exactly 2 administrative users exist
    assert.equal(users.length, 2, "There must be exactly 2 administrative users in auth.users");

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
    }
  });

  it("verifies public.user_profiles table contains only administrative accounts", async () => {
    if (!supabaseUrl || !serviceRoleKey) return;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: profiles, error } = await supabase.from("user_profiles").select("*");
    assert.ifError(error);
    assert.ok(profiles);
    assert.equal(profiles.length, 2, "user_profiles must only contain the 2 administrative profiles");

    for (const p of profiles) {
      assert.notEqual(p.role, "student", `Profile ${p.email} must not have student role`);
      assert.equal(p.role, "administrator");
    }
  });

  it("verifies Force Logout active user count returns exactly 2", async () => {
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
    const filteredAdminStaff = users.filter(u => {
      const rawRole = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      const isStudentEmail = Boolean(u.email?.toLowerCase().includes("@iscms.student.local"));
      const hasStudentId = Boolean(u.user_metadata?.student_id);
      return rawRole !== "student" && !isStudentEmail && !hasStudentId;
    });

    assert.equal(filteredAdminStaff.length, 2, "Force Logout target count must equal exactly 2");
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
