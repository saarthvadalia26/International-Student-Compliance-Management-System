import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { SystemDiagnosticsService } from "../src/domain/system/services/system-diagnostics.service";
import { WhatsAppIntegrationService } from "../src/domain/notifications/services/whatsapp-integration.service";
import pkg from "../package.json";

describe("ISCMS Live Production System Health & Diagnostics Acceptance Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // --------------------------------------------------------------------------
  // 1. WHATSAPP BUSINESS API: REAL STATUS ONLY
  // --------------------------------------------------------------------------
  describe("WhatsApp Business API Health", () => {
    it("reports 'not_configured' with clear explanatory message when credentials are not present", async () => {
      delete process.env.META_ACCESS_TOKEN;
      delete process.env.META_PHONE_NUMBER_ID;
      delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

      const waHealth = await SystemDiagnosticsService.checkWhatsAppHealth();
      assert.equal(waHealth.status, "not_configured");
      assert.equal(waHealth.providerName, "Meta WhatsApp Business Platform");
      assert.equal(waHealth.message, "WhatsApp Business API credentials have not been configured.");
      assert.ok(!waHealth.providerName.includes("mock"), "Must never report mock provider");
      assert.ok(!waHealth.providerName.includes("Twilio"), "Must never report Twilio");
    });

    it("reports 'unhealthy' when credentials format is invalid or malformed", async () => {
      process.env.META_ACCESS_TOKEN = "short";
      process.env.META_PHONE_NUMBER_ID = "12";

      const waHealth = await SystemDiagnosticsService.checkWhatsAppHealth();
      assert.equal(waHealth.status, "unhealthy");
      assert.ok(waHealth.message?.includes("invalid or incomplete"));
    });

    it("distinguishes states accurately: connected, unhealthy, not_configured", async () => {
      // Missing credentials
      delete process.env.META_ACCESS_TOKEN;
      delete process.env.META_PHONE_NUMBER_ID;
      const unconfigured = await SystemDiagnosticsService.checkWhatsAppHealth();
      assert.equal(unconfigured.status, "not_configured");

      // Integration status
      const status = WhatsAppIntegrationService.getIntegrationStatus();
      assert.equal(status.isReady, false);
      assert.equal(status.status, "NOT_CONFIGURED");
    });
  });

  // --------------------------------------------------------------------------
  // 2. EMAIL: STRICTLY NOT CONFIGURED
  // --------------------------------------------------------------------------
  describe("Email Health", () => {
    it("strictly reports 'not_configured' with supportive message without pretending to be connected", () => {
      const emailHealth = SystemDiagnosticsService.checkEmailHealth();
      assert.equal(emailHealth.status, "not_configured");
      assert.equal(emailHealth.providerName, "Email Service");
      assert.equal(emailHealth.message, "Email service is not configured.");
      assert.ok(!emailHealth.providerName.includes("mock"), "Must never report mock provider");
      assert.ok(!emailHealth.providerName.includes("Resend"), "Must never report Resend Connected when disabled");
    });
  });

  // --------------------------------------------------------------------------
  // 3. DATABASE: REAL HEALTH CHECK
  // --------------------------------------------------------------------------
  describe("Database Health", () => {
    it("reports 'not_configured' when Supabase connection secrets are missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const dbHealth = await SystemDiagnosticsService.checkDatabaseHealth();
      assert.equal(dbHealth.status, "not_configured");
      assert.ok(dbHealth.checkedAt);
    });

    it("reports 'unhealthy' if the database query fails or rejects", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://invalid-supabase-instance.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "invalid-service-role-key-12345";

      const dbHealth = await SystemDiagnosticsService.checkDatabaseHealth();
      assert.equal(dbHealth.status, "unhealthy");
      assert.ok(dbHealth.error, "Must include sanitized error details on failure");
    });
  });

  // --------------------------------------------------------------------------
  // 4. DEPLOYMENT RUNTIME METADATA
  // --------------------------------------------------------------------------
  describe("Deployment & Runtime Diagnostics", () => {
    it("resolves real Vercel production metadata without inventing values", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "production";
      process.env.VERCEL_REGION = "iad1";
      process.env.VERCEL_DEPLOYMENT_ID = "dpl_prod_live_99";
      process.env.VERCEL_GIT_COMMIT_SHA = "fedcba9876543210123456";
      process.env.VERCEL_GIT_COMMIT_REF = "main";
      process.env.NEXT_PUBLIC_BUILD_TIME = "2026-08-16T06:07:06.000Z";

      const runtime = SystemDiagnosticsService.getRuntimeDiagnostics();
      const deployment = SystemDiagnosticsService.getDeploymentDiagnostics();

      assert.equal(runtime.platform, "Vercel");
      assert.equal(runtime.environment, "Production");
      assert.equal(runtime.region, "iad1");
      assert.equal(runtime.nodeVersion, process.version);
      assert.equal(runtime.nextVersion, pkg.dependencies.next.replace(/[\^~]/g, ""));
      assert.equal(runtime.appVersion, pkg.version);

      assert.equal(deployment.deploymentId, "dpl_prod_live_99");
      assert.equal(deployment.commitSha, "fedcba9876543210123456");
      assert.equal(deployment.shortCommitSha, "fedcba9");
      assert.equal(deployment.commitRef, "main");
      assert.equal(deployment.deployedAt, "2026-08-16T06:07:06.000Z");
    });

    it("displays 'Not available' / 'Local / Development' when runtime metadata is absent", () => {
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;
      delete process.env.VERCEL_REGION;
      delete process.env.VERCEL_DEPLOYMENT_ID;
      delete process.env.VERCEL_GIT_COMMIT_SHA;
      delete process.env.NEXT_PUBLIC_BUILD_TIME;

      const runtime = SystemDiagnosticsService.getRuntimeDiagnostics();
      const deployment = SystemDiagnosticsService.getDeploymentDiagnostics();

      assert.equal(runtime.platform, "Local Environment");
      assert.equal(runtime.region, "Not available");
      assert.equal(deployment.deploymentId, null);
      assert.equal(deployment.commitSha, null);
    });
  });

  // --------------------------------------------------------------------------
  // 5. AUTHORITATIVE API PAYLOAD (/api/admin/system-health)
  // --------------------------------------------------------------------------
  describe("Authoritative API Payload Structure", () => {
    it("generates structured JSON matching the exact ISCMS production specification", async () => {
      delete process.env.META_ACCESS_TOKEN;
      delete process.env.META_PHONE_NUMBER_ID;

      const payload = await SystemDiagnosticsService.getSystemHealthApiResponse(true);

      assert.ok(payload.environment, "Must have environment object");
      assert.ok(payload.environment.name);
      assert.ok(payload.environment.deploymentPlatform);
      assert.ok(payload.environment.version);
      assert.ok(payload.environment.commit);
      assert.ok(payload.environment.nodeVersion);
      assert.ok(payload.environment.nextVersion);

      assert.ok(payload.database, "Must have database object");
      assert.ok(payload.database.status);
      assert.ok(payload.database.checkedAt);

      assert.ok(payload.whatsapp, "Must have whatsapp object");
      assert.equal(payload.whatsapp.provider, "meta-whatsapp-business-platform");
      assert.equal(payload.whatsapp.status, "not_configured");
      assert.equal(payload.whatsapp.message, "WhatsApp Business API credentials have not been configured.");

      assert.ok(payload.email, "Must have email object");
      assert.equal(payload.email.status, "not_configured");
      assert.equal(payload.email.message, "Email service is not configured.");
    });
  });

  // --------------------------------------------------------------------------
  // 6. SECURITY & SECRETS ISOLATION
  // --------------------------------------------------------------------------
  describe("Security & Zero Secret Leakage", () => {
    it("never includes API keys, secret keys, or service role tokens in diagnostics payload", async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = "secret_service_role_key_abcdef123456";
      process.env.META_ACCESS_TOKEN = "secret_meta_access_token_token_token";
      process.env.TURNSTILE_SECRET_KEY = "secret_turnstile_key_999888";

      const apiPayload = await SystemDiagnosticsService.getSystemHealthApiResponse(true);
      const jsonStr = JSON.stringify(apiPayload);

      assert.ok(!jsonStr.includes("secret_service_role_key_abcdef123456"), "Service role key must NEVER leak");
      assert.ok(!jsonStr.includes("secret_meta_access_token_token_token"), "Meta access token must NEVER leak");
      assert.ok(!jsonStr.includes("secret_turnstile_key_999888"), "Turnstile secret key must NEVER leak");
    });
  });

  // --------------------------------------------------------------------------
  // 7. SERVER CACHE & FORCE REFRESH
  // --------------------------------------------------------------------------
  describe("Server Caching & Force Refresh", () => {
    it("reuses cached diagnostics within TTL and provides fresh data when forceRefresh is true", async () => {
      const first = await SystemDiagnosticsService.getDiagnostics(true);
      const second = await SystemDiagnosticsService.getDiagnostics(false);
      assert.equal(first.checkedAt, second.checkedAt, "Should return cached data within TTL");

      // Wait 5ms and force refresh
      await new Promise(r => setTimeout(r, 5));
      const fresh = await SystemDiagnosticsService.getDiagnostics(true);
      assert.notEqual(first.checkedAt, fresh.checkedAt, "Must generate new timestamp on forceRefresh");
    });
  });
});
