"use client";

import * as React from "react";
import { NotificationCenterWorkspace } from "@/components/notifications/notification-center-workspace";

export default function StaffNotificationsPage() {
  return (
    <NotificationCenterWorkspace
      portal="staff"
      title="Notification Center"
      subtitle="Stay informed about document verification, compliance deadlines, reminders, and system activity."
      preferencesHref="/settings?tab=notifications"
    />
  );
}
