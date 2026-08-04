import * as React from "react";
import { Branding } from "@/config/branding";

interface PublicStudentLayoutProps {
  children: React.ReactNode;
}

export default function PublicStudentLayout({ children }: PublicStudentLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans flex flex-col justify-between">
      {/* Public Header - NFSU Branding Only */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={Branding.logoPaths.logo} alt={Branding.shortName} className="h-9 w-9 object-contain" />
          <div className="flex flex-col">
            <span className="font-bold text-foreground text-sm tracking-tight">{Branding.appName}</span>
            <span className="text-[10px] text-muted-foreground">{Branding.universityName}</span>
          </div>
        </div>
        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
          Student Self-Service
        </span>
      </header>

      {/* Main Content Area - Centered Form */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Legal Footer Only */}
      <footer className="border-t border-border/60 bg-background/60 py-4 px-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} National Forensic Sciences University (NFSU). All rights reserved.</p>
      </footer>
    </div>
  );
}
