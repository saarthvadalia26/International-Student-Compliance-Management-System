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
    console.warn(`[EMAIL_SERVICE] Blocked email dispatch attempt to ${message.to}. Email channel is currently disabled.`);
    return { 
      success: false, 
      error: "Email notification delivery is currently disabled. Integration is not available." 
    };
  }

  async verifyProviderStatus(): Promise<boolean> {
    return false;
  }
}
