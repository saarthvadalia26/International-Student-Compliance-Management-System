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
import { SectionNavGroup, SectionNavCard } from "@/components/ui/section-nav";

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
        <SectionNavGroup orientation="horizontal" variant="segmented" className="w-fit max-w-full">
          <SectionNavCard 
            icon={Layers}
            title="Overview & Summary"
            isActive={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            variant="segmented"
            size="sm"
          />
          <SectionNavCard 
            icon={Clock}
            title="Trigger Rules"
            isActive={activeTab === "rules"}
            onClick={() => setActiveTab("rules")}
            variant="segmented"
            size="sm"
          />
          <SectionNavCard 
            icon={FileText}
            title="Templates Manager"
            isActive={activeTab === "templates"}
            onClick={() => setActiveTab("templates")}
            variant="segmented"
            size="sm"
          />
          <SectionNavCard 
            icon={Bell}
            title="Communication Logs"
            isActive={activeTab === "logs"}
            onClick={() => setActiveTab("logs")}
            variant="segmented"
            size="sm"
          />
        </SectionNavGroup>

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
