import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sanitizeBaseUrl, getEnvironmentAppUrl, getRequestOrigin } from "../src/config/app-url";

describe("ISCMS — Application URL & Student Portal Redirect Strategy", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. URL Sanitization", () => {
    it("trims whitespace and trailing slashes correctly", () => {
      assert.equal(sanitizeBaseUrl("  https://iscms.nfsu.edu///  "), "https://iscms.nfsu.edu");
      assert.equal(sanitizeBaseUrl("http://localhost:3000/"), "http://localhost:3000");
    });

    it("ensures protocol prefix if missing", () => {
      assert.equal(sanitizeBaseUrl("iscms.nfsu.edu"), "https://iscms.nfsu.edu");
      assert.equal(sanitizeBaseUrl("iscms.vercel.app/"), "https://iscms.vercel.app");
    });
  });

  describe("2. Environment Hierarchy Resolution (getEnvironmentAppUrl)", () => {
    it("resolves NEXT_PUBLIC_APP_URL when configured", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://custom-portal.university.edu";
      assert.equal(getEnvironmentAppUrl(), "https://custom-portal.university.edu");
    });

    it("resolves NEXT_PUBLIC_SITE_URL when APP_URL is absent", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://site-portal.university.edu/";
      assert.equal(getEnvironmentAppUrl(), "https://site-portal.university.edu");
    });

    it("resolves VERCEL_PROJECT_PRODUCTION_URL in production Vercel deployment", () => {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "iscms-production.vercel.app";
      assert.equal(getEnvironmentAppUrl(), "https://iscms-production.vercel.app");
    });

    it("resolves VERCEL_URL in Vercel preview / branch deployment", () => {
      process.env.VERCEL_URL = "iscms-git-develop-v020.vercel.app";
      assert.equal(getEnvironmentAppUrl(), "https://iscms-git-develop-v020.vercel.app");
    });

    it("falls back to http://localhost:3000 when no environment variables are set in development", () => {
      assert.equal(getEnvironmentAppUrl(), "http://localhost:3000");
    });
  });

  describe("3. Request Origin Dynamic Resolution (getRequestOrigin)", () => {
    it("uses explicitly supplied baseUrl parameter when available", async () => {
      const origin = await getRequestOrigin("https://live-browser-origin.com/");
      assert.equal(origin, "https://live-browser-origin.com");
    });

    it("falls back to environment when explicit fallback is not provided and headers are outside context", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://iscms-deployed.edu";
      const origin = await getRequestOrigin();
      assert.equal(origin, "https://iscms-deployed.edu");
    });
  });

  describe("4. Student Portal Redirect Path Construction", () => {
    it("constructs secure dashboard target redirect avoiding localhost in production", async () => {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "iscms.vercel.app";
      const origin = await getRequestOrigin();
      const targetRedirect = `${origin}/student/dashboard`;
      assert.equal(targetRedirect, "https://iscms.vercel.app/student/dashboard");
      assert.equal(targetRedirect.includes("localhost"), false);
    });

    it("constructs secure renewal upload target redirect avoiding localhost in production", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://iscms.nfsu.edu.in";
      const origin = await getRequestOrigin();
      const targetRedirect = `${origin}/student/efrro`;
      assert.equal(targetRedirect, "https://iscms.nfsu.edu.in/student/efrro");
      assert.equal(targetRedirect.includes("localhost"), false);
    });
  });
});
