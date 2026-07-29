import { IEmailService } from "../email/email.service";
import { IWhatsAppService } from "../whatsapp/whatsapp.service";
import { ILoggingService } from "../logging/logging.service";

export interface QueueNotification {
  id: string;
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  alertThresholdDays: number;
  channel: "email" | "whatsapp" | "both";
  recipientAddress: string;
  status: "queued" | "sent" | "failed" | "cancelled";
  payload: Record<string, unknown>;
  retryCount: number;
  nextRetryAt?: Date | null;
  sentAt?: Date | null;
}

export interface INotificationService {
  /**
   * Enqueue a new compliance reminder alert (ADR-005)
   */
  enqueueNotification(notification: Omit<QueueNotification, "id" | "status" | "retryCount">): Promise<string>;

  /**
   * Process pending alerts in the queue (invoked by scheduler workers)
   */
  processQueue(): Promise<{ processedCount: number; failedCount: number }>;

  /**
   * Cancel queued alerts for a student (BR-008: Auto-Cancellation on Verify)
   */
  cancelPendingAlerts(studentId: string, documentType: "passport" | "visa" | "efrro"): Promise<number>;
}

export class NotificationQueueService implements INotificationService {
  constructor(
    private emailService: IEmailService,
    private whatsappService: IWhatsAppService,
    private loggingService: ILoggingService
  ) {}

  async enqueueNotification(notification: Omit<QueueNotification, "id" | "status" | "retryCount">): Promise<string> {
    throw new Error("Supabase Notification Queue table integration not implemented for production yet.");
  }

  async processQueue(): Promise<{ processedCount: number; failedCount: number }> {
    console.log("[NOTIF_QUEUE] Running scheduled queue scan...");
    
    // Logic will scan Supabase notifications queue and process items
    // If sent: update status = 'sent', write log event 'ReminderSent'
    // If failed: increment retryCount. If retryCount >= 3, status = 'failed' (log 'ReminderFailed')
    
    return { processedCount: 0, failedCount: 0 };
  }

  async cancelPendingAlerts(studentId: string, documentType: "passport" | "visa" | "efrro"): Promise<number> {
    console.log(`[NOTIF_QUEUE] Cancelling pending ${documentType} alerts for student ${studentId}`);
    
    await this.loggingService.log({
      action: "UPDATE",
      eventName: "ReminderCancelled",
      tableName: "notifications",
      rowId: studentId,
      changes: { status: "cancelled", documentType }
    });

    return 0; // Returns count of cancelled rows
  }
}
