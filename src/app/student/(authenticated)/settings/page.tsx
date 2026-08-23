import * as React from "react";
import { Bell, ShieldCheck, Phone, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function StudentSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Account & Security Information</h1>
        <p className="text-xs text-muted-foreground mt-0.5">View your student portal authentication method and institutional communication policy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp OTP Authentication Info Card */}
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Phone className="h-4 w-4" />
              WhatsApp OTP Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-foreground space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Passwordless Verification Active</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your Student Portal is secured using single-use WhatsApp One-Time Password (OTP) verification issued by the International Student Office.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                To update your registered WhatsApp mobile number, please visit the International Student Office with your valid Student ID for identity verification.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Read-Only Institutional Notification Policy Card */}
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Compliance Communication Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-foreground space-y-2">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Managed by International Student Office</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Compliance notifications are mandatory institutional communications governed by National Forensic Sciences University (NFSU).
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Automated email and WhatsApp alerts are dispatched for upcoming Passport, Visa, and eFRRO expiry deadlines to ensure continuous academic compliance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
