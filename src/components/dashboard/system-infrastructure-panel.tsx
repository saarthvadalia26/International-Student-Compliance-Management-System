"use client";

import * as React from "react";
import { 
  Server, 
  RefreshCw, 
  Database, 
  MessageSquare, 
  Mail, 
  ShieldCheck, 
  GitBranch, 
  GitCommit, 
  Clock, 
  Globe, 
  Cpu, 
  Layers, 
  Copy, 
  Check
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemInfrastructureDiagnostics, ServiceHealth } from "@/domain/system/types/diagnostics.types";
import { fetchSystemDiagnosticsAction } from "@/app/(app)/dashboard/health/actions";
import { getDisplayAppVersion } from "@/config/version";
import { toast } from "sonner";

interface SystemInfrastructurePanelProps {
  initialData: SystemInfrastructureDiagnostics;
}

export function SystemInfrastructurePanel({ initialData }: SystemInfrastructurePanelProps) {
  const [diagnostics, setDiagnostics] = React.useState<SystemInfrastructureDiagnostics>(initialData);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [copiedSha, setCopiedSha] = React.useState(false);
  const [lastCheckedDisplay, setLastCheckedDisplay] = React.useState<string>("");

  // Format the checkedAt timestamp to the user's local browser time
  React.useEffect(() => {
    if (diagnostics.checkedAt) {
      try {
        const date = new Date(diagnostics.checkedAt);
        setLastCheckedDisplay(date.toLocaleTimeString());
      } catch {
        setLastCheckedDisplay(diagnostics.checkedAt);
      }
    }
  }, [diagnostics.checkedAt]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await fetchSystemDiagnosticsAction(true);
      setDiagnostics(updated);
      toast.success("Live diagnostics refreshed");
    } catch (err: unknown) {
      console.error("[DIAGNOSTICS_REFRESH_FAILED]", err);
      toast.error("Failed to refresh system diagnostics");
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyCommitSha = () => {
    const sha = diagnostics.deployment.commitSha;
    if (sha) {
      navigator.clipboard.writeText(sha);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
      toast.info("Commit SHA copied to clipboard");
    }
  };

  const formatDeployedTime = (isoString: string | null) => {
    if (!isoString) return "Local / Development";
    try {
      const date = new Date(isoString);
      return date.toUTCString();
    } catch {
      return isoString;
    }
  };

  const renderServiceBadge = (service: ServiceHealth) => {
    switch (service.status) {
      case "connected":
      case "healthy":
        return (
          <div className="flex items-center gap-2">
            {service.latencyMs !== null && service.latencyMs !== undefined && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {service.latencyMs} ms
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        );
      case "configured":
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Configured
            </span>
          </div>
        );
      case "not_configured":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40">
            <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />
            Not Configured
          </span>
        );
      case "disabled":
      case "not_integrated":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40">
            <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />
            Not Configured
          </span>
        );
      case "unhealthy":
      case "unavailable":
      default:
        return (
          <div className="flex items-center gap-2">
            {service.latencyMs !== null && service.latencyMs !== undefined && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {service.latencyMs} ms
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Unhealthy
            </span>
          </div>
        );
    }
  };

  const { runtime, deployment, services } = diagnostics;

  return (
    <Card className="border border-border/60 shadow-sm overflow-hidden font-sans">
      {/* Panel Header */}
      <CardHeader className="bg-muted/10 border-b border-border/40 py-3.5 px-6 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            System Infrastructure & Environment
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 text-xs px-2.5 flex items-center gap-1.5 hover:bg-muted"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        
        {/* Section 1: Runtime */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            Runtime
          </div>
          <div className="divide-y divide-border/20 text-xs rounded-md bg-muted/5 border border-border/30 px-3.5">
            
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Globe className="h-3 w-3 text-muted-foreground/70" /> Environment
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-mono ${
                runtime.environment.toLowerCase() === "production"
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : runtime.environment.toLowerCase() === "preview"
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              }`}>
                {runtime.environment}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Layers className="h-3 w-3 text-muted-foreground/70" /> Platform
              </span>
              <span className="font-semibold text-foreground">{runtime.platform}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Globe className="h-3 w-3 text-muted-foreground/70" /> Region
              </span>
              <span className="font-semibold font-mono text-foreground">{runtime.region}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Cpu className="h-3 w-3 text-muted-foreground/70" /> Node.js Version
              </span>
              <span className="font-semibold font-mono text-foreground">{runtime.nodeVersion}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Layers className="h-3 w-3 text-muted-foreground/70" /> Next.js Version
              </span>
              <span className="font-semibold font-mono text-foreground">{runtime.nextVersion}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Server className="h-3 w-3 text-muted-foreground/70" /> Application Version
              </span>
              <span className="font-semibold font-mono text-foreground">{getDisplayAppVersion(runtime.appVersion)}</span>
            </div>

          </div>
        </div>

        {/* Section 2: Deployment */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
            Deployment
          </div>
          <div className="divide-y divide-border/20 text-xs rounded-md bg-muted/5 border border-border/30 px-3.5">
            
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Server className="h-3 w-3 text-muted-foreground/70" /> Deployment ID
              </span>
              <span className="font-mono text-foreground font-semibold text-[11px]">
                {deployment.deploymentId || "Local / Development"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <GitCommit className="h-3 w-3 text-muted-foreground/70" /> Commit
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-foreground text-[11px]">
                  {deployment.shortCommitSha || "Local"}
                </span>
                {deployment.commitSha && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyCommitSha}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    title="Copy full commit SHA"
                  >
                    {copiedSha ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <GitBranch className="h-3 w-3 text-muted-foreground/70" /> Branch
              </span>
              <span className="font-mono font-semibold text-foreground">{deployment.commitRef || "main"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground/70" /> Deployed At
              </span>
              <span className="font-mono text-foreground text-[11px]">
                {formatDeployedTime(deployment.deployedAt)}
              </span>
            </div>

          </div>
        </div>

        {/* Section 3: Services & Integrations */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            Services & Integrations
          </div>
          <div className="divide-y divide-border/20 text-xs rounded-md bg-muted/5 border border-border/30 px-3.5">
            
            {/* Database */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">Database (PostgreSQL / Supabase)</span>
              </div>
              {renderServiceBadge(services.database)}
            </div>

            {/* WhatsApp Business API */}
            <div className="py-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">WhatsApp Business API</span>
                </div>
                {renderServiceBadge(services.whatsapp)}
              </div>
              {services.whatsapp.status === "not_configured" && (
                <p className="text-[11px] text-muted-foreground pl-5">
                  WhatsApp Business API credentials have not been configured.
                </p>
              )}
            </div>

            {/* Email Service */}
            <div className="py-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Email Service</span>
                </div>
                {renderServiceBadge(services.email)}
              </div>
              {services.email.status === "not_configured" && (
                <p className="text-[11px] text-muted-foreground pl-5">
                  Email service is not configured.
                </p>
              )}
            </div>

            {/* Bot Protection */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">Bot Protection (Cloudflare Turnstile)</span>
              </div>
              {renderServiceBadge(services.botProtection)}
            </div>

          </div>
        </div>

        {/* Panel Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Last checked: <strong className="font-mono text-foreground">{lastCheckedDisplay || "Live"}</strong></span>
          </div>
          <span className="text-[10px] text-muted-foreground/70">Production Diagnostics Subsystem</span>
        </div>

      </CardContent>
    </Card>
  );
}
