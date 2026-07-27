# Notification Provider Integration Guide

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. How to Add a New Notification Provider

To add a new email, SMS, or WhatsApp provider (e.g. AWS SES or SendGrid):

### Step 1: Implement the `INotificationProvider` Interface
Create a new file `src/domain/notifications/services/providers/aws-ses-email.provider.ts`:
```typescript
import { INotificationProvider, ProviderResponse, BulkProviderResponse, ProviderHealth } from "../../types/provider.types";

export class AwsSesEmailProvider implements INotificationProvider {
  name = "aws-ses-email";

  async sendEmail(to: string, subject: string, body: string): Promise<ProviderResponse> {
    // Implement AWS SES SDK request logic here...
    return { success: true, gatewayId: "ses-123" };
  }

  async sendWhatsApp(to: string, body: string): Promise<ProviderResponse> {
    throw new Error("AWS SES does not support WhatsApp channel.");
  }

  async sendBulkEmail(to: string[], subject: string, body: string): Promise<BulkProviderResponse> {
    // Implement bulk send...
    return { success: true, results: [] };
  }

  async sendBulkWhatsApp(to: string[], body: string): Promise<BulkProviderResponse> {
    throw new Error("AWS SES does not support WhatsApp channel.");
  }

  async validateConfiguration(): Promise<boolean> {
    return !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerName: this.name,
      status: "healthy",
      apiReachability: true,
      lastSuccessfulDelivery: new Date(),
      lastFailedDelivery: null
    };
  }
}
```

### Step 2: Register in `NotificationProviderFactory`
Update `src/domain/notifications/services/provider-factory.ts` to instantiate your provider:
```typescript
case "aws-ses":
  this.emailInstance = new AwsSesEmailProvider();
  break;
```
Select the provider in the environment variables:
```bash
EMAIL_PROVIDER=aws-ses
```
That's it! The `QueueProcessor` will automatically resolve and utilize the new provider singleton instance.
