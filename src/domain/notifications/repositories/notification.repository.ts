import { 
  Notification, 
  NotificationTemplate, 
  StudentNotificationPreference, 
  DeliveryLog, 
  ScheduledJob,
  ReminderRule 
} from "../types/notification.types";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { NOTIFICATION_TABLE_NAME } from "../config";

export interface INotificationRepository {
  queueNotification(notification: Partial<Notification>): Promise<Notification>;
  getPendingNotifications(batchSize: number): Promise<Notification[]>;
  updateNotificationStatus(id: string, status: Notification["status"], retryCount?: number, nextRetryAt?: Date | null): Promise<void>;
  logDeliveryAttempt(log: Partial<DeliveryLog>): Promise<void>;
  cancelScheduledNotifications(studentId: string, docType: string): Promise<void>;
  getStudentPreferences(studentId: string): Promise<StudentNotificationPreference[]>;
  getActiveTemplate(code: string, language: string): Promise<NotificationTemplate | null>;
  getReminderRules(): Promise<ReminderRule[]>;
  createScheduledJob(job: Partial<ScheduledJob>): Promise<ScheduledJob>;
  updateScheduledJob(id: string, job: Partial<ScheduledJob>): Promise<void>;
  getStudentNotifications(studentId: string): Promise<Notification[]>;
}

