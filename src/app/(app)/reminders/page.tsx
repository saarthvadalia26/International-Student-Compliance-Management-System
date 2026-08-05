"use client";

import * as React from "react";
import { NotificationHealthMetrics, NotificationQueueTable, NotificationItem } from "@/features/notifications/components/notification-center";
import { ReminderSettings } from "@/features/notifications/components/reminder-settings";
import { TemplateManager } from "@/features/notifications/components/template-manager";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export default function RemindersPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<"logs" | "rules" | "templates">("logs");

  // State for standard logs queue (empty until fetched)
  const [items, setItems] = React.useState<NotificationItem[]>([]);

  // Realtime Live Sync: Refresh notification and reminder engine metrics live
  useRealtimeSubscription({ table: "notifications", onEvent: () => {} });
  useRealtimeSubscription({ table: "reminder_rules", onEvent: () => {} });

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
            <NotificationQueueTable items={items} />
          </div>
        )}

        {activeTab === "rules" && <ReminderSettings />}

        {activeTab === "templates" && <TemplateManager />}
      </div>
    </div>
  );
}
