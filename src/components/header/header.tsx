"use client";

import * as React from "react";
import { Menu, Bell, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";
import { Branding } from "@/config/branding";

interface HeaderProps {
  onMenuOpen: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 md:px-6">
      {/* Left side: Hamburger, Logo, Title, Breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuOpen}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo and App Title */}
        <div className="flex items-center gap-2">
          <img src={Branding.logoPaths.logo} alt={Branding.shortName} className="h-8 w-8 object-contain" />
          <span className="hidden font-display text-sm font-semibold tracking-tight text-foreground sm:block">
            {Branding.appShortName} Portal
          </span>
        </div>

        {/* Separator */}
        <span className="hidden h-5 w-px bg-border sm:block" />

        {/* Breadcrumb Placeholder */}
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex font-small">
          <span>Workspace</span>
          <span className="text-border">/</span>
          <span className="font-medium text-foreground">Dashboard</span>
        </div>
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications Placeholder */}
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        {/* Account Dropdown Menu */}
        <AccountMenu />
      </div>
    </header>
  );
}
