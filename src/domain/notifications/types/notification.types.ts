export interface Notification {
  id: string;
  studentId: string;
  templateId: string | null;
  documentType: "passport" | "visa" | "efrro";
  status: "queued" | "processing" | "sending" | "sent" | "delivered" | "read" | "failed" | "expired" | "cancelled";
  channel: string;
  recipientAddress: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  scheduledFor: Date;
  triggerSource: string;
  idempotencyKey: string;
  notificationContext: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  code: string;
  languageCode: string;
  version: number;
  isActive: boolean;
  title: string;
  subjectTemplate: string | null;
  bodyTemplate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentNotificationPreference {
  studentId: string;
  channel: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryLog {
  id: string;
  notificationId: string;
  attemptNumber: number;
  status: string;
  gatewayResponse: Record<string, unknown> | null;
  errorMessage: string | null;
  latencyMs?: number | null;
  providerName?: string | null;
  correlationId?: string | null;
  createdAt: Date;
}

export interface ReminderRule {
  id: string;
  documentType: "passport" | "visa" | "efrro";
  alertThresholdDays: number;
  channel: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledJob {
  id: string;
  jobName: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date | null;
  finishedAt: Date | null;
  batchSize: number;
  processedCount: number;
  errorLog: string | null;
  createdAt: Date;
}
