export const GLOBAL_ALLOWED_TOKENS = new Set([
  "student_name",
  "enrollment_number",
  "document_type",
  "expiry_date",
  "days_remaining",
  "days_left",
  "institution_name",
  "current_date",
  "program_name",
  "otp_code",
  "rejection_reason",
  "upload_window_hours",
  "secure_upload_link"
]);

export interface TemplateValidationInput {
  title?: string;
  code?: string;
  eventType?: string;
  documentType?: string;
  channel?: string;
  category?: string;
  status?: string;
  subjectTemplate?: string | null;
  bodyTemplate?: string;
  languageCode?: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  extractedTokens: string[];
  invalidTokens: string[];
  malformedSyntax: string[];
}

export class TemplateValidator {
  /**
   * Extracts and validates tokens from a template string
   */
  static extractAndValidateTokens(text: string): {
    extracted: string[];
    invalid: string[];
    malformed: string[];
  } {
    if (!text) return { extracted: [], invalid: [], malformed: [] };

    // 1. Detect malformed single/unbalanced braces: e.g. {token} or {{token} or {token}}
    const malformed: string[] = [];
    
    // Pattern for single brace that is not part of double brace
    const singleBracePattern = /(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g;
    let match;
    while ((match = singleBracePattern.exec(text)) !== null) {
      malformed.push(`{${match[1]}} (use double braces {{${match[1]}}})`);
    }

    // Pattern for unclosed {{token}
    const unclosedPattern = /\{\{([a-zA-Z0-9_]+)\}(?!\})/g;
    while ((match = unclosedPattern.exec(text)) !== null) {
      malformed.push(`{{${match[1]}} (missing closing brace)`);
    }

    // Pattern for unopened {token}}
    const unopenedPattern = /(?<!\{)\{([a-zA-Z0-9_]+)\}\}/g;
    while ((match = unopenedPattern.exec(text)) !== null) {
      malformed.push(`{${match[1]}}} (missing opening brace)`);
    }

    // 2. Extract valid double brace tokens: {{ token_name }}
    const tokenRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const extracted: string[] = [];
    const invalid: string[] = [];

    while ((match = tokenRegex.exec(text)) !== null) {
      const tokenName = match[1].trim();
      extracted.push(tokenName);
      if (!GLOBAL_ALLOWED_TOKENS.has(tokenName)) {
        invalid.push(`{{${tokenName}}}`);
      }
    }

    return { extracted, invalid, malformed };
  }

  /**
   * Validates full template schema and compliance business rules
   */
  static validateTemplate(input: TemplateValidationInput): TemplateValidationResult {
    const errors: string[] = [];

    // Title validation
    if (!input.title || input.title.trim().length < 3) {
      errors.push("Template title is required and must be at least 3 characters.");
    }

    // Code validation
    if (!input.code || !/^[A-Z0-9_]{3,50}$/.test(input.code.trim().toUpperCase())) {
      errors.push("Template code is required and must contain 3 to 50 uppercase letters, numbers, or underscores.");
    }

    // Body validation
    if (!input.bodyTemplate || input.bodyTemplate.trim().length < 10) {
      errors.push("Template message body is required and must be at least 10 characters.");
    }

    // Email Subject validation
    const isEmail = input.channel === "email" || input.channel === "both";
    if (isEmail && (!input.subjectTemplate || input.subjectTemplate.trim().length < 3)) {
      errors.push("Email subject line is required when channel is Email or Both.");
    }

    // WhatsApp Category invariant rules
    const isWhatsApp = input.channel === "whatsapp" || input.channel === "both";
    if (isWhatsApp) {
      const eventType = input.eventType || "document_expiry";
      const category = input.category || "utility";

      if (eventType === "portal_otp" && category !== "authentication") {
        errors.push("Student Portal OTP templates must be categorized as 'authentication'.");
      }

      if (eventType !== "portal_otp" && category === "authentication") {
        errors.push("Compliance expiry and operational alerts cannot be categorized as 'authentication'. They must be 'utility'.");
      }
    }

    // Token extraction and validation across subject and body
    const bodyAnalysis = this.extractAndValidateTokens(input.bodyTemplate || "");
    const subjectAnalysis = this.extractAndValidateTokens(input.subjectTemplate || "");

    const allInvalid = Array.from(new Set([...bodyAnalysis.invalid, ...subjectAnalysis.invalid]));
    const allMalformed = Array.from(new Set([...bodyAnalysis.malformed, ...subjectAnalysis.malformed]));
    const allExtracted = Array.from(new Set([...bodyAnalysis.extracted, ...subjectAnalysis.extracted]));

    if (allMalformed.length > 0) {
      errors.push(`Malformed variable syntax detected: ${allMalformed.join(", ")}.`);
    }

    if (allInvalid.length > 0) {
      errors.push(`The variable(s) ${allInvalid.join(", ")} are not supported. Supported tokens: ${Array.from(GLOBAL_ALLOWED_TOKENS).map(t => `{{${t}}}`).join(", ")}.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      extractedTokens: allExtracted,
      invalidTokens: allInvalid,
      malformedSyntax: allMalformed
    };
  }
}
