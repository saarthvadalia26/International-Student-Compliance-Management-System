import { 
  INotificationProvider, 
  ProviderResponse, 
  BulkProviderResponse, 
  ProviderHealth 
} from "../../types/provider.types";

export class MockNotificationProvider implements INotificationProvider {
  /**
   * Safe un-implemented provider instance.
   * Will throw errors if invoked in production without proper configuration.
   */
  constructor(public readonly name: string = "unconfigured-provider") {}

  async sendEmail(to: string, subject: string, body: string): Promise<ProviderResponse> {
    console.error(`[PROVIDER_ERROR] Attempted to send email to ${to} without configured provider.`);
    throw new Error("Provider integration required. Configure EMAIL_PROVIDER with valid credentials.");
  }

  async sendWhatsApp(to: string, body: string): Promise<ProviderResponse> {
    console.error(`[PROVIDER_ERROR] Attempted to send WhatsApp to ${to} without configured provider.`);
    throw new Error("Provider integration required. Configure WHATSAPP_PROVIDER with valid credentials.");
  }

  async sendBulkEmail(to: string[], subject: string, body: string): Promise<BulkProviderResponse> {
    console.error(`[PROVIDER_ERROR] Attempted to send bulk email to ${to.length} recipients without configured provider.`);
    throw new Error("Provider integration required. Configure EMAIL_PROVIDER with valid credentials.");
  }

  async sendBulkWhatsApp(to: string[], body: string): Promise<BulkProviderResponse> {
    console.error(`[PROVIDER_ERROR] Attempted to send bulk WhatsApp to ${to.length} recipients without configured provider.`);
    throw new Error("Provider integration required. Configure WHATSAPP_PROVIDER with valid credentials.");
  }

  async validateConfiguration(): Promise<boolean> {
    return false;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerName: this.name,
      status: "unhealthy",
      apiReachability: false,
      lastSuccessfulDelivery: null,
      lastFailedDelivery: null
    };
  }
}
