"use client";

import * as React from "react";
import { NotificationCenterWorkspace } from "@/components/notifications/notification-center-workspace";

export default function StudentNotificationsPage() {
  return (
    <NotificationCenterWorkspace
      portal="student"
      title="Student Notification Center"
      subtitle="Track your eFRRO registration, Passport/Visa verification updates, and university compliance notices."
      preferencesHref="/student/settings"
    />
  );
}
