import { Branding } from "@/config/branding";
import { 
  INotificationProvider, 
  ProviderResponse, 
  BulkProviderResponse, 
  ProviderHealth,
  AuthenticationError,
  ProviderUnavailableError,
  RateLimitError
} from "../../types/provider.types";

export class ResendEmailProvider implements INotificationProvider {
  name = "resend-email-provider";
  private lastSuccess: Date | null = null;
  private lastFailure: Date | null = null;

  async sendEmail(to: string, subject: string, body: string): Promise<ProviderResponse> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.lastFailure = new Date();
      throw new AuthenticationError("Resend API Key is missing in environment configurations.");
    }

    const start = Date.now();
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: `${Branding.appShortName} ${Branding.shortName} <${process.env.RESEND_FROM_EMAIL || 'compliance@nfsu.edu.in'}>`,
          to,
          subject,
          html: body
        })
      });

      const latencyMs = Date.now() - start;

      if (response.status === 401) {
        this.lastFailure = new Date();
        throw new AuthenticationError("Resend Authentication failed. Invalid API Key.");
      }

      if (response.status === 429) {
        this.lastFailure = new Date();
        throw new RateLimitError("Resend API rate limit exceeded.");
      }

      if (!response.ok) {
        this.lastFailure = new Date();
        const errText = await response.text();
        return { success: false, error: errText, latencyMs };
      }

      const resData = await response.json() as { id?: string };
      this.lastSuccess = new Date();
      return {
        success: true,
        gatewayId: resData.id,
        latencyMs,
        rawResponse: resData
      };
    } catch (e) {
      this.lastFailure = new Date();
      if (e instanceof AuthenticationError || e instanceof RateLimitError) {
        throw e;
      }
      throw new ProviderUnavailableError("Resend Gateway connection failed", e);
    }
  }

  async sendWhatsApp(to: string, body: string): Promise<ProviderResponse> {
    throw new Error("Resend provider does not support WhatsApp channel.");
  }

  async sendBulkEmail(to: string[], subject: string, body: string): Promise<BulkProviderResponse> {
    const results = await Promise.all(
      to.map(async addr => {
        try {
          const res = await this.sendEmail(addr, subject, body);
          return { to: addr, success: res.success, gatewayId: res.gatewayId, error: res.error };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { to: addr, success: false, error: msg };
        }
      })
    );

    return {
      success: results.every(r => r.success),
      results
    };
  }

  async sendBulkWhatsApp(to: string[], body: string): Promise<BulkProviderResponse> {
    throw new Error("Resend provider does not support WhatsApp channel.");
  }

  async validateConfiguration(): Promise<boolean> {
    return !!process.env.RESEND_API_KEY;
  }

  async healthCheck(): Promise<ProviderHealth> {
    let apiReachability = false;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("https://api.resend.com", { method: "GET", signal: controller.signal });
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
