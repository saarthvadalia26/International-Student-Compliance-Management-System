"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";
import { RealtimeIndicator } from "./realtime-indicator";
import { NotificationBell } from "./notification-bell";
import { HeaderBreadcrumb } from "./breadcrumb";
import { Branding } from "@/config/branding";

interface HeaderProps {
  onMenuOpen: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 md:px-6">
      {/* Left side: Hamburger, Logo, Title, Dynamic Breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuOpen}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo and App Title */}
        <div className="flex items-center gap-2 shrink-0">
          <img src={Branding.logoPaths.logo} alt={Branding.shortName} className="h-8 w-8 object-contain" />
          <span className="hidden font-display text-sm font-semibold tracking-tight text-foreground sm:block">
            {Branding.appShortName} Portal
          </span>
        </div>

        {/* Separator */}
        <span className="hidden h-5 w-px bg-border sm:block shrink-0" />

        {/* Dynamic Route-Aware Breadcrumb */}
        <HeaderBreadcrumb />
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-2">
        <RealtimeIndicator />

        <ThemeToggle />

        {/* Real-time Notification Bell trigger */}
        <NotificationBell />

        {/* Account Dropdown Menu */}
        <AccountMenu />
      </div>
    </header>
  );
}
