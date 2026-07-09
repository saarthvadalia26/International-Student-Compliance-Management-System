export interface EmailMessage {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface IEmailService {
  /**
   * Dispatch compliance alerts via Email (ADR-005)
   */
  sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
  
  /**
   * Check connection/health of the external provider (e.g. Resend API)
   */
  verifyProviderStatus(): Promise<boolean>;
}

export class ResendEmailService implements IEmailService {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null; // Will read from system settings or process.env
  }

  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[EMAIL_SERVICE] Dispatched Email to: ${message.to}. Subject: ${message.subject}`);
    // Future Resend SDK integration will go here
    return { success: true, messageId: `msg_${Math.random().toString(36).substring(7)}` };
  }

  async verifyProviderStatus(): Promise<boolean> {
    // Check key configured
    return !!this.apiKey;
  }
}
