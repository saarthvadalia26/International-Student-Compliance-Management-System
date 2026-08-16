/**
 * Centralized WhatsApp Integration Service
 * Manages Meta WhatsApp Cloud API configuration state and readiness validation.
 */

export type WhatsAppIntegrationStatus = 
  | "NOT_CONFIGURED" 
  | "CONFIGURED" 
  | "CONFIGURED_BUT_INVALID" 
  | "READY";

export interface WhatsAppIntegrationConfig {
  status: WhatsAppIntegrationStatus;
  isConfigured: boolean;
  isReady: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  hasAccessToken: boolean;
  provider: string;
  message: string;
}

export class WhatsAppIntegrationService {
  /**
   * Evaluates the current WhatsApp Business API integration configuration.
   */
  static getIntegrationStatus(): WhatsAppIntegrationConfig {
    const accessToken = process.env.META_ACCESS_TOKEN?.trim();
    const phoneId = process.env.META_PHONE_NUMBER_ID?.trim();
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
    const provider = process.env.WHATSAPP_PROVIDER?.toLowerCase() || "meta";

    // If access token or phone number ID is missing, WhatsApp integration is NOT_CONFIGURED
    if (!accessToken || !phoneId) {
      return {
        status: "NOT_CONFIGURED",
        isConfigured: false,
        isReady: false,
        hasAccessToken: Boolean(accessToken),
        phoneNumberId: phoneId || undefined,
        businessAccountId: wabaId || undefined,
        provider,
        message: "WhatsApp Business API credentials (META_ACCESS_TOKEN and META_PHONE_NUMBER_ID) have not been configured in the system environment."
      };
    }

    // Basic format validation
    if (accessToken.length < 10 || phoneId.length < 5) {
      return {
        status: "CONFIGURED_BUT_INVALID",
        isConfigured: true,
        isReady: false,
        hasAccessToken: true,
        phoneNumberId: phoneId,
        businessAccountId: wabaId || undefined,
        provider,
        message: "WhatsApp Business API credentials appear to be invalid or incomplete."
      };
    }

    return {
      status: "READY",
      isConfigured: true,
      isReady: true,
      hasAccessToken: true,
      phoneNumberId: phoneId,
      businessAccountId: wabaId || undefined,
      provider,
      message: "WhatsApp Business API is configured and operational."
    };
  }

  /**
   * Helper to check if WhatsApp dispatch can be executed.
   */
  static isDispatchReady(): boolean {
    return this.getIntegrationStatus().isReady;
  }
}
