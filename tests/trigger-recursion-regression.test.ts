import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

describe("Trigger Recursion & User Profile Synchronization Regression Suite (SQLSTATE 54001 Prevention)", () => {
  let supabase: any;
  const testUserEmail = `audit-test-${Date.now()}@nfsu.ac.in`;
  let createdAuthUserId: string | null = null;

  before(() => {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key in environment");
    }
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  after(async () => {
    // Cleanup temporary test user
    if (createdAuthUserId) {
      await supabase.auth.admin.deleteUser(createdAuthUserId);
      await supabase.from("user_profiles").delete().eq("id", createdAuthUserId);
    }
  });

  it("1. Creating a user in auth.users does not recurse and successfully synchronizes to user_profiles", async () => {
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: "TestPassword123!@#",
      email_confirm: true,
      user_metadata: {
        full_name: "Audit Test Officer",
        role: "staff"
      },
      app_metadata: {
        role: "staff"
      }
    });

    assert.ifError(createError);
    assert.ok(authUser.user?.id, "Auth user must have an id");
    createdAuthUserId = authUser.user.id;

    // Verify user profile exists in public.user_profiles
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", createdAuthUserId)
      .single();

    assert.ifError(profileErr);
    assert.ok(profile, "Profile must exist in public.user_profiles");
    assert.equal(profile.email, testUserEmail);
    assert.equal(profile.full_name, "Audit Test Officer");
    assert.equal(profile.role, "staff");
    assert.equal(profile.is_profile_complete, true);
  });

  it("2. Updating relevant auth user metadata does not cause recursion (SQLSTATE 54001)", async () => {
    assert.ok(createdAuthUserId, "Test user must exist");

    const updatedName = "Audit Test Officer Senior";
    const { data: updatedAuth, error: updateError } = await supabase.auth.admin.updateUserById(
      createdAuthUserId,
      {
        user_metadata: {
          full_name: updatedName,
          role: "administrator"
        },
        app_metadata: {
          role: "administrator"
        }
      }
    );

    assert.ifError(updateError);
    assert.ok(updatedAuth.user);

    // Verify profile updated without recursion
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", createdAuthUserId)
      .single();

    assert.ifError(profileErr);
    assert.equal(profile.full_name, updatedName);
    assert.equal(profile.role, "administrator");
  });

  it("3. Updating public.user_profiles directly does not trigger recursive writes to auth.users", async () => {
    assert.ok(createdAuthUserId, "Test user must exist");

    const directUpdateTimestamp = new Date().toISOString();
    const { data: updatedProfile, error: profileErr } = await supabase
      .from("user_profiles")
      .update({
        full_name: "Audit Officer Direct Update",
        updated_at: directUpdateTimestamp
      })
      .eq("id", createdAuthUserId)
      .select()
      .single();

    assert.ifError(profileErr);
    assert.equal(updatedProfile.full_name, "Audit Officer Direct Update");

    // Fetch auth.users to confirm no infinite loop occurred and user remains consistent
    const { data: authCheck, error: authCheckErr } = await supabase.auth.admin.getUserById(createdAuthUserId);
    assert.ifError(authCheckErr);
    assert.ok(authCheck.user);
  });

  it("4. A single logical update completes in a single atomic step without stack exhaustion", async () => {
    assert.ok(createdAuthUserId, "Test user must exist");

    const startTime = Date.now();
    const { error: batchErr } = await supabase
      .from("user_profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", createdAuthUserId);

    const elapsedMs = Date.now() - startTime;

    assert.ifError(batchErr);
    // Stack exhaustion would either throw 54001 or timeout (>10,000ms). A single query completes in < 500ms.
    assert.ok(elapsedMs < 2000, `Update took ${elapsedMs}ms, suggesting no runaway recursion`);
  });

  it("5. Existing profile synchronization behavior preserves role hierarchy and profile completeness", async () => {
    assert.ok(createdAuthUserId, "Test user must exist");

    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("id, email, role, is_profile_complete")
      .eq("id", createdAuthUserId)
      .single();

    assert.ifError(profileErr);
    assert.equal(profile.role, "administrator", "Administrator role must not be accidentally demoted");
    assert.equal(profile.is_profile_complete, true, "Profile completeness must be preserved");
  });
});
