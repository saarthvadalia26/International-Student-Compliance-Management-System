"use client";

import * as React from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  Gauge, 
  ListFilter, 
  Eye, 
  RefreshCw, 
  Clock, 
  Mail, 
  MessageSquare 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { STATUS_CONFIGS, DeliveryStatus } from "../constants/constants";
import { fetchCommunicationLogs, CommunicationLogItem, ReminderSummaryMetrics } from "@/app/(app)/reminders/actions";
import { getDocumentBadgeClass } from "@/features/compliance/constants/constants";
import { formatDate, formatDateTime } from "@/lib/utils/date";

export interface NotificationHealthMetricsProps {
  summary: ReminderSummaryMetrics | null;
  loading: boolean;
}

export function NotificationHealthMetrics({ summary, loading }: NotificationHealthMetricsProps): React.JSX.Element {
  if (loading || !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        {[1, 2, 3, 4].map(n => (
          <Card key={n} className="border border-border/60 bg-card/65 animate-pulse-subtle h-24">
            <CardContent className="p-4" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top 4 System Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <Card className="border border-border/60 bg-card/65 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground block font-caption">Delivery Success Rate</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.system.successRate}%
              </span>
            </div>
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/65 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground block font-caption">Active Reminder Rules</span>
              <span className="text-xl font-bold text-foreground">
                {summary.system.activeRulesCount} Rules
              </span>
            </div>
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Gauge className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/65 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground block font-caption">Queued for Dispatch</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {summary.system.queuedCount} Alerts
              </span>
            </div>
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/65 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground block font-caption">Failed Queue Dispatches</span>
              <span className={`text-xl font-bold ${summary.system.failedCount > 0 ? "text-rose-500" : "text-foreground"}`}>
                {summary.system.failedCount} Alerts
              </span>
            </div>
            <div className={`p-2 rounded-md ${summary.system.failedCount > 0 ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground"}`}>
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Type Expiry Breakdown Summary */}
      <div className="grid gap-4 sm:grid-cols-3 text-xs">
        {/* Passport Card */}
        <Card className="border border-blue-500/30 bg-blue-500/5 shadow-sm">
          <CardHeader className="pb-2 border-b border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border-blue-500/30">
                  PASSPORT
                </Badge>
                <CardTitle className="text-xs font-semibold">Passport Compliance</CardTitle>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{summary.passport.total} Total</span>
            </div>
          </CardHeader>
          <CardContent className="p-3 grid grid-cols-2 gap-2 text-center">
            <div className="bg-background/80 p-2 rounded-md border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-caption">Upcoming (≤90d)</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{summary.passport.upcoming}</span>
            </div>
            <div className="bg-background/80 p-2 rounded-md border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-caption">Overdue / Expired</span>
              <span className={`text-sm font-bold ${summary.passport.overdue > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {summary.passport.overdue}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Visa Card */}
        <Card className="border border-purple-500/30 bg-purple-500/5 shadow-sm">
          <CardHeader className="pb-2 border-b border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border-purple-500/30">
                  VISA
                </Badge>
                <CardTitle className="text-xs font-semibold">Student Visa Compliance</CardTitle>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{summary.visa.total} Total</span>
            </div>
          </CardHeader>
          <CardContent className="p-3 grid grid-cols-2 gap-2 text-center">
            <div className="bg-background/80 p-2 rounded-md border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-caption">Upcoming (≤90d)</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{summary.visa.upcoming}</span>
            </div>
            <div className="bg-background/80 p-2 rounded-md border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-caption">Overdue / Expired</span>
              <span className={`text-sm font-bold ${summary.visa.overdue > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {summary.visa.overdue}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* eFRRO Card */}
        <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardHeader className="pb-2 border-b border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500/30">
                  eFRRO
                </Badge>
                <CardTitle className="text-xs font-semibold">eFRRO / Residential Permit</CardTitle>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{summary.efrro.total} Total</span>
            </div>
          </CardHeader>
          <CardContent className="p-3 grid grid-cols-2 gap-2 text-center">
            <div className="bg-background/80 p-2 rounded-md border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-caption">Upcoming (≤90d)</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{summary.efrro.upcoming}</span>
            </div>
            <div className="bg-background/80 p-2 rounded-md border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-caption">Overdue / Expired</span>
              <span className={`text-sm font-bold ${summary.efrro.overdue > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {summary.efrro.overdue}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function NotificationQueueTable(): React.JSX.Element {
  const [logs, setLogs] = React.useState<CommunicationLogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedItem, setSelectedItem] = React.useState<CommunicationLogItem | null>(null);
  
  const [docFilter, setDocFilter] = React.useState<string>("all");
  const [channelFilter, setChannelFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const loadLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCommunicationLogs({
        documentType: docFilter !== "all" ? docFilter : undefined,
        channel: channelFilter !== "all" ? channelFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 50
      });
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [docFilter, channelFilter, statusFilter]);

  React.useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIGS[status as DeliveryStatus] || STATUS_CONFIGS.queued;
    const Icon = config.icon;
    return (
      <Badge variant="secondary" className={`${config.bgClass} ${config.colorClass} ${config.borderClass} font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit text-[10px]`}>
        <Icon className="h-3 w-3" /> {config.label}
      </Badge>
    );
  };

  const getDocBadgeColor = (type: string) => {
    return getDocumentBadgeClass(type);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/65 p-3 rounded-lg border border-border/60 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <ListFilter className="h-3.5 w-3.5" /> Filter:
          </span>

          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Documents</option>
            <option value="passport">Passport</option>
            <option value="visa">Visa</option>
            <option value="efrro">eFRRO</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email (Historical)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={loadLogs} className="h-8 text-xs gap-1.5 self-stretch sm:self-auto justify-center">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Logs
        </Button>
      </div>

      <div className="border border-border/40 rounded-lg overflow-hidden bg-card/65 shadow-sm">
        <Table className="text-xs">
          <TableHeader className="bg-muted/15 border-b border-border/40">
            <TableRow>
              <TableHead className="font-semibold">Student / Recipient</TableHead>
              <TableHead className="font-semibold">Document Scope</TableHead>
              <TableHead className="font-semibold">Channel</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Trigger Schedule</TableHead>
              <TableHead className="font-semibold">Dispatched At</TableHead>
              <TableHead className="w-12 text-right font-semibold">Inspect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground font-caption animate-pulse-subtle">
                  Loading communication logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground font-caption animate-fade-in">
                  No communication queue logs found matching filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((item) => {
                const ctx = item.notificationContext || {};
                const studentName = (ctx.student_name as string) || item.recipient;
                const daysLeft = ctx.days_left || ctx.days_remaining;

                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold text-foreground">{studentName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                        {item.recipient}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${getDocBadgeColor(item.documentType)}`}>
                        {item.documentType}
                      </Badge>
                      {daysLeft !== undefined && (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {Number(daysLeft) >= 0 ? `${daysLeft}d pre-expiry` : `${Math.abs(Number(daysLeft))}d post-expiry`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 capitalize font-medium">
                        {item.channel === "email" ? (
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        {item.channel}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground font-caption">
                      {formatDate(item.scheduledFor)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-caption">
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedItem(item)} title="Inspect Delivery Payload">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Inspect Dialog */}
      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Notification Payload Inspector</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/30">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-caption">Recipient Address</span>
                  <span className="font-semibold text-foreground font-mono">{selectedItem.recipient}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-caption">Document Type</span>
                  <span className="font-semibold text-foreground uppercase">{selectedItem.documentType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-caption">Delivery Channel</span>
                  <span className="font-semibold text-foreground capitalize">{selectedItem.channel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-caption">Dispatch Status</span>
                  <span className="font-semibold text-foreground capitalize">{selectedItem.status}</span>
                </div>
              </div>

              {selectedItem.errorMessage && (
                <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <span className="font-bold block text-[10px] uppercase">Error Details:</span>
                  <p className="font-mono text-xs mt-0.5">{selectedItem.errorMessage}</p>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground text-[11px] block">Interpolated Context Variables:</span>
                <pre className="p-2.5 rounded-md bg-muted/30 border border-border/40 font-mono text-[11px] overflow-x-auto max-h-40">
                  {JSON.stringify(selectedItem.notificationContext, null, 2)}
                </pre>
              </div>

              {selectedItem.gatewayResponse && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] block">Gateway Adapter Response:</span>
                  <pre className="p-2.5 rounded-md bg-muted/30 border border-border/40 font-mono text-[11px] overflow-x-auto max-h-32">
                    {JSON.stringify(selectedItem.gatewayResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
