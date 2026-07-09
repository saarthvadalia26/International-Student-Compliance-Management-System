"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { MobileSidebar } from "@/components/sidebar/mobile-sidebar";
import { Header } from "@/components/header/header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const session = localStorage.getItem("isms_session");
    if (!session) {
      router.replace("/login");
    } else {
      Promise.resolve().then(() => {
        setIsAuthenticated(true);
      });
    }
  }, [router]);

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
  );
}
