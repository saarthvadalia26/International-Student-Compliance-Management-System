# Sprint 04 - Notification Engine Quality Assurance Strategy (V2)

- **Status**: Revised & Proposed
- **Author**: QA Engineer
- **Sprint**: Sprint 4 - Notification Engine

---

## 1. Test Coverage Specifications

### A. Unit Testing
*   **Target Components**: Language resolvers, template selectors, preference filters, and backoff calculators.
*   **Test Cases**:
    *   Verify `isChannelEnabled` blocks queue scheduling when channel is toggled `false`.
    *   Confirm multilingual selectors correctly load translations (e.g. `'es'` template when student prefers Spanish).
    *   Confirm template rollback updates default layouts to correct version references.

### B. Integration Testing (Batching & Locking)
*   **Target Components**: Scheduler, database transaction blocks, and provider clients.
*   **Test Cases**:
    *   Verify that post-expiry reminders trigger at negative threshold days (e.g., alert at 7 days past expiry).
    *   Validate queue processor batch constraints: if 250 items are queued with a batch size of 100, exactly 100 items are parsed in the first sequence.
    *   Verify locking mechanisms (`FOR UPDATE SKIP LOCKED`) by running parallel workers: make sure no single notification is processed twice.

### C. Performance & Stress Testing
*   **Stress Simulation**:
    *   Seed the database with 50,000 notifications. Run parallel processor jobs to verify batching latency rates.
*   **Latencies & Metrics Verification**:
    *   Confirm health metrics correctly report latencies and error count aggregates.

---

## 2. Security & RLS Compliance Gates

*   **Role Enforcement**:
    *   Verify that `student_notification_preferences` only allows students to update their own choices, while templates access remains restricted to administrators.
*   **PII Auditing**:
    *   Validate that template variables do not log private credentials in telemetry.
