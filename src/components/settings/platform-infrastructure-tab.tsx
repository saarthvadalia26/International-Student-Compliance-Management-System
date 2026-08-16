"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Database, 
  HardDrive, 
  MessageSquare, 
  Mail, 
  RefreshCw, 
  Activity, 
  Clock, 
  Server, 
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemInfrastructureDiagnostics, ServiceHealth } from "@/domain/system/types/diagnostics.types";
import { fetchSystemDiagnosticsAction } from "@/app/(app)/dashboard/health/actions";
import { toast } from "sonner";

export function PlatformInfrastructureTab() {
  const [diagnostics, setDiagnostics] = React.useState<SystemInfrastructureDiagnostics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastCheckedDisplay, setLastCheckedDisplay] = React.useState<string>("");

  const loadDiagnostics = React.useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      const data = await fetchSystemDiagnosticsAction(forceRefresh);
      setDiagnostics(data);
      if (data.checkedAt) {
        try {
          const d = new Date(data.checkedAt);
          setLastCheckedDisplay(d.toLocaleTimeString());
        } catch {
          setLastCheckedDisplay(data.checkedAt);
        }
      }
      if (forceRefresh) {
        toast.success("Infrastructure diagnostics refreshed");
      }
    } catch (err: unknown) {
      console.error("[INFRASTRUCTURE_TAB_LOAD_ERROR]", err);
      toast.error("Failed to load infrastructure health");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadDiagnostics(false);
  }, [loadDiagnostics]);

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderStatusBadge = (service: ServiceHealth) => {
    switch (service.status) {
      case "connected":
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        );
      case "configured":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Configured
          </span>
        );
      case "not_configured":
      case "disabled":
      case "not_integrated":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted/60 text-muted-foreground border border-border/40">
            <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />
            Not Configured
          </span>
        );
      case "unhealthy":
      case "unavailable":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Unhealthy
          </span>
        );
    }
  };

  if (isLoading && !diagnostics) {
    return (
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Querying live production infrastructure status...</span>
        </CardContent>
      </Card>
    );
  }

  if (!diagnostics) {
    return (
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          Unable to retrieve live infrastructure health.
          <div className="mt-3">
            <Button size="sm" onClick={() => loadDiagnostics(true)}>Retry Check</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { runtime, deployment, services } = diagnostics;

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 shadow-sm font-sans">
        <CardHeader className="bg-muted/10 border-b border-border/40 py-4 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Database className="h-4 w-4 text-muted-foreground" /> Platform Infrastructure Details
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Authoritative runtime health obtained directly from active production integrations.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDiagnostics(true)}
            disabled={isRefreshing}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Checking..." : "Refresh Status"}</span>
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          
          {/* Services Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Database */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" /> Database
                </span>
                {renderStatusBadge(services.database)}
              </div>
              <div className="text-xs font-semibold text-foreground">PostgreSQL / Supabase</div>
              <p className="text-[11px] text-muted-foreground font-mono">
                {services.database.latencyMs !== null && services.database.latencyMs !== undefined
                  ? `Latency: ${services.database.latencyMs} ms`
                  : "Managed Database Instance"}
              </p>
            </div>

            {/* Cloudflare R2 Storage */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5" /> Storage
                </span>
                {renderStatusBadge(services.storage)}
              </div>
              <div className="text-xs font-semibold text-foreground">Cloudflare R2</div>
              <div className="text-[11px] text-muted-foreground font-mono space-y-0.5">
                <div>Bucket: <strong className="text-foreground">{services.storage.bucket || "iscms-documents"}</strong></div>
                {services.storage.objectCount !== undefined && (
                  <div>{services.storage.objectCount} docs • {formatBytes(services.storage.approximateStorageBytes)}</div>
                )}
              </div>
            </div>

            {/* WhatsApp Business API */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Service
                </span>
                {renderStatusBadge(services.whatsapp)}
              </div>
              <div className="text-xs font-semibold text-foreground">WhatsApp Business API</div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {services.whatsapp.status === "not_configured"
                  ? "WhatsApp Business API credentials have not been configured."
                  : services.whatsapp.message || "Operational"}
              </p>
            </div>

            {/* Email Service */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email Service
                </span>
                {renderStatusBadge(services.email)}
              </div>
              <div className="text-xs font-semibold text-foreground">Email Service</div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {services.email.message || "Email service is not configured."}
              </p>
            </div>

          </div>

          {/* Technical Environment Details */}
          <div className="rounded-lg border border-border/40 bg-muted/5 p-4 space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-muted-foreground" /> Production Runtime Environment
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4 text-xs text-muted-foreground">
              <div><strong>Environment:</strong> <span className="font-mono text-foreground">{runtime.environment}</span></div>
              <div><strong>Platform:</strong> <span className="font-mono text-foreground">{runtime.platform}</span></div>
              <div><strong>Region:</strong> <span className="font-mono text-foreground">{runtime.region}</span></div>
              <div><strong>Node.js Version:</strong> <span className="font-mono text-foreground">{runtime.nodeVersion}</span></div>
              <div><strong>Next.js Version:</strong> <span className="font-mono text-foreground">{runtime.nextVersion}</span></div>
              <div><strong>App Version:</strong> <span className="font-mono text-foreground">v{runtime.appVersion}</span></div>
              <div><strong>Commit:</strong> <span className="font-mono text-foreground">{deployment.shortCommitSha || "Local"}</span></div>
              <div><strong>Branch:</strong> <span className="font-mono text-foreground">{deployment.commitRef || "main"}</span></div>
              <div><strong>Deployment:</strong> <span className="font-mono text-foreground">{deployment.deploymentId || "Local / Development"}</span></div>
            </div>
          </div>

          {/* Action Links & Footer */}
          <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Last checked: <strong className="font-mono text-foreground">{lastCheckedDisplay || "Live"}</strong></span>
            </div>

            <Link href="/dashboard/health">
              <Button size="sm" className="h-8 text-xs flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span>Launch System Health Monitoring Dashboard</span>
              </Button>
            </Link>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
