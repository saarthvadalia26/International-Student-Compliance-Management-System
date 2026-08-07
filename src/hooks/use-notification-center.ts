"use client";

import * as React from "react";
import {
  fetchInAppNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteInAppNotification,
  clearAllInAppNotifications,
  InAppNotification,
} from "@/app/(app)/notifications/actions";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export function useNotificationCenter(portal: "staff" | "student" = "staff") {
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [hasMore, setHasMore] = React.useState<boolean>(false);
  const [page, setPage] = React.useState<number>(1);

  // Filters
  const [category, setCategory] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [unreadOnly, setUnreadOnly] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const loadNotifications = React.useCallback(
    async (targetPage = 1, append = false) => {
      setIsLoading(true);
      try {
        const res = await fetchInAppNotifications({
          portal,
          page: targetPage,
          limit: 10,
          category,
          priority,
          unreadOnly,
          searchQuery,
        });

        if (append) {
          setNotifications((prev) => [...prev, ...res.notifications]);
        } else {
          setNotifications(res.notifications);
        }
        setHasMore(res.hasMore);
        setPage(targetPage);

        const count = await getUnreadNotificationCount(portal);
        setUnreadCount(count);
      } catch (err) {
        console.error("[NOTIFICATION_CENTER_HOOK_ERROR]", err);
      } finally {
        setIsLoading(false);
      }
    },
    [portal, category, priority, unreadOnly, searchQuery]
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications(1, false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  // Realtime WebSocket Subscription on `in_app_notifications` table
  useRealtimeSubscription({
    table: "in_app_notifications",
    onEvent: (evt) => {
      if (evt.eventType === "INSERT" && evt.newRecord) {
        const cat = (evt.newRecord.category as InAppNotification["category"]) || "system";

        // Filter out staff-only events for student portal
        if (portal === "student" && ["security", "audit", "system"].includes(cat)) {
          return;
        }

        const item: InAppNotification = {
          id: String(evt.newRecord.id),
          userId: evt.newRecord.user_id ? String(evt.newRecord.user_id) : undefined,
          title: String(evt.newRecord.title || "Notification Alert"),
          description: String(evt.newRecord.description || ""),
          category: cat,
          priority: (evt.newRecord.priority as InAppNotification["priority"]) || "medium",
          eventType: String(evt.newRecord.event_type || "general"),
          isRead: Boolean(evt.newRecord.is_read),
          actionUrl: evt.newRecord.action_url ? String(evt.newRecord.action_url) : undefined,
          createdAt: String(evt.newRecord.created_at || new Date().toISOString()),
        };

        setNotifications((prev) => [item, ...prev]);
        if (!item.isRead) {
          setUnreadCount((count) => count + 1);
        }
      } else if (evt.eventType === "UPDATE" && evt.newRecord) {
        const updatedId = String(evt.newRecord.id);
        const updatedIsRead = Boolean(evt.newRecord.is_read);

        setNotifications((prev) =>
          prev.map((item) => (item.id === updatedId ? { ...item, isRead: updatedIsRead } : item))
        );

        getUnreadNotificationCount(portal).then(setUnreadCount);
      } else if (evt.eventType === "DELETE" && evt.oldRecord) {
        const deletedId = String(evt.oldRecord.id);
        setNotifications((prev) => prev.filter((item) => item.id !== deletedId));
        getUnreadNotificationCount(portal).then(setUnreadCount);
      }
    },
  });

  const markAsReadHandler = React.useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationAsRead(id);
  }, []);

  const markAllAsReadHandler = React.useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsAsRead(portal);
  }, [portal]);

  const deleteHandler = React.useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteInAppNotification(id);
  }, []);

  const clearAllHandler = React.useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    await clearAllInAppNotifications(portal);
  }, [portal]);

  const loadMoreHandler = React.useCallback(() => {
    if (hasMore && !isLoading) {
      loadNotifications(page + 1, true);
    }
  }, [hasMore, isLoading, page, loadNotifications]);

  return {
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
    markAsRead: markAsReadHandler,
    markAllAsRead: markAllAsReadHandler,
    deleteNotification: deleteHandler,
    clearAll: clearAllHandler,
    loadMore: loadMoreHandler,
  };
}
