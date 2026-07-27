# Sprint 07 - Notification Architecture Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Notification Engine (Phase 1)
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Architectural Layers

The notification engine is structured cleanly:

*   **Repository Layer**: `SupabaseNotificationRepository` queries, locks, and updates queue rows.
*   **Service Layer**: `ReminderEngine` evaluates expiring credentials and inserts alerts. `QueueProcessor` coordinates bulk dispatching.
*   **Provider Layer**: `INotificationProvider` decouples delivery APIs (Resend, Meta) via standard adapters.
*   **Token Service**: `StudentPortalService` handles secure OTP magic link token checks.

---

## 2. Notification Templates Layout

### 2.1 Email Template (NFSU Branded)
```html
<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <div style="background-color: #0b3c5d; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
    <h2 style="color: white; margin: 0;">NFSU Compliance Portal</h2>
  </div>
  <div style="padding: 20px;">
    <p>Dear {{student_name}},</p>
    <p>Your eFRRO document is expiring in {{days_left}} days on <strong>{{expiry_date}}</strong>.</p>
    <p>Please upload a renewed version immediately to keep your compliance status active.</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="{{secure_upload_link}}" style="background-color: #0b3c5d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Upload Renewed eFRRO</a>
    </div>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #64748b; text-align: center;">For compliance support, email support@nfsu.edu.in</p>
  </div>
</div>
```

### 2.2 WhatsApp Template (Utility Format)
```
Dear {{student_name}},

Your eFRRO compliance document expires on {{expiry_date}}.

Please upload a renewed certificate immediately: {{secure_upload_link}}

Regards,
Office of International Compliance, NFSU
```
