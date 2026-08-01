"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  Users,
  FileText,
  Clock,
  ShieldAlert,
  Database,
  ExternalLink,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotificationCenter } from "@/hooks/use-notification-center";
import { InAppNotification } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

export function NotificationCenterDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    category,
    priority,
    unreadOnly,
    searchQuery,
    setCategory,
    setPriority,
    setUnreadOnly,
    setSearchQuery,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    loadMore,
  } = useNotificationCenter();

  // Close dropdown on outside click or ESC key
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const categories = [
    { id: "all", label: "All" },
    { id: "document", label: "Documents" },
    { id: "student", label: "Students" },
    { id: "reminder", label: "Reminders" },
    { id: "security", label: "Security" },
    { id: "system", label: "System" },
  ];

  const [nowMs, setNowMs] = React.useState<number>(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, [notifications]);

  const formatRelativeTime = (timestamp: string, currentNow = nowMs) => {
    if (!currentNow) return "Recently";
    try {
      const date = new Date(timestamp);
      const diffMs = currentNow - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  const getCategoryIcon = (cat: InAppNotification["category"]) => {
    switch (cat) {
      case "student":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-indigo-500" />;
      case "security":
      case "audit":
        return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      case "system":
      default:
        return <Database className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getPriorityBadge = (p: InAppNotification["priority"]) => {
    switch (p) {
      case "critical":
        return (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold">
            Critical
          </Badge>
        );
      case "high":
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 dark:text-blue-400 border-blue-500/20 font-normal">
            Medium
          </Badge>
        );
      case "low":
      default:
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border font-normal">
            Low
          </Badge>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button with Animated Unread Badge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground focus:outline-none"
        aria-label={`Notification Center (${unreadCount} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-bold">
                  {unreadCount} unread
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Read All
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search & Filters Section */}
          <div className="p-3 border-b border-border/50 space-y-2.5 bg-muted/20">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors border",
                    category === cat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Secondary Controls (Unread toggle + Priority filter) */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="text-[11px]">Unread only</span>
              </label>

              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-6 text-[11px] bg-background border border-border rounded px-1 text-muted-foreground focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications List Container */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p>Loading real-time notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60" />
                <p className="font-semibold text-foreground">You&apos;re all caught up!</p>
                <p className="text-[11px] text-muted-foreground">No new notifications match your active filters.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 flex items-start gap-3 transition-colors relative group",
                    !item.isRead ? "bg-primary/5 dark:bg-primary/10 font-medium" : "hover:bg-muted/30"
                  )}
                >
                  {/* Category Icon */}
                  <div className="mt-0.5 p-2 rounded-lg bg-background border border-border/60 shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">{item.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(item.priority)}
                        {item.actionUrl && (
                          <Link
                            href={item.actionUrl}
                            onClick={() => setIsOpen(false)}
                            className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>

                      {/* Item Quick Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {!item.isRead && (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="text-[10px] text-muted-foreground hover:text-foreground p-1"
                            title="Mark as read"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(item.id)}
                          className="text-[10px] text-muted-foreground hover:text-destructive p-1"
                          title="Delete alert"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Load More Button for Pagination */}
            {hasMore && (
              <div className="p-2 text-center bg-muted/10 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="w-full text-xs h-7 text-muted-foreground hover:text-foreground"
                >
                  {isLoading ? "Loading older notifications..." : "Load Older Notifications"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
