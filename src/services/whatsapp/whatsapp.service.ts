export interface WhatsAppMessage {
  recipientPhone: string; // E.164 format country code prefixed
  templateName: string;
  templateParameters: Record<string, string>;
}

export interface IWhatsAppService {
  /**
   * Dispatch compliance alerts via instant messaging channels (ADR-005)
   */
  sendWhatsApp(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
  
  /**
   * Check connection/health of the WhatsApp Business Provider status
   */
  verifyProviderStatus(): Promise<boolean>;
}

export class WhatsAppService implements IWhatsAppService {
  async sendWhatsApp(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    throw new Error("WhatsApp provider integration not implemented for production yet.");
  }

  async verifyProviderStatus(): Promise<boolean> {
    throw new Error("WhatsApp provider integration not implemented for production yet.");
  }
}
