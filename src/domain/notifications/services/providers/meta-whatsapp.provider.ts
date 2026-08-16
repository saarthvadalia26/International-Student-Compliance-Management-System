import { 
  INotificationProvider, 
  ProviderResponse, 
  BulkProviderResponse, 
  ProviderHealth,
  AuthenticationError,
  ProviderUnavailableError,
  RateLimitError
} from "../../types/provider.types";
import { WhatsAppIntegrationService } from "../whatsapp-integration.service";

export interface WhatsAppTemplateMessageParams {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
}

export class MetaWhatsAppProvider implements INotificationProvider {
  name = "meta-whatsapp-provider";
  private lastSuccess: Date | null = null;
  private lastFailure: Date | null = null;

  async sendTemplateMessage(params: WhatsAppTemplateMessageParams): Promise<ProviderResponse> {
    const { to, templateName, languageCode = "en", bodyParameters = [] } = params;
    const integration = WhatsAppIntegrationService.getIntegrationStatus();

    if (!integration.isReady || !integration.phoneNumberId) {
      this.lastFailure = new Date();
      throw new AuthenticationError("Meta WhatsApp Business API credentials (META_ACCESS_TOKEN or META_PHONE_NUMBER_ID) are not configured.");
    }

    const accessToken = process.env.META_ACCESS_TOKEN?.trim();
    const phoneId = integration.phoneNumberId;
    const start = Date.now();

    try {
      const cleanPhone = to.replace(/[\s\+\-]/g, "");

      const components: Array<{ type: string; parameters: Array<{ type: string; text: string }> }> = [];
      if (bodyParameters.length > 0) {
        components.push({
          type: "body",
          parameters: bodyParameters.map(param => ({ type: "text", text: param }))
        });
      }

      const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components.length > 0 ? { components } : {})
          }
        })
      });

      const latencyMs = Date.now() - start;

      if (response.status === 401 || response.status === 403) {
        this.lastFailure = new Date();
        throw new AuthenticationError("Meta WhatsApp authentication failed.");
      }

      if (response.status === 429) {
        this.lastFailure = new Date();
        throw new RateLimitError("Meta WhatsApp rate limit exceeded.");
      }

      if (!response.ok) {
        this.lastFailure = new Date();
        const errText = await response.text();
        return { success: false, error: errText, latencyMs };
      }

      const resData = await response.json() as { messages?: { id?: string }[] };
      this.lastSuccess = new Date();
      const gatewayId = resData.messages?.[0]?.id;

      return {
        success: true,
        gatewayId,
        latencyMs,
        rawResponse: resData
      };
    } catch (e) {
      this.lastFailure = new Date();
      if (e instanceof AuthenticationError || e instanceof RateLimitError) {
        throw e;
      }
      throw new ProviderUnavailableError("Meta WhatsApp Gateway connection failed", e);
    }
  }

  async sendWhatsApp(to: string, body: string): Promise<ProviderResponse> {
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "efrro_expiry_alert";
    return this.sendTemplateMessage({
      to,
      templateName,
      languageCode: "en",
      bodyParameters: [body]
    });
  }

  async sendEmail(to: string, subject: string, body: string): Promise<ProviderResponse> {
    throw new Error("Meta WhatsApp provider does not support email channel.");
  }

  async sendBulkWhatsApp(to: string[], body: string): Promise<BulkProviderResponse> {
    const results = await Promise.all(
      to.map(async num => {
        try {
          const res = await this.sendWhatsApp(num, body);
          return { to: num, success: res.success, gatewayId: res.gatewayId, error: res.error };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { to: num, success: false, error: msg };
        }
      })
    );

    return {
      success: results.every(r => r.success),
      results
    };
  }

  async sendBulkEmail(to: string[], subject: string, body: string): Promise<BulkProviderResponse> {
    throw new Error("Meta WhatsApp provider does not support email channel.");
  }

  async validateConfiguration(): Promise<boolean> {
    return WhatsAppIntegrationService.isDispatchReady();
  }

  async healthCheck(): Promise<ProviderHealth> {
    const isConfigured = WhatsAppIntegrationService.isDispatchReady();
    if (!isConfigured) {
      return {
        providerName: this.name,
        status: "unhealthy",
        apiReachability: false,
        lastSuccessfulDelivery: this.lastSuccess,
        lastFailedDelivery: this.lastFailure
      };
    }

    let apiReachability = false;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("https://graph.facebook.com", { method: "GET", signal: controller.signal });
      clearTimeout(id);
      apiReachability = res.status < 500;
    } catch (err) {
      apiReachability = false;
    }

    return {
      providerName: this.name,
      status: apiReachability ? "healthy" : "unhealthy",
      apiReachability,
      lastSuccessfulDelivery: this.lastSuccess,
      lastFailedDelivery: this.lastFailure
    };
  }
}
