# Unified Notification Architecture Specification

Target Institution: National Forensic Sciences University (NFSU)  
System: International Student Compliance Management System (ISCMS)  
Role: Senior Software Architect / UI Engineer  
Date: August 7, 2026  

---

## 1. Architectural Overview & Design Model

We have established a unified, centralized **Notification System Architecture** shared seamlessly across the **Staff/Admin Workspace** (`/notifications`) and the **Student Portal** (`/student/notifications`).

```
                              Unified Notification Infrastructure
                                               │
                      ┌────────────────────────┴────────────────────────┐
                      │                                                 │
            Staff/Admin Workspace                             Student Portal
            (/notifications)                                  (/student/notifications)
                      │                                                 │
            Staff Compliance & Audit                          Student Expiry & Document
            Notifications                                     Notifications
                      │                                                 │
                      └────────────────────────┬────────────────────────┘
                                               │
                                   Shared Reusable UI Components
                                   (NotificationCenterWorkspace)
                                               │
                                   Shared Server Actions & RLS
                                   (in_app_notifications + RLS)
```

---

## 2. Server-Side Authorization & Ownership Isolation

1. **Database Schema & Row Level Security**:
   - Built on `public.in_app_notifications`.
   - Protected by standard PostgreSQL RLS policies (`SELECT_in_app_notifications_StaffAdmin`, `SELECT_in_app_notifications_StudentSelf`).
   - Students can only view records where `user_id = auth.uid()` or student-scoped notifications.
2. **Role-Enforced Server-Side Filters (`actions.ts`)**:
   - `fetchInAppNotifications({ portal: "student" | "staff" })`:
     - Student Portal requests automatically filter out internal administrative categories (`security`, `audit`, `system`).
     - Staff Portal requests return staff compliance alerts, student registration updates, and audit logs.
   - Prevents student users from discovering or querying staff-private activities or other students' notifications.

---

## 3. Shared UI Component System (`src/components/notifications/`)

- **`NotificationCenterWorkspace`**:
  - Centralized responsive container (`max-w-5xl mx-auto`).
  - Supports role-tailored category tabs:
    - **Staff Categories**: `All Notifications`, `Documents`, `Compliance & Reminders`, `Students`, `Security & Audit`, `System Alerts`.
    - **Student Categories**: `All Notifications`, `Documents`, `Compliance & Reminders`, `Account Notifications`.
  - Search query filtering, priority selection, unread toggles, skeleton shimmer loaders, and empty/error states.
- **`NotificationBell`**:
  - Shared header trigger component for both Staff Header and Student Portal Shell (`/student/notifications`).
  - Displays dynamic unread count badges with live WebSocket pulse animation. Zero popups.

---

## 4. Realtime WebSocket Synchronization

- Uses `useRealtimeSubscription({ table: "in_app_notifications" })`.
- Live `INSERT`, `UPDATE`, and `DELETE` events update the active list and header bell count dynamically without full page reloads.
- For Student Portal subscriptions, incoming events with staff-only categories are automatically ignored.

---

## 5. Security & Infrastructure Controls

- Student notification preferences (`/student/settings`) allow configuring user-level in-app and email reminder alerts.
- Twilio WhatsApp auth tokens, SMTP credentials, Cloudflare R2 keys, and Supabase Service Role keys remain strictly isolated in server environment variables and are **NEVER** exposed to client components.
