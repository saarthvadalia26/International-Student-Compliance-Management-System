"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
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
  RotateCcw,
  Settings,
  UserCheck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNotificationCenter } from "@/hooks/use-notification-center";
import { InAppNotification } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

interface NotificationCenterWorkspaceProps {
  portal: "staff" | "student";
  title: string;
  subtitle: string;
  preferencesHref: string;
}

export function NotificationCenterWorkspace({
  portal,
  title,
  subtitle,
  preferencesHref,
}: NotificationCenterWorkspaceProps) {
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
  } = useNotificationCenter(portal);

  const [hasError, setHasError] = React.useState<boolean>(false);
  const [nowMs, setNowMs] = React.useState<number>(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, [notifications]);

  const categories =
    portal === "student"
      ? [
          { id: "all", label: "All Notifications" },
          { id: "document", label: "Documents" },
          { id: "reminder", label: "Compliance & Reminders" },
          { id: "account", label: "Account Notifications" },
        ]
      : [
          { id: "all", label: "All Notifications" },
          { id: "document", label: "Documents" },
          { id: "reminder", label: "Compliance & Reminders" },
          { id: "student", label: "Students" },
          { id: "security", label: "Security & Audit" },
          { id: "system", label: "System Alerts" },
        ];

  const formatRelativeTime = (timestamp: string, currentNow = nowMs) => {
    if (!currentNow) return "Recently";
    try {
      const date = new Date(timestamp);
      const diffMs = currentNow - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return formatDate(date);
    } catch {
      return "Recently";
    }
  };

  const getCategoryIcon = (cat: InAppNotification["category"]) => {
    switch (cat) {
      case "student":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "document":
        return <FileText className="h-5 w-5 text-amber-500" />;
      case "reminder":
        return <Clock className="h-5 w-5 text-indigo-500" />;
      case "account":
        return <UserCheck className="h-5 w-5 text-emerald-500" />;
      case "security":
      case "audit":
        return <ShieldAlert className="h-5 w-5 text-rose-500" />;
      case "system":
      default:
        return <Database className="h-5 w-5 text-emerald-500" />;
    }
  };

  const getPriorityBadge = (p: InAppNotification["priority"]) => {
    switch (p) {
      case "critical":
        return (
          <Badge variant="destructive" className="text-xs px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold">
            Critical
          </Badge>
        );
      case "high":
        return (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="text-xs px-2 py-0.5 text-blue-600 dark:text-blue-400 border-blue-500/20 font-normal">
            Medium
          </Badge>
        );
      case "low":
      default:
        return (
          <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground border-border font-normal">
            Low
          </Badge>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-in fade-in-0 duration-200">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* Page Header */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold px-2.5 py-0.5">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5 border-border/80 hover:bg-muted"
            >
              <CheckCheck className="h-4 w-4 text-emerald-500" />
              <span>Mark all read</span>
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5 border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear all</span>
            </Button>
          )}

          <Link
            href={preferencesHref}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* Filters & Search Control Bar */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border-border/80 bg-card/95 backdrop-blur-xl shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-xs sm:text-sm bg-background border-border/80 rounded-xl focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                  aria-label="Clear search query"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground min-h-[44px] sm:min-h-0">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Unread only</span>
              </label>

              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-9 min-h-[44px] sm:min-h-0 text-xs bg-background border border-border/80 rounded-xl px-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs touch-pan-x scrollbar-none border-t border-border/40 pt-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-xl whitespace-nowrap font-medium transition-all border text-xs flex items-center gap-1.5",
                  category === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border/80 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* Notification List Section */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/80 flex items-start gap-4 animate-pulse"
              >
                <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-3/4 bg-muted/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : hasError ? (
          <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
            <CardContent className="space-y-3">
              <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
              <div className="space-y-1">
                <h3 className="font-semibold text-base text-foreground">Unable to load notifications</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Please check your connection and try again.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHasError(false);
                  window.location.reload();
                }}
                className="gap-2 border-border/80 mt-2 min-h-[44px] sm:min-h-0"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="border-border/80 bg-card/95 text-center p-12 shadow-xs">
            <CardContent className="space-y-3 max-w-sm mx-auto">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base sm:text-lg text-foreground">You&apos;re all caught up!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  No new notifications match your active filters.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start gap-3.5 sm:gap-4 relative group",
                !item.isRead
                  ? "border-l-4 border-l-primary border-border/80 bg-primary/5 dark:bg-primary/10 shadow-xs"
                  : "border-border/60 bg-card hover:bg-muted/30"
              )}
            >
              <div className="p-2.5 rounded-xl bg-muted/60 border border-border/40 shrink-0 self-start">
                {getCategoryIcon(item.category)}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5 w-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base font-semibold text-foreground truncate">
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span
                        className="h-2 w-2 rounded-full bg-primary shrink-0"
                        title="Unread notification"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getPriorityBadge(item.priority)}
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {item.actionUrl && (
                      <Link
                        href={item.actionUrl}
                        onClick={() => !item.isRead && markAsRead(item.id)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-8 min-h-[44px] sm:min-h-0 px-3 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
                        )}
                      >
                        <span>View Details</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 opacity-100 sm:opacity-90 sm:group-hover:opacity-100 transition-opacity">
                    {!item.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(item.id)}
                        className="h-8 min-h-[44px] sm:min-h-0 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="hidden sm:inline">Mark read</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(item.id)}
                      className="h-8 min-h-[44px] sm:min-h-0 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={isLoading}
              className="min-h-[44px] sm:min-h-0 px-6 text-xs gap-2 border-border/80"
            >
              <span>Load More Notifications</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
