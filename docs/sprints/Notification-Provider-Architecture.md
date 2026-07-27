# Notification Provider Abstraction Architecture

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Overview & Decoupling Rationale

To maintain a clean decoupled architecture in the NFSU International Student Compliance Management System (ISCMS), the Reminder Engine and Queue Processor must never reference concrete notification delivery providers directly. Instead, they interact solely with an abstract provider interface.

```
+------------------+         +----------------------------+
|  Reminder Engine | ------> |  INotificationProvider     |
+------------------+         +----------------------------+
                                           ^
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
         +---------------------+ +--------------------+ +--------------------+
         | ResendEmailProvider | | MetaWhatsAppProvider| | MockProvider       |
         +---------------------+ +--------------------+ +--------------------+
```

This design guarantees that switching SMS, WhatsApp, or Email suppliers (e.g., from Resend to AWS SES, or Meta to Twilio) requires zero modifications to the core compliance checks and scheduling engines.

---

## 2. Abstraction Interface Specification

The core abstraction is defined by the `INotificationProvider` interface:

```typescript
export interface ProviderResponse {
  success: boolean;
  gatewayId?: string;
  error?: string;
  latencyMs?: number;
  rawResponse?: Record<string, unknown>;
}

export interface BulkProviderResponse {
  success: boolean;
  results: {
    to: string;
    success: boolean;
    gatewayId?: string;
    error?: string;
  }[];
}

export interface ProviderHealth {
  providerName: string;
  status: "healthy" | "unhealthy";
  apiReachability: boolean;
  lastSuccessfulDelivery: Date | null;
  lastFailedDelivery: Date | null;
}

export interface INotificationProvider {
  name: string;
  sendEmail(to: string, subject: string, body: string): Promise<ProviderResponse>;
  sendWhatsApp(to: string, body: string): Promise<ProviderResponse>;
  sendBulkEmail(to: string[], subject: string, body: string): Promise<BulkProviderResponse>;
  sendBulkWhatsApp(to: string[], body: string): Promise<BulkProviderResponse>;
  validateConfiguration(): Promise<boolean>;
  healthCheck(): Promise<ProviderHealth>;
}
```

---

## 3. Configuration Properties mapping

Providers instantiate using environment configurations:
*   `EMAIL_PROVIDER`: Options `resend`, `mock`, `smtp`, `ses`.
*   `WHATSAPP_PROVIDER`: Options `meta`, `mock`, `twilio`.
*   `RESEND_API_KEY`: API access token for Email.
*   `META_ACCESS_TOKEN`: Auth key for WhatsApp.
*   `META_PHONE_NUMBER_ID`: WhatsApp Phone Number ID.
