import { describe, it, expect } from "vitest";
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
      expect(getVersionLabel(1)).toBe("Original");
    });

    it("assigns 'Renewal 1' to version 2", () => {
      expect(getVersionLabel(2)).toBe("Renewal 1");
    });

    it("assigns 'Renewal 2' to version 3", () => {
      expect(getVersionLabel(3)).toBe("Renewal 2");
    });

    it("assigns 'Renewal 5' to version 6", () => {
      expect(getVersionLabel(6)).toBe("Renewal 5");
    });

    it("computes renewal counts accurately across lifecycle", () => {
      expect(calculateRenewalCount(0)).toBe(0);
      expect(calculateRenewalCount(1)).toBe(0);
      expect(calculateRenewalCount(2)).toBe(1);
      expect(calculateRenewalCount(3)).toBe(2);
      expect(calculateRenewalCount(10)).toBe(9);
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
      expect(result.valid).toBe(true);
    });

    it("rejects expiry date equal to issue date", () => {
      const result = validateDocumentDates("2026-05-10", "2026-05-10");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be strictly after");
    });

    it("rejects expiry date before issue date", () => {
      const result = validateDocumentDates("2026-05-10", "2025-05-10");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be strictly after");
    });
  });

  // ── 3. Notification Template Token Invariants ─────────────────────────────
  describe("Notification Template Tokens & Compliance Email Invariants", () => {
    it("supports compliance_email and support_email tokens in template validator", () => {
      expect(GLOBAL_ALLOWED_TOKENS.has("compliance_email")).toBe(true);
      expect(GLOBAL_ALLOWED_TOKENS.has("support_email")).toBe(true);
      expect(GLOBAL_ALLOWED_TOKENS.has("student_name")).toBe(true);
      expect(GLOBAL_ALLOWED_TOKENS.has("expiry_date")).toBe(true);
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

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.extractedTokens).toContain("compliance_email");
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

      expect(result.isValid).toBe(false);
      expect(result.malformedSyntax.length).toBeGreaterThan(0);
    });
  });
});