export interface INotificationDbRow {
  id: string;
  student_id: string;
  template_id: string | null;
  document_type: "passport" | "visa" | "efrro";
  status: "queued" | "processing" | "sending" | "sent" | "delivered" | "read" | "failed" | "expired" | "cancelled";
  channel: string;
  recipient_address: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  scheduled_for: string;
  trigger_source: string;
  idempotency_key: string;
  notification_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface INotificationTemplateDbRow {
  id: string;
  code: string;
  language_code: string;
  version: number;
  is_active: boolean;
  title: string;
  subject_template: string | null;
  body_template: string;
  created_at: string;
  updated_at: string;
}

export class SupabaseNotificationRepository implements INotificationRepository {
  private mapToDomain(row: INotificationDbRow): Notification {
    return {
      id: row.id,
      studentId: row.student_id,
      templateId: row.template_id,
      documentType: row.document_type,
      status: row.status,
      channel: row.channel,
      recipientAddress: row.recipient_address,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : null,
      scheduledFor: new Date(row.scheduled_for),
      triggerSource: row.trigger_source,
      idempotencyKey: row.idempotency_key,
      notificationContext: row.notification_context || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapTemplateToDomain(row: INotificationTemplateDbRow): NotificationTemplate {
    return {
      id: row.id,
      code: row.code,
      languageCode: row.language_code,
      version: row.version,
      isActive: row.is_active,
      title: row.title,
      subjectTemplate: row.subject_template,
      bodyTemplate: row.body_template,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async queueNotification(notification: Partial<Notification>): Promise<Notification> {
    const supabase = getAdminSupabase();
    
    const dbRow = {
      student_id: notification.studentId,
      template_id: notification.templateId,
      document_type: notification.documentType,
      status: notification.status || 'queued',
      channel: notification.channel,
      recipient_address: notification.recipientAddress,
      max_retries: notification.maxRetries || 3,
      scheduled_for: notification.scheduledFor ? notification.scheduledFor.toISOString() : new Date().toISOString(),
      trigger_source: notification.triggerSource,
      idempotency_key: notification.idempotencyKey,
      notification_context: notification.notificationContext || {}
    };

    console.log(`[DB_REPOSITORY] Queuing notification for student: ${notification.studentId}`);
    const { data, error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .insert(dbRow)
      .select("*")
      .single();

    if (error) {
      throw new Error(`[QUEUE_FAILED] ${error.message}`);
    }

    return this.mapToDomain(data);
  }

  async getPendingNotifications(batchSize: number): Promise<Notification[]> {
    const supabase = getAdminSupabase();
    
    console.log(`[DB_REPOSITORY] Pulling pending notifications batch (limit ${batchSize})...`);
    // Batch select locking using skip locked simulation query. Supabase SELECT supports it
    const { data, error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .limit(batchSize);

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return (data || []).map(row => this.mapToDomain(row));
  }

  async updateNotificationStatus(id: string, status: Notification["status"], retryCount?: number, nextRetryAt?: Date | null): Promise<void> {
    const supabase = getAdminSupabase();
    
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (retryCount !== undefined) updatePayload.retry_count = retryCount;
    if (nextRetryAt !== undefined) updatePayload.next_retry_at = nextRetryAt ? nextRetryAt.toISOString() : null;

    console.log(`[DB_REPOSITORY] Updating status for notification ${id} to: ${status}`);
    const { error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] ${error.message}`);
    }
  }

  async logDeliveryAttempt(log: Partial<DeliveryLog>): Promise<void> {
    const supabase = getAdminSupabase();

    const dbRow = {
      notification_id: log.notificationId,
      attempt_number: log.attemptNumber,
      status: log.status,
      gateway_response: log.gatewayResponse || {},
      error_message: log.errorMessage || null,
      latency_ms: log.latencyMs ?? null,
      provider_name: log.providerName ?? null,
      correlation_id: log.correlationId ?? null
    };

    console.log(`[DB_REPOSITORY] Logging delivery attempt for notification: ${log.notificationId}`);
    const { error } = await supabase
      .from("notification_delivery_log")
      .insert(dbRow);

    if (error) {
      throw new Error(`[DB_INSERT_FAILED] ${error.message}`);
    }
  }

  async cancelScheduledNotifications(studentId: string, docType: string): Promise<void> {
    const supabase = getAdminSupabase();

    console.log(`[DB_REPOSITORY] Cancelling scheduled notifications for student ${studentId} type: ${docType}`);
    const { error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .eq("document_type", docType)
      .eq("status", "queued");

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] ${error.message}`);
    }
  }

  async getStudentPreferences(studentId: string): Promise<StudentNotificationPreference[]> {
    const supabase = getAdminSupabase();

    console.log(`[DB_REPOSITORY] Fetching preferences configurations for student: ${studentId}`);
    const { data, error } = await supabase
      .from("student_notification_preferences")
      .select("*")
      .eq("student_id", studentId);

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return (data || []).map(row => ({
      studentId: row.student_id,
      channel: row.channel,
      isEnabled: row.is_enabled,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getActiveTemplate(code: string, language: string): Promise<NotificationTemplate | null> {
    const supabase = getAdminSupabase();

    console.log(`[DB_REPOSITORY] Resolving active translation template for code ${code} language: ${language}`);
    const { data, error } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("code", code)
      .eq("language_code", language)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return data ? this.mapTemplateToDomain(data) : null;
  }

  async getReminderRules(): Promise<ReminderRule[]> {
    const supabase = getAdminSupabase();

    console.log(`[DB_REPOSITORY] Querying active reminder threshold rules...`);
    const { data, error } = await supabase
      .from("reminder_rules")
      .select("*")
      .eq("is_active", true);

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      documentType: row.document_type,
      alertThresholdDays: row.alert_threshold_days,
      channel: row.channel,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async createScheduledJob(job: Partial<ScheduledJob>): Promise<ScheduledJob> {
    const supabase = getAdminSupabase();

    const dbRow = {
      job_name: job.jobName,
      status: job.status || 'pending',
      started_at: job.startedAt ? job.startedAt.toISOString() : null,
      finished_at: job.finishedAt ? job.finishedAt.toISOString() : null,
      batch_size: job.batchSize || 100,
      processed_count: job.processedCount || 0,
      error_log: job.errorLog || null
    };

    const { data, error } = await supabase
      .from("scheduled_jobs")
      .insert(dbRow)
      .select("*")
      .single();

    if (error) {
      throw new Error(`[DB_INSERT_FAILED] ${error.message}`);
    }

    return {
      id: data.id,
      jobName: data.job_name,
      status: data.status,
      startedAt: data.started_at ? new Date(data.started_at) : null,
      finishedAt: data.finished_at ? new Date(data.finished_at) : null,
      batchSize: data.batch_size,
      processedCount: data.processed_count,
      errorLog: data.error_log,
      createdAt: new Date(data.created_at)
    };
  }

  async updateScheduledJob(id: string, job: Partial<ScheduledJob>): Promise<void> {
    const supabase = getAdminSupabase();

    const updatePayload: Record<string, unknown> = {};
    if (job.status) updatePayload.status = job.status;
    if (job.finishedAt) updatePayload.finished_at = job.finishedAt.toISOString();
    if (job.processedCount !== undefined) updatePayload.processed_count = job.processedCount;
    if (job.errorLog !== undefined) updatePayload.error_log = job.errorLog;

    const { error } = await supabase
      .from("scheduled_jobs")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] ${error.message}`);
    }
  }

  async getStudentNotifications(studentId: string): Promise<Notification[]> {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return (data || []).map(row => this.mapToDomain(row));
  }
}
