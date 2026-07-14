"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Bell, 
  FileText,
  UserPlus,
  Search,
  LayoutGrid
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardMetrics } from "@/domain/reports/types";

interface MetricsProps {
  metrics: DashboardMetrics;
}

export function DashboardMetricsGrid({ metrics }: MetricsProps) {
  const cards = [
    {
      title: "Total Students",
      value: metrics.totalStudents,
      description: "Active international profiles",
      icon: Users,
      iconClassName: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300",
    },
    {
      title: "Fully Compliant",
      value: metrics.fullyCompliantStudents,
      description: "Passport, Visa & eFRRO valid",
      icon: ShieldCheck,
      iconClassName: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    {
      title: "eFRRO Alert (30 Days)",
      value: metrics.efrroExpiring30Days,
      description: "eFRRO pre-expiry warning status",
      icon: Clock,
      iconClassName: "text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400",
    },
    {
      title: "eFRRO Critical (15 Days)",
      value: metrics.efrroExpiring15Days,
      description: "Critical alert reminders active",
      icon: AlertTriangle,
      iconClassName: "text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400",
    },
    {
      title: "eFRRO Expired",
      value: metrics.efrroExpired,
      description: "Immediate action required",
      icon: XCircle,
      iconClassName: "text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400",
    },
    {
      title: "Pending eFRRO Verification",
      value: metrics.pendingEfrroVerification,
      description: "Submissions awaiting approval",
      icon: CheckCircle,
      iconClassName: "text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400",
    },
    {
      title: "Notifications Sent Today",
      value: metrics.notificationsSentToday,
      description: "Email & WhatsApp alerts today",
      icon: Bell,
      iconClassName: "text-indigo-600 bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400",
    },
    {
      title: "Failed Notifications",
      value: metrics.failedNotificationsToday,
      description: "Alert dispatch failures",
      icon: AlertTriangle,
      iconClassName: "text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400",
    },
    {
      title: "Pending Upload Reviews",
      value: metrics.pendingUploadReviews,
      description: "Awaiting compliance audits",
      icon: FileText,
      iconClassName: "text-violet-600 bg-violet-100 dark:bg-violet-950/40 dark:text-violet-400",
    }
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className="border border-border/50 bg-card hover:shadow-md transition-all shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 rounded-md ${card.iconClassName}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-foreground">{card.value}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function DashboardQuickActions() {
  const actions = [
    {
      title: "Register Student",
      href: "/students/add",
      icon: UserPlus,
      variant: "default" as const
    },
    {
      title: "Search Student",
      href: "/reports/students",
      icon: Search,
      variant: "secondary" as const
    },
    {
      title: "View Expiring eFRRO",
      href: "/reports/efrro?efrroStatus=warning",
      icon: Clock,
      variant: "secondary" as const
    },
    {
      title: "Review Pending Uploads",
      href: "/reports/efrro?efrroStatus=pending",
      icon: FileText,
      variant: "secondary" as const
    },
    {
      title: "Notification Center",
      href: "/reports/notifications",
      icon: Bell,
      variant: "secondary" as const
    },
    {
      title: "Reports Directory",
      href: "/reports",
      icon: LayoutGrid,
      variant: "secondary" as const
    }
  ];

  return (
    <Card className="border border-border/50 bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4">Quick Compliance Operations</h3>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <Link key={i} href={act.href} passHref className="w-full">
              <Button 
                variant={act.variant} 
                className="w-full h-20 flex flex-col gap-2 justify-center items-center rounded-lg border border-border/30 hover:scale-[1.02] transition-transform text-xs"
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{act.title}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
