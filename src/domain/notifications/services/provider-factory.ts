import { INotificationProvider } from "../types/provider.types";
import { MockNotificationProvider } from "./providers/mock-notification.provider";
import { ResendEmailProvider } from "./providers/resend-email.provider";
import { MetaWhatsAppProvider } from "./providers/meta-whatsapp.provider";

export class NotificationProviderFactory {
  private static emailInstance: INotificationProvider | null = null;
  private static whatsappInstance: INotificationProvider | null = null;

  public static getEmailProvider(): INotificationProvider {
    if (this.emailInstance) {
      return this.emailInstance;
    }

    const providerType = process.env.EMAIL_PROVIDER || "mock";
    switch (providerType.toLowerCase()) {
      case "resend":
        this.emailInstance = new ResendEmailProvider();
        break;
      case "mock":
      default:
        this.emailInstance = new MockNotificationProvider("mock-email-provider");
        break;
    }

    return this.emailInstance;
  }

  public static getWhatsAppProvider(): INotificationProvider {
    if (this.whatsappInstance) {
      return this.whatsappInstance;
    }

    const providerType = process.env.WHATSAPP_PROVIDER || "mock";
    switch (providerType.toLowerCase()) {
      case "meta":
        this.whatsappInstance = new MetaWhatsAppProvider();
        break;
      case "mock":
      default:
        this.whatsappInstance = new MockNotificationProvider("mock-whatsapp-provider");
        break;
    }

    return this.whatsappInstance;
  }
}
