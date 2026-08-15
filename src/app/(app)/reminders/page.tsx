"use client";

import * as React from "react";
import { 
  NotificationHealthMetrics, 
  NotificationQueueTable 
} from "@/features/notifications/components/notification-center";
import { ReminderSettings } from "@/features/notifications/components/reminder-settings";
import { TemplateManager } from "@/features/notifications/components/template-manager";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { fetchReminderSummary, ReminderSummaryMetrics } from "@/app/(app)/reminders/actions";
import { Bell, Clock, FileText, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RemindersPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<"overview" | "rules" | "templates" | "logs">("overview");
  const [summary, setSummary] = React.useState<ReminderSummaryMetrics | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(true);

  const loadSummary = React.useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await fetchReminderSummary();
      setSummary(data);
    } catch {
      // ignore
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  React.useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Realtime Live Sync: Refresh notification and reminder engine metrics live
  useRealtimeSubscription({ 
    table: "notifications", 
    onEvent: () => {
      loadSummary();
    } 
  });

  useRealtimeSubscription({ 
    table: "reminder_rules", 
    onEvent: () => {
      loadSummary();
    } 
  });

  useRealtimeSubscription({ 
    table: "notification_templates", 
    onEvent: () => {} 
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-h1 tracking-tight text-foreground text-xl font-bold">
            Compliance Notification & Reminders Engine
          </h1>
          <p className="font-caption text-muted-foreground mt-1">
            Automated expiration warning alerts, customizable threshold schedules, multilingual message layouts, and communication queue audit logs across Passport, Visa, and eFRRO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSummary} className="h-8 text-xs gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingSummary ? "animate-spin" : ""}`} /> Refresh Metrics
          </Button>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 bg-muted/40 border border-border/40 p-1.5 rounded-xl w-fit flex-wrap">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Overview & Summary
          </button>
          <button 
            onClick={() => setActiveTab("rules")}
            className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'rules' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Trigger Rules
          </button>
          <button 
            onClick={() => setActiveTab("templates")}
            className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'templates' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Templates Manager
          </button>
          <button 
            onClick={() => setActiveTab("logs")}
            className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'logs' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="h-3.5 w-3.5" /> Communication Logs
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <NotificationHealthMetrics summary={summary} loading={loadingSummary} />
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Recent Queue Dispatches
              </h2>
              <NotificationQueueTable />
            </div>
          </div>
        )}

        {/* Tab 2: Trigger Rules */}
        {activeTab === "rules" && <ReminderSettings />}

        {/* Tab 3: Template Manager */}
        {activeTab === "templates" && <TemplateManager />}

        {/* Tab 4: Logs */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <NotificationQueueTable />
          </div>
        )}
      </div>
    </div>
  );
}
