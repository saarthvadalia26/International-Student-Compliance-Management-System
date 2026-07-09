# Sprint 04 - Notification Engine Frontend Design Plan (V2)

- **Status**: Revised & Proposed
- **Author**: Frontend Engineer
- **Sprint**: Sprint 4 - Notification Engine

---

## 1. Page & Routing Architecture
*   `/dashboard`: Embeds the new **Notification Health Metrics** widget panel.
*   `/reminders`: Renders global **Notification Center** (delivery logs, trigger source indicators, and AI context views).
*   `/settings/notifications`: Renders the new **Notification Preferences Toggle** section.
*   `/settings/templates`: Renders **Template Manager** (supporting language translations and version number selection).

---

## 2. Component Hierarchy

```
[NotificationCenterPage]
 ├── [NotificationHealthMetrics] (Delivered, Failed, Queued stats, Gateway latencies)
 ├── [FilterBar] (Filter by Status, Channel, Trigger Source, Language)
 ├── [NotificationQueueTable]
 │    └── [DeliveryStatusBadge]
 └── [AIContextInspectorDrawer] (Inspects notification_context JSONB parameters)

[ReminderSettingsPage]
 ├── [NotificationPreferencesCard] (Student Toggles: Email, WhatsApp, SMS, Push)
 └── [ReminderThresholdsManager] (Adds rules for both pre-expiry and post-expiry alerts)

[TemplateManagerPage]
 ├── [TemplatesList] (Sorts by code and language variants)
 └── [TemplateEditForm]
      ├── [LanguageSelector] (Switch between English, French, Spanish, etc.)
      └── [VersionHistorySelector] (Switch active template version rollback options)
```

---

## 3. Notification Health Dashboard Widget
*   **Metrics Rendered**:
    *   **Success Rate**: Percentage of messages successfully delivered (sent / total).
    *   **Gateway Latency**: Average response time tracking.
    *   **Active Warnings**: Count of active post-expiry reminders currently looping.
    *   **Queue Health**: Bar chart mapping queued, sending, and failed retry items.

---

## 4. Accessibility (a11y) & Responsiveness
*   **Accessibility Labels**: Inputs (such as threshold settings or template translation fields) are mapped to explicit labels. Badges indicate status descriptions (e.g. `aria-label="Delivery status: queued, next retry scheduled in 10 minutes"`).
*   **Responsive layouts**: Dynamic panels (like metrics summary widgets and queue listings) automatically wrap from grid columns to single lines on mobile interfaces.
