# Provider Abstraction Walkthrough

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Provider Resolution & Factory Pattern

Decoupling is achieved via the `NotificationProviderFactory` class, which handles provider configuration mapping and returns cached singleton provider references:

```typescript
export class NotificationProviderFactory {
  private static emailInstance: INotificationProvider | null = null;
  private static whatsappInstance: INotificationProvider | null = null;

  public static getEmailProvider(): INotificationProvider {
    if (this.emailInstance) return this.emailInstance;

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
    if (this.whatsappInstance) return this.whatsappInstance;

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
```

---

## 2. Configuration Profiles

### 2.1 Local Development Configuration
No external HTTP calls are dispatched. The system routes all traffic to the console logging `MockNotificationProvider`:
```bash
EMAIL_PROVIDER=mock
WHATSAPP_PROVIDER=mock
```

### 2.2 Production Configuration
Configures real gateways API keys:
```bash
EMAIL_PROVIDER=resend
WHATSAPP_PROVIDER=meta
RESEND_API_KEY=re_abc123XYZ
META_ACCESS_TOKEN=eaag_meta_access_token_token
META_PHONE_NUMBER_ID=1234567890
```
