import { describe, it } from "node:test";
import assert from "node:assert";
import { TemplateValidator, GLOBAL_ALLOWED_TOKENS } from "../src/domain/notifications/validators/template.validator";

describe("Document Versioning & Renewal Architecture", () => {
  // ── 1. Sequence and Version Label Rules ────────────────────────────────────
  describe("Version Sequence & Label Resolution", () => {
    function getVersionLabel(versionNumber: number): string {
      if (versionNumber <= 1) return "Original";
      return `Renewal ${versionNumber - 1}`;
    }

    function calculateRenewalCount(totalVersions: number): number {
      return Math.max(0, totalVersions - 1);
    }

    it("assigns 'Original' to version 1", () => {
      assert.strictEqual(getVersionLabel(1), "Original");
    });

    it("assigns 'Renewal 1' to version 2", () => {
      assert.strictEqual(getVersionLabel(2), "Renewal 1");
    });

    it("assigns 'Renewal 2' to version 3", () => {
      assert.strictEqual(getVersionLabel(3), "Renewal 2");
    });

    it("assigns 'Renewal 5' to version 6", () => {
      assert.strictEqual(getVersionLabel(6), "Renewal 5");
    });

    it("computes renewal counts accurately across lifecycle", () => {
      assert.strictEqual(calculateRenewalCount(0), 0);
      assert.strictEqual(calculateRenewalCount(1), 0);
      assert.strictEqual(calculateRenewalCount(2), 1);
      assert.strictEqual(calculateRenewalCount(3), 2);
      assert.strictEqual(calculateRenewalCount(10), 9);
    });
  });

  // ── 2. Date Invariant Validation ──────────────────────────────────────────
  describe("Document Date Invariant", () => {
    function validateDocumentDates(issueDate: string, expiryDate: string): { valid: boolean; error?: string } {
      const cleanIssue = issueDate.trim().split("T")[0];
      const cleanExpiry = expiryDate.trim().split("T")[0];
      const issueD = new Date(cleanIssue);
      const expiryD = new Date(cleanExpiry);

      if (isNaN(issueD.getTime()) || isNaN(expiryD.getTime())) {
        return { valid: false, error: "Invalid date format" };
      }

      if (expiryD <= issueD) {
        return { valid: false, error: "The expiration date must be strictly after the document issue date." };
      }

      return { valid: true };
    }

    it("accepts valid issue and expiry date ranges", () => {
      const result = validateDocumentDates("2026-01-01", "2031-01-01");
      assert.strictEqual(result.valid, true);
    });

    it("rejects expiry date equal to issue date", () => {
      const result = validateDocumentDates("2026-05-10", "2026-05-10");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("must be strictly after"));
    });

    it("rejects expiry date before issue date", () => {
      const result = validateDocumentDates("2026-05-10", "2025-05-10");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("must be strictly after"));
    });
  });

  // ── 3. Notification Template Token Invariants ─────────────────────────────
  describe("Notification Template Tokens & Compliance Email Invariants", () => {
    it("supports compliance_email and support_email tokens in template validator", () => {
      assert.strictEqual(GLOBAL_ALLOWED_TOKENS.has("compliance_email"), true);
      assert.strictEqual(GLOBAL_ALLOWED_TOKENS.has("support_email"), true);
      assert.strictEqual(GLOBAL_ALLOWED_TOKENS.has("student_name"), true);
      assert.strictEqual(GLOBAL_ALLOWED_TOKENS.has("expiry_date"), true);
    });

    it("validates template instructing student to email renewed documents to university", () => {
      const body = "Dear {{student_name}},\n\nYour {{document_type}} will expire on {{expiry_date}} (in {{days_remaining}} days).\n\nPlease send your renewed document copy to {{compliance_email}}.\n\nRegards,\n{{institution_name}}";
      const result = TemplateValidator.validateTemplate({
        title: "Passport Renewal Notice",
        code: "PASSPORT_RENEWAL_EMAIL_NOTICE",
        channel: "whatsapp",
        category: "utility",
        bodyTemplate: body
      });

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.extractedTokens.includes("compliance_email"));
    });

    it("detects malformed single braces in notification templates", () => {
      const body = "Dear {student_name}, please email your renewed passport to {{compliance_email}}.";
      const result = TemplateValidator.validateTemplate({
        title: "Malformed Template",
        code: "MALFORMED_NOTICE",
        channel: "whatsapp",
        category: "utility",
        bodyTemplate: body
      });

      assert.strictEqual(result.isValid, false);
      assert.ok(result.malformedSyntax.length > 0);
    });
  });
});
