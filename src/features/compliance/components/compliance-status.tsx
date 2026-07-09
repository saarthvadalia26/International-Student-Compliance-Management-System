import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Ban, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComplianceStatus } from "../constants/constants";

interface BadgeProps {
  status: ComplianceStatus;
}

export function ComplianceStatusBadge({ status }: BadgeProps): React.JSX.Element {
  switch (status) {
    case "COMPLIANT":
      return (
        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit">
          <CheckCircle2 className="h-3.5 w-3.5" /> Compliant
        </Badge>
      );
    case "WARNING":
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit">
          <AlertTriangle className="h-3.5 w-3.5" /> Warning State
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit">
          <XCircle className="h-3.5 w-3.5" /> Expired
        </Badge>
      );
    case "PENDING_VERIFICATION":
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit">
          <Clock className="h-3.5 w-3.5 animate-pulse" /> Pending
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit">
          <Ban className="h-3.5 w-3.5" /> Rejected
        </Badge>
      );
    case "MISSING":
    default:
      return (
        <Badge variant="outline" className="border-border/60 text-muted-foreground px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit">
          <HelpCircle className="h-3.5 w-3.5" /> Missing
        </Badge>
      );
  }
}

export function ExpiryStatusBadge({ daysLeft }: { daysLeft: number | null }): React.JSX.Element {
  if (daysLeft === null) {
    return <span className="text-muted-foreground text-xs font-normal">-</span>;
  }
  if (daysLeft <= 0) {
    return <span className="text-rose-600 font-semibold text-xs">Expired ({Math.abs(daysLeft)} days ago)</span>;
  }
  if (daysLeft < 60) {
    return <span className="text-amber-600 font-semibold text-xs">Expires in {daysLeft} days</span>;
  }
  return <span className="text-emerald-600 font-medium text-xs">{daysLeft} days remaining</span>;
}
