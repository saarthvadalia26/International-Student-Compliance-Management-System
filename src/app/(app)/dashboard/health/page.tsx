import * as React from "react";
import Link from "next/link";
import { 
  Users, 
  AlertTriangle, 
  ClipboardCheck, 
  Mail, 
  MessageSquare, 
  XCircle, 
  Layers, 
  HardDrive, 
  Clock, 
  Activity, 
  ChevronLeft,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { fetchSystemHealthMetrics } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemInfrastructurePanel } from "@/components/dashboard/system-infrastructure-panel";

export const revalidate = 0; // Disable server component static caching

export default async function SystemHealthDashboardPage() {
  const metrics = await fetchSystemHealthMetrics();

  // Helper to format bytes into readable scale
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 font-sans">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ChevronLeft className="h-3 w-3" /> Operations Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500 animate-pulse" /> System Health Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational dashboard tracking API services, database health, notification queues, and infrastructure diagnostics.
          </p>
        </div>
        
        <Link href="/dashboard/health">
          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Analytics
          </Button>
        </Link>
      </div>

      {/* Overview Matrix Section */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Students */}
        <Card className="border border-border/60 shadow-sm hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalStudents}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Active international academic profiles</p>
          </CardContent>
        </Card>

        {/* eFRRO Expiring Soon */}
        <Card className="border border-border/60 shadow-sm hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              eFRRO Warning Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.efrroExpiringSoon}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Expiring within warning thresholds</p>
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card className="border border-border/60 shadow-sm hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Pending Reviews
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{metrics.pendingReviews}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Awaiting compliance validations</p>
          </CardContent>
        </Card>

        {/* Queue Length */}
        <Card className="border border-border/60 shadow-sm hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Scheduler Queue
            </CardTitle>
            <Layers className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{metrics.queueLength}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Reminder alerts queued for dispatch</p>
          </CardContent>
        </Card>

      </div>

      {/* Sub-matrices for Dispatch Metrics and Infrastructure */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        
        {/* 1. System Infrastructure & Environment (Live Diagnostics) */}
        <SystemInfrastructurePanel initialData={metrics.diagnostics} />

        {/* 2. Scheduler Monitoring */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Compliance Reminder Scheduler
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-xs text-muted-foreground font-medium">Last Scheduler Run</span>
              <span className="text-xs font-semibold text-foreground font-mono">{metrics.lastSchedulerRun}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-xs text-muted-foreground font-medium">Next Scheduled execution</span>
              <span className="text-xs font-semibold text-foreground font-mono">{metrics.nextSchedulerRun}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-xs text-muted-foreground font-medium">Jobs Processed (Recent)</span>
              <span className="text-xs font-bold font-mono text-emerald-600">{metrics.jobsProcessedCount} jobs</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-xs text-muted-foreground font-medium">Failed executions (Recent)</span>
              <span className="text-xs font-bold font-mono text-rose-600">{metrics.jobsFailedCount} failures</span>
            </div>

            <div className="flex items-center justify-between py-2 last:border-b-0">
              <span className="text-xs text-muted-foreground font-medium">Avg Execution Latency</span>
              <span className="text-xs font-semibold font-mono text-foreground">{metrics.averageProcessingTimeMs} ms</span>
            </div>

          </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        
        {/* 3. Gateway Delivery Today */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Gateway Delivery Analytics (Today)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <div className="flex items-center gap-2.5 text-xs text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>Emails Dispatched</span>
              </div>
              <span className="text-sm font-semibold font-mono text-emerald-600">{metrics.emailsSentToday}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <div className="flex items-center gap-2.5 text-xs text-foreground">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>WhatsApp Alerts Delivered</span>
              </div>
              <span className="text-sm font-semibold font-mono text-emerald-600">{metrics.whatsAppDeliveredToday}</span>
            </div>

            <div className="flex items-center justify-between py-2 last:border-b-0">
              <div className="flex items-center gap-2.5 text-xs text-foreground">
                <XCircle className="h-4 w-4 text-rose-500" />
                <span>Failed Alerts Today</span>
              </div>
              <span className="text-sm font-semibold font-mono text-rose-600">{metrics.failedNotificationsToday}</span>
            </div>

          </CardContent>
        </Card>

        {/* 4. Storage & Asset Monitoring */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Storage & Asset Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <div className="flex items-center gap-2.5 text-xs text-foreground">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span>Disk Assets Uploaded</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold font-mono text-foreground">{metrics.storageUsageFiles} files</span>
                <p className="text-[9px] text-muted-foreground font-mono">Total size: {formatBytes(metrics.storageUsageBytes)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 last:border-b-0">
              <div className="flex items-center gap-2.5 text-xs text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Document Storage State</span>
              </div>
              <span className="text-xs font-semibold font-mono text-emerald-600">Active / Encrypted</span>
            </div>

          </CardContent>
        </Card>

      </div>

    </div>
  );
}
