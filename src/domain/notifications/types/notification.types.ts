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
  documentType?: "passport" | "visa" | "efrro" | "general" | "all";
  eventType?: "document_expiry" | "portal_otp" | "replacement_approved" | "replacement_rejected" | "document_verified" | "document_rejected" | "general_alert";
  channel?: "email" | "whatsapp" | "both" | "sms";
  category?: "utility" | "authentication" | "marketing" | "alert";
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  providerTemplateName?: string | null;
  providerTemplateId?: string | null;
  subjectTemplate: string | null;
  bodyTemplate: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplateAuditLog {
  id: string;
  templateId: string;
  action: "CREATED" | "UPDATED" | "DUPLICATED" | "ACTIVATED" | "DEACTIVATED" | "ARCHIVED";
  actorId?: string | null;
  actorEmail?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  createdAt: Date;
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
  ruleName?: string | null;
  templateId?: string | null;
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
