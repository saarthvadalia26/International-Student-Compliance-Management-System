export interface IEmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }>;
}

export interface IWhatsAppProvider {
  sendWhatsApp(to: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }>;
}

export class ResendEmailProvider implements IEmailProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }> {
    console.log(`[EMAIL_PROVIDER] Sending email to: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL_PROVIDER] Body sample: ${body.substring(0, 30)}...`);
    // Mock gateway integration success response
    return {
      success: true,
      gatewayId: `resend-msg-${Math.random().toString(36).substring(7)}`
    };
  }
}

export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  async sendWhatsApp(to: string, body: string): Promise<{ success: boolean; gatewayId?: string; error?: string }> {
    console.log(`[WHATSAPP_PROVIDER] Sending WhatsApp message to: ${to}`);
    console.log(`[WHATSAPP_PROVIDER] Body sample: ${body.substring(0, 30)}...`);
    // Mock gateway integration success response
    return {
      success: true,
      gatewayId: `twilio-wa-${Math.random().toString(36).substring(7)}`
    };
  }
}
