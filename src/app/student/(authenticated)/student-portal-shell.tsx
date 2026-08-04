"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  GraduationCap, 
  LayoutDashboard, 
  User, 
  FileText, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { Branding } from "@/config/branding";
import { cn } from "@/lib/utils";

interface StudentPortalShellProps {
  initialStudentName: string;
  initialEmail: string;
  children: React.ReactNode;
}

export default function StudentPortalShell({
  initialStudentName,
  initialEmail,
  children
}: StudentPortalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserSupabase();

  const [studentName] = React.useState(
    initialStudentName.charAt(0).toUpperCase() + initialStudentName.slice(1)
  );
  const [studentEmail] = React.useState(initialEmail);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully.");
      router.push("/student/login");
    } catch (err) {
      console.error("Sign out failed:", err);
      toast.error("Failed to sign out.");
    }
  };

  const navLinks = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/profile", label: "My Profile", icon: User },
    { href: "/student/efrro", label: "Document Centre", icon: FileText },
    { href: "/student/history", label: "Activity History", icon: History },
    { href: "/student/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans flex flex-col">
      {/* Portal Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 md:px-6 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-foreground text-sm flex items-center gap-1.5">
                {Branding.appShortName} Student Portal
                <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-mono font-medium">NFSU</span>
              </span>
              <span className="text-[10px] text-muted-foreground">National Forensic Sciences University</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/student/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive 
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Action Controls */}
        <div className="flex items-center gap-3">
          {/* Notification Popover Button */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground rounded-full"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </Button>

            {/* Notification Dropdown Panel */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl z-50 text-xs animate-in fade-in-50 slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2.5">
                  <span className="font-semibold text-foreground text-xs">Notifications</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-medium">All Compliant</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-accent/40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-[11px]">System Account Active</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Welcome to NFSU International Student Compliance Portal.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-accent/20">
                    <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-[11px]">Document Inspection</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Ensure your Passport & Visa copies are up to date.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-foreground leading-tight">{studentName}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{studentEmail || "International Student"}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>

          {/* Mobile Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-muted-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 space-y-1.5 shadow-lg animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>

      {/* Student Portal Footer */}
      <footer className="border-t border-border/60 bg-background/80 py-4 px-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} National Forensic Sciences University (NFSU). International Student Compliance Management System.</p>
      </footer>
    </div>
  );
}
