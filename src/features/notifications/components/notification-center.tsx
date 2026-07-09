"use client";

import * as React from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Gauge, 
  ListFilter, 
  Eye 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { STATUS_CONFIGS, DeliveryStatus } from "../constants/constants";

export interface MockNotificationItem {
  id: string;
  recipient: string;
  documentType: "passport" | "visa" | "efrro";
  channel: string;
  status: DeliveryStatus;
  retryCount: number;
  triggerSource: string;
  scheduledFor: string;
  gatewayResponse: Record<string, unknown> | null;
}

export function NotificationHealthMetrics(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
      <Card className="border border-border/60 bg-card/65 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-muted-foreground block font-caption">Success Rate</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">97.8%</span>
          </div>
          <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/65 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-muted-foreground block font-caption">Gateway Latency</span>
            <span className="text-xl font-bold text-foreground">210 ms</span>
          </div>
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            <Gauge className="h-4.5 w-4.5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/65 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-muted-foreground block font-caption">Failed Queue Retries</span>
            <span className="text-xl font-bold text-rose-500">2 Alerts</span>
          </div>
          <div className="p-2 rounded-md bg-rose-500/10 text-rose-500">
            <AlertCircle className="h-4.5 w-4.5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/65 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-muted-foreground block font-caption">Channels Status</span>
            <span className="text-xl font-bold text-foreground">Operational</span>
          </div>
          <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-500">
            <Activity className="h-4.5 w-4.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface NotificationTableProps {
  items: MockNotificationItem[];
}

export function NotificationQueueTable({ items }: NotificationTableProps): React.JSX.Element {
  const [selectedItem, setSelectedItem] = React.useState<MockNotificationItem | null>(null);

  const getStatusBadge = (status: DeliveryStatus) => {
    const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.queued;
    const Icon = config.icon;
    return (
      <Badge variant="secondary" className={`${config.bgClass} ${config.colorClass} ${config.borderClass} font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit`}>
        <Icon className="h-3 w-3" /> {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Communication Logs Queue</h2>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <ListFilter className="mr-1.5 h-3.5 w-3.5" /> Filter Logs
        </Button>
      </div>

      <div className="border border-border/40 rounded-lg overflow-hidden">
        <Table className="text-xs">
          <TableHeader className="bg-muted/15 border-b border-border/40">
            <TableRow>
              <TableHead className="font-semibold">Recipient Address</TableHead>
              <TableHead className="font-semibold">Document Type</TableHead>
              <TableHead className="font-semibold">Channel</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Trigger Source</TableHead>
              <TableHead className="font-semibold">Retries</TableHead>
              <TableHead className="font-semibold">Scheduled For</TableHead>
              <TableHead className="w-12 text-right font-semibold">Inspect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground font-caption">
                  No active notification logs registered.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{item.recipient}</TableCell>
                  <TableCell className="uppercase">{item.documentType}</TableCell>
                  <TableCell className="capitalize">{item.channel}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-muted-foreground">{item.triggerSource}</TableCell>
                  <TableCell className="text-muted-foreground">{item.retryCount} attempts</TableCell>
                  <TableCell className="text-muted-foreground">{item.scheduledFor}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedItem(item)} title="Inspect Gateway Response">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Inspect Log details Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="sm:max-w-md w-full text-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Gateway telemetry audit details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground block font-caption">Notification ID</span>
                  <span className="font-mono block truncate font-medium">{selectedItem.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-caption">Trigger Origin</span>
                  <span className="font-medium block capitalize">{selectedItem.triggerSource}</span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block font-caption">Gateway Response payload</span>
                <pre className="mt-1.5 p-3 rounded bg-muted/60 text-muted-foreground font-mono text-[10px] whitespace-pre-wrap max-h-48 overflow-y-auto border border-border/30">
                  {JSON.stringify(selectedItem.gatewayResponse || { status: "200", message: "Mock transaction success details." }, null, 2)}
                </pre>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => setSelectedItem(null)}>Close details</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
