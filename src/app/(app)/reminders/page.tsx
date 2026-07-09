"use client";

import * as React from "react";
import { NotificationHealthMetrics, NotificationQueueTable, MockNotificationItem } from "@/features/notifications/components/notification-center";
import { ReminderSettings } from "@/features/notifications/components/reminder-settings";
import { TemplateManager } from "@/features/notifications/components/template-manager";

export default function RemindersPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<"logs" | "rules" | "templates">("logs");

  // Mock data representing standard logs queue
  const [mockItems] = React.useState<MockNotificationItem[]>([
    {
      id: "n1-uuid",
      recipient: "john.doe@university.edu",
      documentType: "passport",
      channel: "email",
      status: "sent",
      retryCount: 0,
      triggerSource: "cron_scheduler",
      scheduledFor: "2026-07-08 09:00",
      gatewayResponse: { gateway_id: "resend-msg-8a9d2c", status: "delivered" }
    },
    {
      id: "n2-uuid",
      recipient: "+919876543210",
      documentType: "visa",
      channel: "whatsapp",
      status: "queued",
      retryCount: 1,
      triggerSource: "event_handler",
      scheduledFor: "2026-07-08 22:45",
      gatewayResponse: { status: "queued_retry", error: "Carrier temporary throttling" }
    },
    {
      id: "n3-uuid",
      recipient: "clara.smith@university.edu",
      documentType: "efrro",
      channel: "email",
      status: "failed",
      retryCount: 3,
      triggerSource: "cron_scheduler",
      scheduledFor: "2026-07-07 09:00",
      gatewayResponse: { error: "SMTP invalid recipient address format ref: RFC-5322" }
    }
  ]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-xs">
      <div>
        <h1 className="font-h1 tracking-tight text-foreground text-xl font-bold">Compliance Notification & Reminders Engine</h1>
        <p className="font-caption text-muted-foreground">
          Monitor alert metrics, configure pre-expiry and post-expiry rules, manage multilingual templates, and audit delivery queue logs.
        </p>
      </div>

      <div className="w-full space-y-6">
        <div className="flex gap-2 bg-muted/30 border border-border/40 p-1 rounded-lg w-fit">
          <button 
            onClick={() => setActiveTab("logs")}
            className={`text-xs px-4 py-1.5 rounded-md font-medium transition-all ${activeTab === 'logs' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Notification Center
          </button>
          <button 
            onClick={() => setActiveTab("rules")}
            className={`text-xs px-4 py-1.5 rounded-md font-medium transition-all ${activeTab === 'rules' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Trigger Rules & Preferences
          </button>
          <button 
            onClick={() => setActiveTab("templates")}
            className={`text-xs px-4 py-1.5 rounded-md font-medium transition-all ${activeTab === 'templates' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Templates Manager
          </button>
        </div>

        {activeTab === "logs" && (
          <div className="space-y-6">
            <NotificationHealthMetrics />
            <NotificationQueueTable items={mockItems} />
          </div>
        )}

        {activeTab === "rules" && <ReminderSettings />}

        {activeTab === "templates" && <TemplateManager />}
      </div>
    </div>
  );
}
