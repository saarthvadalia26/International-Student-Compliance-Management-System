# Sprint 04 - Notification Engine Backend Design Plan (V2)

- **Status**: Revised & Proposed
- **Author**: Backend Engineer
- **Sprint**: Sprint 4 - Notification Engine

---

## 1. Interface Declarations

### A. Notification Preferences & Template Versioning Interfaces
```typescript
export interface INotificationPreferencesService {
  isChannelEnabled(studentId: string, channel: string): Promise<boolean>;
  updatePreferences(studentId: string, channel: string, isEnabled: boolean): Promise<void>;
}

export interface ITemplateResolver {
  resolveTemplate(code: string, language: string, preferredVersion?: number): Promise<NotificationTemplate>;
}
```

### B. Reusable Queue Processor with Batching Strategy
```typescript
export interface IQueueProcessor {
  /**
   * Process pending queue in batches of batchSize.
   */
  processPendingQueue(batchSize: number): Promise<{ processed: number; failures: number }>;
}
```

### C. Reminder Scheduler Engine (Threshold & Post-Expiry Alerts)
```typescript
export interface IReminderEngine {
  /**
   * Evaluates alerts. Supports negative thresholds for post-expiry intervals.
   */
  evaluateComplianceAndQueueAlerts(triggerSource: "cron_scheduler" | "event_handler"): Promise<void>;
}
```

---

## 2. Dynamic Event Flows & AI Readiness

*   **Idempotency & Duplicate Prevention**:
    *   Dynamic composite unique key generated at runtime:
        `idempotency_key = student_id:doc_type:threshold_days:version_number:channel`
*   **Trigger Source Tracking**:
    *   Every notification logs its initiation trigger source (e.g. `'event_handler'` when a document is verified/rejected, or `'cron_scheduler'` during daily compliance reviews).
*   **AI context placeholder (`notification_context`)**:
    *   The `notifications` table reserves a JSONB context parameter block:
        ```typescript
        interface NotificationContext {
          aiGeneratedSummary?: string;
          toneOverride?: "formal" | "urgent";
          customParameters?: Record<string, string>;
        }
        ```
        This isolates AI customization scopes without altering core messaging schemas.

---

## 3. Queue Processor Batching Algorithm
1.  Initiate transaction. Lock pending records in batches using `SELECT ... FOR UPDATE SKIP LOCKED` to prevent duplicate processing by parallel scheduler runs:
    ```sql
    SELECT * FROM public.notifications
    WHERE status = 'queued' AND scheduled_for <= now()
    LIMIT :batchSize
    FOR UPDATE SKIP LOCKED;
    ```
2.  Filter notifications by querying `student_notification_preferences`. Skip channels explicitly disabled by the student.
3.  Load active translations matching student language preferences.
4.  Submit messages to target gateway providers. Record details and update logs inside a single transaction batch.
