"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { GraduationCap, LayoutDashboard, User, UploadCloud, History, LogOut, Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { toast } from "sonner";

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserSupabase();

  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [studentName, setStudentName] = React.useState("Student");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) {
            setIsAuthenticated(false);
            router.replace("/student/login");
          }
          return;
        }

        // Verify role is student
        const role = session.user.user_metadata?.role;
        if (role !== "student") {
          toast.error("Access Denied", {
            description: "Admins must access the administrator portal instead.",
          });
          if (mounted) {
            setIsAuthenticated(false);
            router.replace("/login");
          }
          return;
        }

        if (mounted) {
          setIsAuthenticated(true);
          const email = session.user.email || "";
          const username = session.user.user_metadata?.username || email.split("@")[0];
          setStudentName(username.charAt(0).toUpperCase() + username.slice(1));
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        if (mounted) {
          setIsAuthenticated(false);
          router.replace("/student/login");
        }
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (mounted) {
          setIsAuthenticated(false);
          router.replace("/student/login");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

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

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Verifying student session...</span>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/profile", label: "My Profile", icon: User },
    { href: "/student/efrro", label: "eFRRO Renewal", icon: UploadCloud },
    { href: "/student/history", label: "Upload History", icon: History }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      {/* Portal Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight text-foreground text-sm">
              ISMS Student Portal
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={cn(
                    "text-xs font-medium flex items-center gap-1.5 transition-colors px-2 py-1 rounded-md hover:bg-accent/40",
                    isActive ? "text-primary bg-accent/70 font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground">
            Welcome, <span className="text-foreground font-semibold">{studentName}</span>
          </span>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="hidden sm:flex text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-30 bg-background/95 backdrop-blur-md flex flex-col p-4 space-y-3 animate-in slide-in-from-top duration-200">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 text-sm font-medium p-3 rounded-lg",
                  isActive ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          <hr className="border-border my-2" />
          <div className="flex items-center justify-between p-3">
            <span className="text-xs text-muted-foreground">Signed in as {studentName}</span>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleSignOut}
              className="text-xs gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Page Body Wrap */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

// Utility class merger helper
function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}
