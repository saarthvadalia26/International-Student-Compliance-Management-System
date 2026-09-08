"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  FileCheck, 
  Bell, 
  AlertCircle,
  UserPlus,
  Search,
  LayoutGrid,
  ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardMetrics, ComplianceDrilldownCategory } from "@/domain/reports/types";
import { ComplianceDrilldownDialog } from "@/features/dashboard/components/compliance-drilldown-dialog";
import { useUserRole } from "@/hooks/use-user-role";

interface MetricsProps {
  metrics: DashboardMetrics;
}

export function DashboardMetricsGrid({ metrics }: MetricsProps) {
  const [activeDrilldown, setActiveDrilldown] = React.useState<ComplianceDrilldownCategory | null>(null);

  const cards = [
    {
      title: "Total Students",
      value: metrics.totalStudents,
      description: "Active international profiles",
      icon: Users,
      iconClassName: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300",
      href: "/students",
      drilldownCategory: null as ComplianceDrilldownCategory | null
    },
    {
      title: "Fully Compliant",
      value: metrics.fullyCompliantStudents,
      description: "Passport, Visa & eFRRO valid",
      icon: ShieldCheck,
      iconClassName: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400",
      href: "/students?compliance=COMPLIANT",
      drilldownCategory: null as ComplianceDrilldownCategory | null
    },
    {
      title: "Expiring in 30 Days",
      value: metrics.expiringIn30Days,
      description: metrics.documentCounts?.expiringIn30DaysDocs !== undefined
        ? `${metrics.documentCounts.expiringIn30DaysDocs} documents across ${metrics.expiringIn30Days} students`
        : "Passport, Visa & eFRRO near expiry",
      icon: Clock,
      iconClassName: "text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400",
      href: null,
      drilldownCategory: "expiring_30" as ComplianceDrilldownCategory
    },
    {
      title: "Critical — 15 Days",
      value: metrics.criticalIn15Days,
      description: metrics.documentCounts?.criticalIn15DaysDocs !== undefined
        ? `${metrics.documentCounts.criticalIn15DaysDocs} urgent permits within 15d`
        : "Immediate renewal required",
      icon: AlertTriangle,
      iconClassName: "text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400",
      href: null,
      drilldownCategory: "critical_15" as ComplianceDrilldownCategory
    },
    {
      title: "Expired Documents",
      value: metrics.expiredDocuments,
      description: metrics.documentCounts?.expiredDocs !== undefined
        ? `${metrics.documentCounts.expiredDocs} expired documents active`
        : "Permit validity elapsed",
      icon: XCircle,
      iconClassName: "text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400",
      href: null,
      drilldownCategory: "expired" as ComplianceDrilldownCategory
    },
    {
      title: "Renewals Recorded",
      value: metrics.renewalsRecorded,
      description: "Last 30 days renewals recorded",
      icon: FileCheck,
      iconClassName: "text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400",
      href: null,
      drilldownCategory: "renewals" as ComplianceDrilldownCategory
    },
    {
      title: "Notifications Sent Today",
      value: metrics.notificationsSentToday,
      description: metrics.notificationsByChannel
        ? `${metrics.notificationsByChannel.whatsapp} WhatsApp · ${metrics.notificationsByChannel.email} Email`
        : "Email & WhatsApp alerts today",
      icon: Bell,
      iconClassName: "text-indigo-600 bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400",
      href: "/reports/notifications",
      drilldownCategory: null as ComplianceDrilldownCategory | null
    },
    {
      title: "Failed Notifications",
      value: metrics.failedNotifications ?? metrics.failedNotificationsToday ?? 0,
      description: "Alert dispatch failures",
      icon: AlertCircle,
      iconClassName: "text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400",
      href: null,
      drilldownCategory: "failed_notifications" as ComplianceDrilldownCategory
    }
  ];

  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const cardContent = (
            <Card
              className="border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all shadow-sm cursor-pointer group relative overflow-hidden"
              onClick={() => {
                if (card.drilldownCategory) {
                  setActiveDrilldown(card.drilldownCategory);
                }
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                  {card.title}
                </CardTitle>
                <div className={`p-1.5 rounded-md transition-transform group-hover:scale-105 ${card.iconClassName}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-display tracking-tight text-foreground">
                    {card.value}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{card.description}</p>
              </CardContent>
            </Card>
          );

          if (card.href) {
            return (
              <Link key={i} href={card.href} className="block outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
                {cardContent}
              </Link>
            );
          }

          return <div key={i}>{cardContent}</div>;
        })}
      </div>

      {/* Interactive Compliance Drill-Down Dialog */}
      <ComplianceDrilldownDialog
        isOpen={Boolean(activeDrilldown)}
        onClose={() => setActiveDrilldown(null)}
        category={activeDrilldown}
      />
    </>
  );
}

export function DashboardQuickActions() {
  const { isAdministrator } = useUserRole();

  const allActions = [
    {
      title: "Register Student",
      href: "/students/add",
      icon: UserPlus,
      variant: "default" as const,
      adminOnly: false
    },
    {
      title: "Student Directory",
      href: "/students",
      icon: Search,
      variant: "secondary" as const,
      adminOnly: false
    },
    {
      title: "Expiring Permits",
      href: "/students?compliance=WARNING",
      icon: Clock,
      variant: "secondary" as const,
      adminOnly: false
    },
    {
      title: "Notification Center",
      href: "/reports/notifications",
      icon: Bell,
      variant: "secondary" as const,
      adminOnly: true
    },
    {
      title: "Compliance Reports",
      href: "/reports",
      icon: LayoutGrid,
      variant: "secondary" as const,
      adminOnly: true
    }
  ];

  const actions = allActions.filter(act => !act.adminOnly || isAdministrator);

  return (
    <Card className="border border-border/50 bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4">Quick Compliance Operations</h3>
      <div className={`grid gap-3 grid-cols-2 sm:grid-cols-3 ${actions.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
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
