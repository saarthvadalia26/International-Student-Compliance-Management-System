# Notification Lifecycle Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Lifecycle States Definitions

Every notification in the ISCMS tracking registry transitions through these statuses:

| Status | Type | Description |
| :--- | :--- | :--- |
| `QUEUED` | Initial | Notification has been created and is waiting to be processed by the worker. |
| `PROCESSING` | Intermediate | Queue worker has locked the record and is executing delivery via the provider. |
| `SENT` | Final | The provider successfully received the request and sent the email/WhatsApp message. |
| `DELIVERED` | Final | Optional webhook confirmation indicating that the recipient device acknowledged receipt. |
| `READ` | Final | Optional webhook confirmation indicating that the message was opened/read. |
| `FAILED` | Terminal | Provider delivery failed, and all retry schedules have been exhausted. |
| `EXPIRED` | Terminal | Notification was scheduled to run but exceeded its valid threshold date. |
| `CANCELLED` | Terminal | Student uploaded the renewed document before the reminder was processed, cancelling the alert. |

---

## 2. Event Triggers & State Transitions

*   **Idempotency Triggers**: Before insertion, the repository evaluates the `idempotency_key` constraint to prevent identical queued alerts.
*   **Compliance Updates**: When a student uploads a new document, a cascade trigger flags all pending scheduled alerts for that document type as `CANCELLED`.
*   **Exponential Retry Backoff**: On delivery failure, if the retry count is less than `max_retries` (default: 3), the status is reverted to `QUEUED`, and `next_retry_at` is set to `Date.now() + 5 * 60 * 1000 * Math.pow(2, retryCount)`.
