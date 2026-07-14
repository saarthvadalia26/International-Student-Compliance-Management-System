# Notification Table Diagnostic Report

This diagnostic report outlines the investigation, root cause, database schema verification, fix details, and build validation results for the schema cache error related to `public.notifications` table.

---

## 1. Root Cause Analysis

The database error:
```
[DB_QUERY_FAILED]
Could not find the table 'public.notifications' in the schema cache
```
occurs when the PostgREST server API container is started before migration `006_notifications.sql` has been fully executed, or when the PostgREST server has a stale cache of database relations. 

During our diagnostic investigation, we confirmed that:
*   The migration `006_notifications.sql` is present in the repository and correctly creates the `public.notifications` table, its child logs, index variables, and foreign key relations.
*   We executed direct queries against the live Supabase database instance (using a Node.js scratch validation script) and verified that the table `public.notifications` **does** exist in the schema, is fully queryable, and resolves successfully without throwing schema cache errors.
*   The PostgREST cache has successfully refreshed on the remote Supabase database instance, allowing embedded join queries (e.g. `student:students!inner(...)`) to execute properly.

---

## 2. Migrations & Database Objects Inspected

We audited the following resources inside `supabase/migrations/`:
1.  **[006_notifications.sql](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/supabase/migrations/006_notifications.sql)**:
    *   Defines: `CREATE TABLE IF NOT EXISTS public.notifications`
    *   Fkeys: `student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE`
    *   Indexes: `idx_notifications_queue` on `(status, scheduled_for)`, and `idx_notifications_student_doc` on `(student_id, document_type)`.
2.  **[008_cleanup_demo_data.sql](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/supabase/migrations/008_cleanup_demo_data.sql)**: Cascades truncation rules properly.
3.  **[009_student_portal.sql](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/supabase/migrations/009_student_portal.sql)**: Resolves tokens database tables.

All related database objects exist on the remote PostgreSQL environment:
*   `notification_templates` (Active template records found)
*   `student_notification_preferences` (Preferences mapping exists)
*   `notifications` (Active notifications queue table exists)
*   `notification_delivery_log` (Execution log exists)
*   `reminder_rules` (Threshold criteria rules exist)
*   `scheduled_jobs` (State metrics tracker exists)

---

## 3. Fix Details

Instead of keeping client-side try-catch workarounds that return empty mock lists, we removed all temporary fallbacks so that database query failures bubble up naturally. We preserved the architecture improvements from the previous sprint to enforce safety:

1.  **Single Source of Truth**: Retained **[config.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/src/domain/notifications/config.ts)** defining `NOTIFICATION_TABLE_NAME = "notifications"` to avoid hardcoded query strings.
2.  **Clean Repository Queries**: Removed `isTableNotFoundError` checks inside:
    *   `getEfrroReport` and `getNotificationReport` inside **[report.repository.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/src/domain/reports/repositories/report.repository.ts)**.
    *   `getStudentReminders` inside **[student-portal.repository.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/src/domain/student-portal/repositories/student-portal.repository.ts)**.
    *   All queue, pull, status updates, and cancellation functions inside **[notification.repository.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/src/domain/notifications/repositories/notification.repository.ts)**.
    *   Analytics queries inside **[actions.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%2520System/src/app/(app)/dashboard/actions.ts)**.
3.  **Schema Reload Instructions**: If a local environment encounters a stale PostgREST cache schema mismatch, reload the cache by executing the SQL command inside Supabase Studio:
    ```sql
    NOTIFY pgrst, 'reload schema';
    ```

---

## 4. Compilation & Verification Results

We verified that the codebase passes all strict type checks and compiles cleanly:

*   **Static analysis (`npm run lint`)**: Checked successfully with **0 warnings and 0 errors**.
*   **TypeScript type checking (`tsc --noEmit`)**: Checked successfully with **0 errors**.
*   **Production build compilation (`npm run build`)**: Compiled successfully, prerendering all static and dynamic pages.
