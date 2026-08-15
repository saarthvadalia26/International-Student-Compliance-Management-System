import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  TemplateValidator, 
  GLOBAL_ALLOWED_TOKENS 
} from "../src/domain/notifications/validators/template.validator";

describe("ISCMS Reminder Template Manager Acceptance Tests", () => {
  it("1. Validates supported variable tokens whitelist strictly", () => {
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("student_name"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("enrollment_number"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("document_type"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("expiry_date"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("days_remaining"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("institution_name"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("current_date"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("otp_code"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("rejection_reason"));
    assert.ok(GLOBAL_ALLOWED_TOKENS.has("upload_window_hours"));
  });

  it("2. Successfully validates a well-formed Passport Expiry template", () => {
    const res = TemplateValidator.validateTemplate({
      title: "Passport Expiry — 30 Days",
      code: "PASSPORT_EXPIRY_30D",
      eventType: "document_expiry",
      documentType: "passport",
      channel: "whatsapp",
      category: "utility",
      status: "ACTIVE",
      subjectTemplate: "ISCMS Alert: Passport Expiry Notice for {{student_name}}",
      bodyTemplate: "Dear {{student_name}},\n\nYour {{document_type}} will expire on {{expiry_date}}, which is {{days_remaining}} days away.\n\nRegards,\n{{institution_name}}"
    });

    assert.equal(res.isValid, true, "Valid template must pass validation without errors");
    assert.equal(res.errors.length, 0);
    assert.ok(res.extractedTokens.includes("student_name"));
    assert.ok(res.extractedTokens.includes("expiry_date"));
    assert.ok(res.extractedTokens.includes("days_remaining"));
  });

  it("3. Rejects unknown variable tokens (arbitrary database access prevention)", () => {
    const res = TemplateValidator.validateTemplate({
      title: "Malicious Template Test",
      code: "INVALID_TOKENS_TEST",
      eventType: "document_expiry",
      documentType: "passport",
      channel: "whatsapp",
      category: "utility",
      bodyTemplate: "Hello {{student_name}}, your password is {{password_hash}} and column {{arbitrary_db_col}}."
    });

    assert.equal(res.isValid, false, "Unknown tokens must fail validation");
    assert.ok(res.invalidTokens.includes("{{password_hash}}"));
    assert.ok(res.invalidTokens.includes("{{arbitrary_db_col}}"));
    assert.ok(res.errors.some(e => e.includes("not supported")));
  });

  it("4. Rejects malformed variable syntax (unbalanced single brackets)", () => {
    const res = TemplateValidator.validateTemplate({
      title: "Malformed Syntax Test",
      code: "MALFORMED_SYNTAX_TEST",
      eventType: "document_expiry",
      documentType: "visa",
      channel: "whatsapp",
      category: "utility",
      bodyTemplate: "Hello {student_name}, your visa expires on {{expiry_date}}." // single brace
    });

    assert.equal(res.isValid, false, "Malformed syntax must fail validation");
    assert.ok(res.malformedSyntax.length > 0);
    assert.ok(res.errors.some(e => e.includes("Malformed variable syntax")));
  });

  it("5. Strictly enforces WhatsApp Category Invariant: Expiry reminders MUST be Utility", () => {
    const res = TemplateValidator.validateTemplate({
      title: "Illegal Auth Category for Expiry",
      code: "ILLEGAL_AUTH_EXPIRY",
      eventType: "document_expiry",
      documentType: "efrro",
      channel: "whatsapp",
      category: "authentication", // ILLEGAL: Expiry reminder cannot be authentication
      bodyTemplate: "Dear {{student_name}}, your eFRRO expires on {{expiry_date}}."
    });

    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes("cannot be categorized as 'authentication'")));
  });

  it("6. Strictly enforces WhatsApp Category Invariant: Student Portal OTP MUST be Authentication", () => {
    const res = TemplateValidator.validateTemplate({
      title: "Student Portal OTP",
      code: "STUDENT_PORTAL_OTP",
      eventType: "portal_otp",
      documentType: "general",
      channel: "whatsapp",
      category: "utility", // ILLEGAL: OTP must be authentication
      bodyTemplate: "Your login code is {{otp_code}}."
    });

    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes("Student Portal OTP templates must be categorized as 'authentication'")));
  });

  it("7. Successfully validates Student Portal OTP with Authentication category", () => {
    const res = TemplateValidator.validateTemplate({
      title: "Student Portal OTP",
      code: "STUDENT_PORTAL_OTP",
      eventType: "portal_otp",
      documentType: "general",
      channel: "whatsapp",
      category: "authentication",
      subjectTemplate: "Your ISCMS Portal Login Verification Code",
      bodyTemplate: "Your login code is {{otp_code}}. It expires in 10 minutes. Office of Compliance, {{institution_name}}"
    });

    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });

  it("8. Strictly rejects template creation with disabled Email channel", () => {
    const res = TemplateValidator.validateTemplate({
      title: "Disabled Email Test",
      code: "DISABLED_EMAIL_TEST",
      eventType: "document_expiry",
      documentType: "passport",
      channel: "email",
      category: "utility",
      subjectTemplate: "ISCMS Alert",
      bodyTemplate: "Dear {{student_name}}, your passport expires soon."
    });

    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes("Email notifications are currently disabled")));
  });

  it("9. WhatsApp-only templates do not require an Email Subject line", () => {
    const res = TemplateValidator.validateTemplate({
      title: "WhatsApp Only Notice",
      code: "WA_ONLY_NOTICE",
      eventType: "document_expiry",
      documentType: "visa",
      channel: "whatsapp",
      category: "utility",
      subjectTemplate: null, // Allowed for WhatsApp only
      bodyTemplate: "Dear {{student_name}}, your visa expires on {{expiry_date}}.\n\nRegards,\n{{institution_name}}"
    });

    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });

  it("10. Validates Document Replacement and Verification event templates", () => {
    const repApproved = TemplateValidator.validateTemplate({
      title: "Replacement Request Approved",
      code: "REPLACEMENT_APPROVED",
      eventType: "replacement_approved",
      documentType: "all",
      channel: "whatsapp",
      category: "utility",
      subjectTemplate: "Replacement Request Approved for {{document_type}}",
      bodyTemplate: "Dear {{student_name}},\n\nYour request for {{document_type}} replacement was approved. You have {{upload_window_hours}} hours to upload at {{secure_upload_link}}."
    });
    assert.equal(repApproved.isValid, true);

    const docRejected = TemplateValidator.validateTemplate({
      title: "Document Verification Rejected",
      code: "DOCUMENT_REJECTED",
      eventType: "document_rejected",
      documentType: "all",
      channel: "whatsapp",
      category: "utility",
      subjectTemplate: "Action Required: {{document_type}} Rejected",
      bodyTemplate: "Dear {{student_name}},\n\nYour {{document_type}} was rejected. Reason: {{rejection_reason}}.\n\nRegards,\n{{institution_name}}"
    });
    assert.equal(docRejected.isValid, true);
  });
});
