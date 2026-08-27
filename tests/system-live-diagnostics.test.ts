import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { SystemDiagnosticsService } from "../src/domain/system/services/system-diagnostics.service";
import { WhatsAppIntegrationService } from "../src/domain/notifications/services/whatsapp-integration.service";
import pkg from "../package.json";

describe("ISCMS Real Live Production Diagnostics Acceptance Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // 1. Runtime Environment Resolution: Vercel Production
  it("Test 1: Resolves Vercel Production runtime environment variables correctly", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_REGION = "iad1";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_abc123456";
    process.env.VERCEL_GIT_COMMIT_SHA = "a8f4c21987654321fedcba";
    process.env.VERCEL_GIT_COMMIT_REF = "main";
    process.env.NEXT_PUBLIC_BUILD_TIME = "2026-08-16T06:07:06.000Z";

    const runtime = SystemDiagnosticsService.getRuntimeDiagnostics();
    const deployment = SystemDiagnosticsService.getDeploymentDiagnostics();

    assert.equal(runtime.platform, "Vercel", "Platform must be Vercel when VERCEL is set");
    assert.equal(runtime.environment, "Production", "Environment must be formatted as Production");
    assert.equal(runtime.region, "iad1", "Region must match VERCEL_REGION");
    assert.equal(runtime.nodeVersion, process.version, "Node.js version must match runtime process.version");
    assert.equal(runtime.nextVersion, pkg.dependencies.next.replace(/[\^~]/g, ""), "Next.js version must match package.json dependency");
    assert.equal(runtime.appVersion, pkg.version, "App version must match package.json version");

    assert.equal(deployment.deploymentId, "dpl_abc123456", "Deployment ID must match VERCEL_DEPLOYMENT_ID");
    assert.equal(deployment.commitSha, "a8f4c21987654321fedcba", "Full commit SHA must be preserved");
    assert.equal(deployment.shortCommitSha, "a8f4c21", "Short commit SHA must be 7 characters");
    assert.equal(deployment.commitRef, "main", "Branch must match VERCEL_GIT_COMMIT_REF");
    assert.equal(deployment.deployedAt, "2026-08-16T06:07:06.000Z", "Deployed timestamp must reflect build timestamp");
  });

  // 2. Runtime Environment Resolution: Vercel Preview
  it("Test 2: Resolves Vercel Preview environment correctly", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_REGION = "sfo1";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_preview987";
    process.env.VERCEL_GIT_COMMIT_SHA = "b7e3d1054321";
    process.env.VERCEL_GIT_COMMIT_REF = "feature/diagnostics";

    const runtime = SystemDiagnosticsService.getRuntimeDiagnostics();
    const deployment = SystemDiagnosticsService.getDeploymentDiagnostics();

    assert.equal(runtime.platform, "Vercel");
    assert.equal(runtime.environment, "Preview", "Preview deployment must be correctly identified");
    assert.equal(runtime.region, "sfo1");
    assert.equal(deployment.commitRef, "feature/diagnostics");
    assert.equal(deployment.shortCommitSha, "b7e3d10");
  });

  // 3. Local Fallback Environment
  it("Test 3: Resolves local environment cleanly without inventing false regions or platforms", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_REGION;
    delete process.env.VERCEL_DEPLOYMENT_ID;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const runtime = SystemDiagnosticsService.getRuntimeDiagnostics();
    const deployment = SystemDiagnosticsService.getDeploymentDiagnostics();

    assert.equal(runtime.platform, "Local Environment", "Platform must reflect local environment");
    assert.equal(runtime.environment, "Development");
    assert.equal(runtime.region, "Not available", "Region must state Not available");
    assert.equal(deployment.deploymentId, null);
    assert.equal(deployment.commitSha, null);
    assert.equal(deployment.shortCommitSha, null);
  });

  // 4. WhatsApp Business API: Not configured
  it("Test 4: WhatsApp provider reports 'not_configured' when credentials are not set (no mock provider)", async () => {
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;

    const integration = WhatsAppIntegrationService.getIntegrationStatus();
    assert.equal(integration.status, "NOT_CONFIGURED");
    assert.equal(integration.isReady, false);

    const waHealth = await SystemDiagnosticsService.checkWhatsAppHealth();
    assert.equal(waHealth.status, "not_configured");
    assert.equal(waHealth.providerName, "Meta WhatsApp Business Platform");
    assert.equal(waHealth.message, "WhatsApp Business API credentials have not been configured.");
    assert.ok(!waHealth.providerName.includes("mock"), "Must never report mock-whatsapp-provider");
  });

  // 5. Email Provider: Strictly Not Configured
  it("Test 5: Email provider reports strictly 'not_configured' (no mock provider, no fake unhealthy status)", () => {
    const emailHealth = SystemDiagnosticsService.checkEmailHealth();
    assert.equal(emailHealth.status, "not_configured");
    assert.equal(emailHealth.providerName, "Email Service");
    assert.equal(emailHealth.message, "Email service is not configured.");
    assert.ok(!emailHealth.providerName.includes("mock"), "Must never report mock-email-provider");
  });

  // 6. Bot Protection: Cloudflare Turnstile Configuration Check
  it("Test 6: Bot Protection evaluates Turnstile configuration accurately", () => {
    // Case A: Unconfigured
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    const unconfigured = SystemDiagnosticsService.checkBotProtectionHealth();
    assert.equal(unconfigured.status, "not_configured");
    assert.equal(unconfigured.providerName, "Cloudflare Turnstile");

    // Case B: Configured
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "0x4AAAAAAAB123456789";
    const configured = SystemDiagnosticsService.checkBotProtectionHealth();
    assert.equal(configured.status, "configured");
    assert.equal(configured.providerName, "Cloudflare Turnstile");
  });

  // 7. Security Allowlist: No Secrets Leaked
  it("Test 7: System diagnostics payload strictly enforces allowlist and never leaks secrets", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "super-secret-service-role-key-1234567890";
    process.env.META_ACCESS_TOKEN = "super-secret-meta-access-token-987654321";
    process.env.TURNSTILE_SECRET_KEY = "super-secret-turnstile-secret-key-112233";

    const runtime = SystemDiagnosticsService.getRuntimeDiagnostics();
    const deployment = SystemDiagnosticsService.getDeploymentDiagnostics();
    const email = SystemDiagnosticsService.checkEmailHealth();
    const bot = SystemDiagnosticsService.checkBotProtectionHealth();

    const partialPayload = JSON.stringify({ runtime, deployment, email, bot });

    assert.ok(!partialPayload.includes("super-secret-service-role-key-1234567890"), "Service role key must NEVER appear in diagnostics");
    assert.ok(!partialPayload.includes("super-secret-meta-access-token-987654321"), "Meta access token must NEVER appear in diagnostics");
    assert.ok(!partialPayload.includes("super-secret-turnstile-secret-key-112233"), "Turnstile secret key must NEVER appear in diagnostics");
  });

  // 8. Distinction between Deployed Time and Request Time
  it("Test 8: Distinguishes between Deployment Timestamp and Last Checked (Request) Timestamp", () => {
    process.env.NEXT_PUBLIC_BUILD_TIME = "2026-08-16T06:07:06.000Z";

    const deployment = SystemDiagnosticsService.getDeploymentDiagnostics();
    const checkedAt = new Date().toISOString();

    assert.equal(deployment.deployedAt, "2026-08-16T06:07:06.000Z");
    assert.notEqual(deployment.deployedAt, checkedAt, "Deployed timestamp must remain static while request checkedAt changes");
  });
});
