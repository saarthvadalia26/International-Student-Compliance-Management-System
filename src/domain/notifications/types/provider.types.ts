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

// -------------------------------------------------------------
// Standardized Provider Errors
// -------------------------------------------------------------

export class NotificationProviderError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "NotificationProviderError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProviderUnavailableError extends NotificationProviderError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = "ProviderUnavailableError";
  }
}

export class AuthenticationError extends NotificationProviderError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends NotificationProviderError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = "RateLimitError";
  }
}

export class InvalidTemplateError extends NotificationProviderError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = "InvalidTemplateError";
  }
}

export class RetryableDeliveryError extends NotificationProviderError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = "RetryableDeliveryError";
  }
}
