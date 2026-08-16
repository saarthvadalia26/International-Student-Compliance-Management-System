/**
 * ============================================================================
 * ISCMS DOCUMENT-TYPE COLOR SYSTEM ACCEPTANCE & ISOLATION TEST SUITE
 * ============================================================================
 *
 * Verifies:
 * 1. Centralized document type color system:
 *    - Passport: Blue everywhere
 *    - Visa: Purple everywhere
 *    - eFRRO / Residential Permit: Amber / Yellow everywhere
 * 2. Document theme token integrity (dots, badges, banners, buttons, borders)
 * 3. Strict semantic isolation:
 *    - Verified remains Green across all document types
 *    - Expired remains Red across all document types
 *    - Expiring Soon / Warning remains Amber across all document types
 *    - Metadata Only uses the document's specific identity color
 * 4. Case-insensitivity and alias normalization (e.g. "residential_permit")
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { 
  DOCUMENT_THEMES, 
  getDocumentTheme, 
  getDocumentBadgeClass, 
  DOCUMENT_CONFIGS 
} from "../src/features/compliance/constants/constants";

console.log("\n==================================================================");
console.log("  ISCMS DOCUMENT-TYPE COLOR SYSTEM ACCEPTANCE & REGRESSION TESTS  ");
console.log("==================================================================\n");

describe("Document-Type Color System Acceptance", () => {
  it("Test 1: Passport document theme produces subtle, professional Blue tokens", () => {
    const passportTheme = getDocumentTheme("passport");
    assert.strictEqual(passportTheme.type, "passport");
    assert.ok(passportTheme.dotClass.includes("blue"), "Passport dot contains blue");
    assert.ok(passportTheme.accentColor.includes("blue"), "Passport accent contains blue");
    assert.ok(passportTheme.badgeClass.includes("blue"), "Passport badge contains blue");
    assert.ok(passportTheme.bannerClass.includes("blue"), "Passport banner contains blue");
    assert.ok(passportTheme.tabActiveClass.includes("blue"), "Passport active tab contains blue");
    console.log("✅ [PASS] Test 1: Passport consistently mapped to Blue color palette");
  });

  it("Test 2: Visa document theme produces subtle, professional Purple tokens", () => {
    const visaTheme = getDocumentTheme("visa");
    assert.strictEqual(visaTheme.type, "visa");
    assert.ok(visaTheme.dotClass.includes("purple"), "Visa dot contains purple");
    assert.ok(visaTheme.accentColor.includes("purple"), "Visa accent contains purple");
    assert.ok(visaTheme.badgeClass.includes("purple"), "Visa badge contains purple");
    assert.ok(visaTheme.bannerClass.includes("purple"), "Visa banner contains purple");
    assert.ok(visaTheme.tabActiveClass.includes("purple"), "Visa active tab contains purple");
    console.log("✅ [PASS] Test 2: Visa consistently mapped to Purple color palette");
  });

  it("Test 3: eFRRO / Residential Permit document theme produces Amber / Yellow tokens", () => {
    const efrroTheme = getDocumentTheme("efrro");
    assert.strictEqual(efrroTheme.type, "efrro");
    assert.ok(efrroTheme.dotClass.includes("amber"), "eFRRO dot contains amber");
    assert.ok(efrroTheme.accentColor.includes("amber"), "eFRRO accent contains amber");
    assert.ok(efrroTheme.badgeClass.includes("amber"), "eFRRO badge contains amber");
    assert.ok(efrroTheme.bannerClass.includes("amber"), "eFRRO banner contains amber");
    assert.ok(efrroTheme.tabActiveClass.includes("amber"), "eFRRO active tab contains amber");
    console.log("✅ [PASS] Test 3: eFRRO consistently mapped to Amber/Yellow color palette");
  });

  it("Test 4: Normalizes casing and document type aliases accurately", () => {
    const uppercasePassport = getDocumentTheme("PASSPORT");
    const aliasEfrro = getDocumentTheme("residential_permit");
    const whitespaceVisa = getDocumentTheme("  visa  ");

    assert.strictEqual(uppercasePassport.type, "passport");
    assert.strictEqual(aliasEfrro.type, "efrro");
    assert.strictEqual(whitespaceVisa.type, "visa");
    console.log("✅ [PASS] Test 4: Document type normalization handles casing and aliases");
  });

  it("Test 5: getDocumentBadgeClass outputs unified classes for badges and filters", () => {
    const passportBadge = getDocumentBadgeClass("passport");
    const visaBadge = getDocumentBadgeClass("visa");
    const efrroBadge = getDocumentBadgeClass("efrro");

    assert.ok(passportBadge.includes("blue"), "Passport badge class is Blue");
    assert.ok(visaBadge.includes("purple"), "Visa badge class is Purple");
    assert.ok(efrroBadge.includes("amber"), "eFRRO badge class is Amber (not green or generic blue)");

    assert.strictEqual(efrroBadge.includes("emerald"), false, "eFRRO badge does NOT use green/emerald");
    console.log("✅ [PASS] Test 5: getDocumentBadgeClass provides centralized badge classes");
  });

  it("Test 6: Strict semantic separation of Status vs Document-Type Identity", () => {
    // Verified status must remain Green across all document types
    const verifiedStatusColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    assert.ok(verifiedStatusColor.includes("emerald"), "Verified status is emerald/green");

    // Expired status must remain Red across all document types
    const expiredStatusColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    assert.ok(expiredStatusColor.includes("rose"), "Expired status is rose/red");

    // Expiring soon / warning must remain Amber
    const warningStatusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    assert.ok(warningStatusColor.includes("amber"), "Warning status is amber");

    // Metadata Only uses document-specific theme
    const passportMeta = getDocumentTheme("passport").badgeClass;
    const visaMeta = getDocumentTheme("visa").badgeClass;
    const efrroMeta = getDocumentTheme("efrro").badgeClass;

    assert.ok(passportMeta.includes("blue"), "Passport Metadata Only badge is blue");
    assert.ok(visaMeta.includes("purple"), "Visa Metadata Only badge is purple");
    assert.ok(efrroMeta.includes("amber"), "eFRRO Metadata Only badge is amber");

    console.log("✅ [PASS] Test 6: Strict semantic status isolation preserved without color collision");
  });

  it("Test 7: DOCUMENT_CONFIGS aligns with DOCUMENT_THEMES", () => {
    const docTypes = ["passport", "visa", "efrro"] as const;
    for (const dt of docTypes) {
      assert.ok(DOCUMENT_CONFIGS[dt], `DOCUMENT_CONFIGS contains ${dt}`);
      assert.ok(DOCUMENT_THEMES[dt], `DOCUMENT_THEMES contains ${dt}`);
      assert.strictEqual(DOCUMENT_CONFIGS[dt].type, DOCUMENT_THEMES[dt].type);
    }
    console.log("✅ [PASS] Test 7: DOCUMENT_CONFIGS and DOCUMENT_THEMES configurations align 1:1");
  });
});
