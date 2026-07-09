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

export class MockWhatsAppService implements IWhatsAppService {
  async sendWhatsApp(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[WHATSAPP_SERVICE] Dispatched WhatsApp to: ${message.recipientPhone}. Template: ${message.templateName}`);
    return { success: true, messageId: `wa_msg_${Math.random().toString(36).substring(7)}` };
  }

  async verifyProviderStatus(): Promise<boolean> {
    return true;
  }
}
