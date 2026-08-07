"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useNotificationCenter } from "@/hooks/use-notification-center";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { unreadCount } = useNotificationCenter();

  return (
    <Link
      href="/notifications"
      prefetch
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative h-9 w-9 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      )}
      aria-label={`Notification Center (${unreadCount} unread)`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
