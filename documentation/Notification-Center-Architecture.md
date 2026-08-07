# Notification Center Architecture — Production UX Specification

Target Institution: National Forensic Sciences University (NFSU)  
System: International Student Compliance Management System (ISCMS)  
Role: Senior UI/UX Architect  
Date: August 7, 2026  

---

## 1. Executive Summary & Rationale

The previous notification implementation relied on floating dropdown popovers and mobile bottom sheet overlays anchored to the header bell trigger. On small mobile viewports, popovers created positioning conflicts, layout clipping, and uncomfortably dense touch targets.

The **Production UX Redesign** removes the popup interaction model entirely:
- Clicking the notification bell in the header navigates directly to the authoritative **Notification Center** page at `/notifications`.
- No floating popovers, dropdowns, or bottom sheets are opened.
- The Notification Center is hosted within the main application shell, providing full-width responsive layouts for mobile devices and centered max-width layouts (`max-w-5xl`) for desktop screens.

---

## 2. System Architecture & Component Mapping

```
App Shell (src/components/shell/app-shell.tsx)
  └── RealtimeProvider (src/providers/realtime-provider.tsx)
        ├── Header (src/components/header/header.tsx)
        │     └── NotificationBell (src/components/header/notification-bell.tsx)
        │           └── Link -> /notifications (with animated unread badge)
        └── Route Page: /notifications (src/app/(app)/notifications/page.tsx)
              ├── Page Header (Title, Subtitle, Global Read All / Clear All / Preferences)
              ├── Filter Bar (Category Pills, Search Input, Priority Filter, Unread Toggle)
              ├── Notification List (Card Rows with Read/Unread Status & Action Links)
              ├── Skeleton Loader (Lightweight shimmer animation during fetch)
              ├── Empty State ("You're all caught up" with zero mock data)
              └── Error State ("Unable to load notifications" with Try Again button)
```

---

## 3. Reused Backend & Realtime Infrastructure

No business logic, database tables, or server action endpoints were rewritten:
- **Server Actions**: `fetchInAppNotifications`, `getUnreadNotificationCount`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteInAppNotification`, and `clearAllInAppNotifications` in `src/app/(app)/notifications/actions.ts`.
- **Client State & Hook**: `useNotificationCenter` in `src/hooks/use-notification-center.ts` manages optimistic updates, unread counter state, pagination, and category/priority filters.
- **WebSocket Realtime Updates**: Listens to live `INSERT`, `UPDATE`, and `DELETE` events on the `in_app_notifications` database table via Supabase Realtime WebSocket subscription. Unread badges and notification cards update dynamically without full-page reloads.

---

## 4. Responsive Viewport Strategy

| Viewport Range | Breakpoint Class | Layout & Design System Strategy |
|---|---|---|
| **Mobile** (`< 768px`) | Base Styles | Full width (`w-full`), zero horizontal overflow (`overflow-x-hidden`), touch target size $\ge 44\text{px}$, horizontally scrollable touch-pan filter pills (`touch-pan-x`). |
| **Tablet** (`768px – 1023px`) | `md:` | 2-column header row (Title/Subtitle left, Action buttons right), generous card padding (`p-5`). |
| **Desktop** (`≥ 1024px`) | `lg:` | Centered maximum content width (`max-w-5xl mx-auto`), enterprise card borders, hover action targets. |

---

## 5. Accessibility & ARIA Compliance

1. **Semantic Hierarchy**: Uses a single `<h1>` for page title with proper heading nesting (`<h2>`, `<h3>`).
2. **Keyboard Navigation**: All filter tabs, action buttons, and external link triggers are focusable via `Tab` key with visible focus rings (`focus:ring-2 focus:ring-primary/20`).
3. **Screen Reader Readiness**: Unread status badges include explicit screen-reader indicators, and touch action buttons specify clear `aria-label` descriptors.
