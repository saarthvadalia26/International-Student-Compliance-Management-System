import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

describe("ISCMS — Student Portal Direct Token Hash & Session Verification", () => {
  it("generates a hashed_token and verifies directly via verifyOtp without external 302 redirects", async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      console.log("Skipping integration test: missing Supabase credentials in environment");
      return;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const clientInstance = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const testEmail = `test-verify-${Date.now()}@iscms.student.local`;

    // 1. Create test user
    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: { role: "student", full_name: "Test Direct Verify Student" }
    });

    assert.ifError(userErr);
    assert.ok(user?.user?.id);

    try {
      // 2. Generate magiclink
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: testEmail
      });

      assert.ifError(linkErr);
      assert.ok(linkData?.properties?.hashed_token, "hashed_token must be present");

      const tokenHash = linkData.properties.hashed_token;

      // 3. Verify OTP directly on the client using token_hash
      const { data: verifyData, error: verifyErr } = await clientInstance.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink"
      });

      assert.ifError(verifyErr);
      assert.ok(verifyData?.session, "Session must be established directly");
      assert.equal(verifyData.user?.email, testEmail);
      console.log("Direct token_hash verification succeeded! User authenticated:", verifyData.user?.email);
    } finally {
      // Cleanup test user
      if (user?.user?.id) {
        await adminClient.auth.admin.deleteUser(user.user.id);
      }
    }
  });
});
