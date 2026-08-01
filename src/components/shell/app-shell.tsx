"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { MobileSidebar } from "@/components/sidebar/mobile-sidebar";
import { Header } from "@/components/header/header";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { RealtimeProvider } from "@/providers/realtime-provider";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;

    // Listen for SIGNED_OUT auth events when user manually logs out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (mounted) {
          setIsAuthenticated(false);
          router.replace("/login");
        }
      } else if (session) {
        if (mounted) {
          setIsAuthenticated(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-small">Verifying authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
        {/* Desktop Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          className="hidden md:flex animate-fade-in"
        />

        {/* Mobile Navigation Drawer */}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Header + Content Container */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuOpen={() => setIsMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6 transition-all duration-200">
            {children}
          </main>
        </div>
      </div>
    </RealtimeProvider>
  );
}
