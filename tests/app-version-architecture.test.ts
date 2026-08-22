import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APP_VERSION, getDisplayAppVersion } from "../src/config/version";
import { Branding } from "../src/config/branding";
import { SystemDiagnosticsService } from "../src/domain/system/services/system-diagnostics.service";
import pkg from "../package.json";

describe("ISCMS — Application Version Architecture", () => {
  it("Test 1: APP_VERSION matches root package.json version canonically", () => {
    assert.equal(typeof APP_VERSION, "string");
    assert.equal(APP_VERSION, pkg.version);
    assert.match(APP_VERSION, /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/);
  });

  it("Test 2: Canonical version is stored without 'v' prefix in package.json", () => {
    assert.equal(APP_VERSION.startsWith("v"), false);
  });

  it("Test 3: getDisplayAppVersion() prepends 'v' prefix correctly", () => {
    assert.equal(getDisplayAppVersion(), `v${pkg.version}`);
    assert.equal(getDisplayAppVersion("0.2.0"), "v0.2.0");
    assert.equal(getDisplayAppVersion("1.0.0"), "v1.0.0");
  });

  it("Test 4: getDisplayAppVersion() is idempotent when given an already-prefixed version", () => {
    assert.equal(getDisplayAppVersion("v0.2.0"), "v0.2.0");
    assert.equal(getDisplayAppVersion("v1.0.0"), "v1.0.0");
  });

  it("Test 5: Branding.appVersion reflects the single source of truth version", () => {
    assert.equal(Branding.appVersion, getDisplayAppVersion(APP_VERSION));
  });

  it("Test 6: SystemDiagnosticsService.getRuntimeDiagnostics() returns canonical appVersion", () => {
    const runtime = SystemDiagnosticsService.getRuntimeDiagnostics();
    assert.equal(runtime.appVersion, APP_VERSION);
    assert.equal(getDisplayAppVersion(runtime.appVersion), `v${APP_VERSION}`);
  });
});
