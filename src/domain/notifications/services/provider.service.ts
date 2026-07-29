export interface IEmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }>;
}

export interface IWhatsAppProvider {
  sendWhatsApp(to: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }>;
}

export class ResendEmailProvider implements IEmailProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }> {
    console.log(`[EMAIL_PROVIDER] Attempting to send email to: ${to}`);
    throw new Error("Resend integration required. Cannot send email in production without valid API keys.");
  }
}

export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  async sendWhatsApp(to: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }> {
    console.log(`[WHATSAPP_PROVIDER] Attempting to send WhatsApp message to: ${to}`);
    throw new Error("Twilio integration required. Cannot send WhatsApp in production without valid API keys.");
  }
}
