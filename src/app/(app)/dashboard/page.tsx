"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Bell, 
  ArrowUpRight, 
  Plus, 
  Clock, 
  CheckCircle,
  FileText
} from "lucide-react";
import { mockStudents, mockNotifications, MockStudent } from "@/lib/mock-data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  
  // Calculate compliance statistics
  const totalStudents = mockStudents.length;
  const compliantCount = mockStudents.filter(s => s.complianceStatus === "compliant").length;
  const warningCount = mockStudents.filter(s => s.complianceStatus === "warning").length;
  const criticalCount = mockStudents.filter(s => s.complianceStatus === "non_compliant" || s.complianceStatus === "expired").length;

  // Filter students with warnings or critical states for the alert tracker list
  const criticalStudents = mockStudents.filter(s => 
    s.complianceStatus === "non_compliant" || 
    s.complianceStatus === "expired" || 
    s.complianceStatus === "warning"
  );

  const getComplianceBadge = (status: MockStudent["complianceStatus"]) => {
    switch (status) {
      case "compliant":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Compliant</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Warning</Badge>;
      case "non_compliant":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">Non-Compliant</Badge>;
      case "expired":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Welcome */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-h1 tracking-tight text-foreground text-2xl">Compliance Dashboard</h1>
          <p className="font-caption text-muted-foreground">
            Monitor immigration document status, student enrollment compliance, and pending notifications.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/students/add" passHref>
            <Button size="sm" className="h-9">
              <Plus className="mr-2 h-4 w-4" /> Register Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Active Students</CardTitle>
            <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{totalStudents}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">International student profiles</p>
          </CardContent>
        </Card>

        {/* Compliant */}
        <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compliant (Healthy)</CardTitle>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">{compliantCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {Math.round((compliantCount / totalStudents) * 100)}% of total students compliant
            </p>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warning State</CardTitle>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-amber-500 dark:text-amber-400">{warningCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Documents expiring &lt; 30 days or pending</p>
          </CardContent>
        </Card>

        {/* Non-Compliant / Expired */}
        <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Critical Expiries / Alerts</CardTitle>
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-rose-500 dark:text-rose-400">{criticalCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Expired passports/visas or rejected uploads</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Expiry Watchlist & Notification Logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Expiry and Compliance Watchlist */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
            <div>
              <CardTitle className="text-sm font-h2 font-semibold">Compliance Watchlist</CardTitle>
              <CardDescription className="text-xs font-caption">
                Immediate attention needed. Students with critical or warning statuses.
              </CardDescription>
            </div>
            <Link href="/students" passHref>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {criticalStudents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-caption">
                  All student immigration documents are currently valid and compliant.
                </div>
              ) : (
                criticalStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/students/${student.id}`} className="text-sm font-medium hover:underline text-foreground">
                          {student.fullName}
                        </Link>
                        <span className="text-xs text-muted-foreground">({student.registrationNumber})</span>
                      </div>
                      
                      {/* Subtitle details showing exact document issue */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-caption">
                        <span>Nationality: {student.nationalityName}</span>
                        <span>•</span>
                        {student.complianceStatus === "non_compliant" || student.complianceStatus === "expired" ? (
                          <span className="text-rose-500 font-medium">
                            {student.daysToPassportExpiry !== undefined && student.daysToPassportExpiry < 0 
                              ? `Passport expired ${Math.abs(student.daysToPassportExpiry)} days ago`
                              : student.daysToVisaExpiry !== undefined && student.daysToVisaExpiry < 0
                              ? `Visa expired ${Math.abs(student.daysToVisaExpiry)} days ago`
                              : "Document issue detected"}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium">
                            {student.visa.verificationStatus === "pending"
                              ? "Visa pending verification"
                              : student.daysToVisaExpiry !== undefined && student.daysToVisaExpiry <= 30
                              ? `Visa expires in ${student.daysToVisaExpiry} days`
                              : `eFRRO expires in ${student.daysToEfrroExpiry} days`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getComplianceBadge(student.complianceStatus)}
                      <Link href={`/students/${student.id}`} passHref>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
                          Inspect
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Communication Queue Logs */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
            <div>
              <CardTitle className="text-sm font-h2 font-semibold">Notification Log</CardTitle>
              <CardDescription className="text-xs font-caption">
                Status of auto-generated compliance alerts.
              </CardDescription>
            </div>
            <Link href="/reminders" passHref>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                History
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3.5">
              {mockNotifications.slice(0, 4).map((notif) => {
                const student = mockStudents.find(s => s.email === notif.recipientAddress.split(" / ")[0]);
                return (
                  <div key={notif.id} className="flex gap-3 text-xs">
                    <div className="mt-0.5">
                      {notif.status === "queued" ? (
                        <Clock className="h-4 w-4 text-amber-500" />
                      ) : notif.status === "sent" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-foreground">
                        {notif.documentType.toUpperCase()} {notif.alertThresholdDays}-Day Alert
                      </p>
                      <p className="text-[11px] text-muted-foreground font-caption leading-tight">
                        Recipient: {student ? student.fullName : notif.recipientAddress}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-caption">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">
                          {notif.channel}
                        </Badge>
                        <span>•</span>
                        <span>
                          {notif.status === "queued" 
                            ? "Queued in delivery buffer" 
                            : `Sent: ${new Date(notif.sentAt || "").toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation and Help Card */}
      <Card className="bg-slate-900 text-slate-100 border border-slate-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:border-zinc-800 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-400" /> Compliance Auto-Reminders Operational
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-400 max-w-2xl font-caption">
                The compliance engine scans database snapshots on a daily cycle. Warnings are triggered at 90, 60, 30, and 15 days prior to document expiries. Queue retry buffers utilize the institutional holiday calendar.
              </p>
            </div>
            <div className="flex gap-2.5 shrink-0">
              <Link href="/students" passHref>
                <Button variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 h-9 text-xs">
                  <FileText className="mr-2 h-4 w-4" /> Student Register
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
