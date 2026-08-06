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
  const sheetRef = React.useRef<HTMLDivElement>(null);

  // Touch Swipe-Down Drag Gesture State for Mobile Bottom Sheet
  const touchStartY = React.useRef<number>(0);
  const [dragOffset, setDragOffset] = React.useState<number>(0);
  const isDragging = React.useRef<boolean>(false);

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

  // Close popover / bottom sheet on outside click or ESC key
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
      // Lock body scroll on mobile bottom sheet open
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        document.body.style.overflow = "hidden";
      }
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      if (typeof window !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [isOpen]);

  // Reset drag offset when opening/closing
  React.useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDragOffset(0);
      isDragging.current = false;
    }
  }, [isOpen]);

  // Touch handlers for mobile bottom sheet swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    // Only allow downward drag
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    // If dragged downward more than 70px, close the bottom sheet
    if (dragOffset > 70) {
      setIsOpen(false);
    } else {
      setDragOffset(0);
    }
  };

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

  // Shared Sub-header (Search + Category Pills + Priority Filter)
  const renderFilterControls = () => (
    <div className="p-2.5 sm:p-3 border-b border-border/60 space-y-2 bg-muted/20 shrink-0">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search alerts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs bg-background/90 rounded-lg border-border/60 focus:ring-1 focus:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search query"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] touch-pan-x">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              "px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all border text-[11px]",
              category === cat.id
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Secondary Controls (Unread toggle + Priority filter) */}
      <div className="flex items-center justify-between text-xs pt-0.5">
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
            className="h-6 text-[11px] bg-background border border-border/80 rounded-md px-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
  );

  // Shared Scrollable Notification Cards List
  const renderNotificationList = () => (
    <div className="flex-1 overflow-y-auto min-h-0 space-y-2 p-2.5 sm:p-3 scroll-smooth overscroll-contain scrollbar-thin">
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
              "p-2.5 sm:p-3 rounded-xl border transition-all flex items-start gap-2.5 relative group animate-in fade-in-0 duration-150",
              !item.isRead
                ? "border-l-4 border-l-primary border-border/80 bg-primary/5 dark:bg-primary/10 shadow-xs"
                : "border-border/40 bg-background/80 hover:bg-muted/40"
            )}
          >
            {/* Category Icon */}
            <div className="mt-0.5 p-2 rounded-xl bg-muted/60 border border-border/40 shrink-0">
              {getCategoryIcon(item.category)}
            </div>

            {/* Notification Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{item.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                {item.description}
              </p>

              <div className="flex items-center justify-between pt-1.5">
                <div className="flex items-center gap-1.5">
                  {getPriorityBadge(item.priority)}
                  {item.actionUrl && (
                    <Link
                      href={item.actionUrl}
                      onClick={() => setIsOpen(false)}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5 ml-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Quick Item Actions */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {!item.isRead && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      className="text-[10px] text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60"
                      title="Mark as read"
                      aria-label="Mark notification as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item.id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted/60"
                    title="Delete alert"
                    aria-label="Delete notification"
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
        <div className="p-2 text-center bg-muted/10 border-t border-border/60 rounded-b-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={isLoading}
            className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            {isLoading ? "Loading older notifications..." : "Load Older Notifications"}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button with Animated Unread Badge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label={`Notification Center (${unreadCount} unread)`}
        aria-expanded={isOpen}
        aria-controls="notification-center-desktop-panel"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. DESKTOP IMPLEMENTATION (≥ 768px / md:) — Popover Dropdown Attached Under Bell */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="notification-center-desktop-panel"
          role="dialog"
          aria-label="Notification Center"
          aria-modal="true"
          className={cn(
            "hidden md:flex flex-col z-50 absolute right-0 top-11 w-96 max-h-[560px]",
            "rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
        >
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 shrink-0 bg-card/90">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground truncate">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5">
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
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground focus:outline-none"
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
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive focus:outline-none"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 focus:outline-none"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {renderFilterControls()}
          {renderNotificationList()}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 2. NATIVE MOBILE IMPLEMENTATION (< 768px) — Touch Bottom Sheet */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Mobile Dark Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in-0 duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Bottom Sheet Container */}
          <div
            ref={sheetRef}
            id="notification-center-mobile-sheet"
            role="dialog"
            aria-label="Notification Center Mobile Sheet"
            aria-modal="true"
            style={{ transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : "none" }}
            className={cn(
              "md:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden",
              "w-full sm:max-w-lg sm:mx-auto max-h-[80vh] min-h-fit",
              "rounded-t-[24px] border-t border-x border-border/80 bg-card/98 backdrop-blur-2xl",
              "shadow-[0_-10px_40px_rgba(0,0,0,0.35)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.7)]",
              "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
              "animate-in slide-in-from-bottom-full fade-in-0 duration-250 ease-out"
            )}
          >
            {/* Swipe Down Drag Handle Area */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full pt-3 pb-1 flex flex-col items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none bg-card"
            >
              <div className="w-12 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50 rounded-full transition-colors" />
            </div>

            {/* Mobile Sheet Header */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex items-center justify-between border-b border-border/80 px-4 py-2.5 shrink-0 bg-card touch-none"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-8 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" /> Read All
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-8 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full bg-muted/50 hover:bg-muted"
                  aria-label="Close notification sheet"
                >
                  <X className="h-4 w-4 font-bold" />
                </Button>
              </div>
            </div>

            {renderFilterControls()}
            {renderNotificationList()}
          </div>
        </>
      )}
    </div>
  );
}
