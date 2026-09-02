import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Clock, Bell, ShieldAlert, ArrowRight } from "lucide-react";

export default function ReportsPage() {
  const reports = [
    {
      title: "Student Registry Report",
      description: "Search, filter, paginate and export general international student registry lists.",
      href: "/reports/students",
      icon: Users,
      iconClassName: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300"
    },
    {
      title: "eFRRO Expiry & Compliance Report",
      description: "Track visa extension, active document upload statuses, verifications, and expiry intervals.",
      href: "/reports/efrro",
      icon: Clock,
      iconClassName: "text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400"
    },
    {
      title: "Notification Log Report",
      description: "Monitor scheduled automated eFRRO reminder dispatches, channels, and delivery logs.",
      href: "/reports/notifications",
      icon: Bell,
      iconClassName: "text-indigo-600 bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400"
    },
    {
      title: "Security & Export Audit Trail",
      description: "Trace system export actions, administrator activities, and compliance data access.",
      href: "/reports/audit",
      icon: ShieldAlert,
      iconClassName: "text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6">
      <div>
        <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Compliance Reports System</h1>
        <p className="font-caption text-xs text-muted-foreground mt-1">
          Select an operational report below. All data lists support pagination, advanced filtering, and secure auditing.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {reports.map((report, idx) => {
          const Icon = report.icon;
          return (
            <Link key={idx} href={report.href} passHref className="h-full">
              <Card className="h-full flex flex-col border border-border/50 bg-card hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer group">
                <CardHeader className="flex flex-row items-start justify-between pb-2 flex-1">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                      {report.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      {report.description}
                    </CardDescription>
                  </div>
                  <div className={`p-2 rounded-md shrink-0 ${report.iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="flex justify-end pt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground group-hover:translate-x-1 transition-all">
                    Generate Report <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
