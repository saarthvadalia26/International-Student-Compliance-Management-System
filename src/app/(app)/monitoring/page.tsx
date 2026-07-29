"use client";

import * as React from "react";
import { Activity, Server, Database, Mail, HardDrive, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
  version: string;
  commit: string;
  services: {
    database: string;
    storage: string;
    emailProvider: string;
    whatsappProvider: string;
    scheduler: string;
  };
  system: {
    memoryUsage: number;
    nodeVersion: string;
  };
}

export default function MonitoringDashboard() {
  const [health, setHealth] = React.useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    
    const fetchHealthData = async () => {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error("Failed to fetch system health");
        const data = await res.json();
        if (active) {
          setHealth(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Network error");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchHealthData();
    // Poll every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const formatMemory = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  if (isLoading && !health) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
          <Activity className="h-8 w-8" />
          <span className="text-sm">Connecting to telemetry stream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans p-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> System Health Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time telemetry and SRE observability metrics.
          </p>
        </div>
        
        {health && (
          <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-lg border border-border/50 text-xs">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-bold flex items-center gap-1.5 ${health.status === 'operational' ? 'text-green-500' : 'text-amber-500'}`}>
              <div className={`h-2 w-2 rounded-full ${health.status === 'operational' ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
              {health.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Telemetry Disconnected</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {health && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{formatUptime(health.uptime)}</div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">Node Process: {health.system.nodeVersion}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Database Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold flex items-center gap-2 ${health.services.database === 'healthy' ? 'text-green-500' : 'text-destructive'}`}>
                {health.services.database === 'healthy' ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                {health.services.database.toUpperCase()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">Supabase PostgreSQL</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" /> Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{formatMemory(health.system.memoryUsage)}</div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">V8 Heap Used</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" /> Deployment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono truncate">{health.version}</div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right truncate">SHA: {health.commit}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {health && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">External Provider Dependencies</CardTitle>
            <CardDescription className="text-xs">Current status of third-party APIs and queues.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                  <HardDrive className="h-3 w-3" /> Object Storage
                </span>
                <p className={`text-xs font-bold ${health.services.storage === 'healthy' ? 'text-green-500' : 'text-amber-500'}`}>
                  {health.services.storage.toUpperCase()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email Gateway
                </span>
                <p className={`text-xs font-bold ${health.services.emailProvider === 'healthy' ? 'text-green-500' : 'text-amber-500'}`}>
                  {health.services.emailProvider.toUpperCase()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> WhatsApp API
                </span>
                <p className={`text-xs font-bold ${health.services.whatsappProvider === 'healthy' ? 'text-green-500' : 'text-amber-500'}`}>
                  {health.services.whatsappProvider.toUpperCase()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Scheduler Queue
                </span>
                <p className={`text-xs font-bold ${health.services.scheduler === 'healthy' ? 'text-green-500' : 'text-amber-500'}`}>
                  {health.services.scheduler.toUpperCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center pt-8">
        <p className="text-[10px] text-muted-foreground">
          Monitoring payload refreshed at: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '...'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          ISCMS SRE Telemetry • Powered by Sentry & Playwright
        </p>
      </div>
    </div>
  );
}
