import { 
  INotificationProvider, 
  ProviderResponse, 
  BulkProviderResponse, 
  ProviderHealth 
} from "../../types/provider.types";

export class MockNotificationProvider implements INotificationProvider {
  private lastSuccess: Date | null = null;
  private lastFailure: Date | null = null;

  constructor(public readonly name: string = "mock-notification-provider") {}

  async sendEmail(to: string, subject: string, body: string): Promise<ProviderResponse> {
    const start = Date.now();
    console.log(`[MOCK_PROVIDER:${this.name}] sendEmail to=${to} subject="${subject}" body="${body.substring(0, 40)}..."`);
    this.lastSuccess = new Date();
    return {
      success: true,
      gatewayId: `mock-email-${Math.random().toString(36).substring(7)}`,
      latencyMs: Date.now() - start,
      rawResponse: { status: "simulated_send_email" }
    };
  }

  async sendWhatsApp(to: string, body: string): Promise<ProviderResponse> {
    const start = Date.now();
    console.log(`[MOCK_PROVIDER:${this.name}] sendWhatsApp to=${to} body="${body.substring(0, 40)}..."`);
    this.lastSuccess = new Date();
    return {
      success: true,
      gatewayId: `mock-wa-${Math.random().toString(36).substring(7)}`,
      latencyMs: Date.now() - start,
      rawResponse: { status: "simulated_send_whatsapp" }
    };
  }

  async sendBulkEmail(to: string[], subject: string, body: string): Promise<BulkProviderResponse> {
    console.log(`[MOCK_PROVIDER:${this.name}] sendBulkEmail toCount=${to.length} subject="${subject}"`);
    this.lastSuccess = new Date();
    return {
      success: true,
      results: to.map(addr => ({
        to: addr,
        success: true,
        gatewayId: `mock-bulk-email-${Math.random().toString(36).substring(7)}`
      }))
    };
  }

  async sendBulkWhatsApp(to: string[], body: string): Promise<BulkProviderResponse> {
    console.log(`[MOCK_PROVIDER:${this.name}] sendBulkWhatsApp toCount=${to.length}`);
    this.lastSuccess = new Date();
    return {
      success: true,
      results: to.map(addr => ({
        to: addr,
        success: true,
        gatewayId: `mock-bulk-wa-${Math.random().toString(36).substring(7)}`
      }))
    };
  }

  async validateConfiguration(): Promise<boolean> {
    return true;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerName: this.name,
      status: "healthy",
      apiReachability: true,
      lastSuccessfulDelivery: this.lastSuccess,
      lastFailedDelivery: this.lastFailure
    };
  }
}
