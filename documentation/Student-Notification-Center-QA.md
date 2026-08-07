# Student Notification Center & Light/Dark Theme QA Report

Target Institution: National Forensic Sciences University (NFSU)  
System: International Student Compliance Management System (ISCMS)  
QA Engineer: Senior Full-Stack UI/UX Engineering Team  
Date: August 7, 2026  

---

## 1. Overview & Inspection Summary

Before implementation, the existing Notification Center architecture and theme system were inspected:
- **Notification Data & Architecture**: `in_app_notifications` database model, Supabase Realtime subscriptions, and server actions in `src/app/(app)/notifications/actions.ts`.
- **Reusable UI Components**: `NotificationCenterWorkspace`, `NotificationBell`, `ThemeToggle`.
- **Theme Infrastructure**: `next-themes` with `ThemeProvider` delivering dark/light CSS variables.

---

## 2. Shared Components & Infrastructure Reused

| Component / Hook | Source Path | Portal Scope | Purpose |
|---|---|---|---|
| **`NotificationCenterWorkspace`** | `src/components/notifications/notification-center-workspace.tsx` | Staff & Student | Centralized notification workspace with search, filtering, unread toggle, and card list. |
| **`NotificationBell`** | `src/components/header/notification-bell.tsx` | Staff & Student | Header bell icon with realtime unread badge count. Navigates directly to portal notifications. |
| **`ThemeToggle`** | `src/components/header/theme-toggle.tsx` | Staff & Student | Light/Dark theme switcher with accessible `Sun` and `Moon` icons. |
| **`useNotificationCenter`** | `src/hooks/use-notification-center.ts` | Staff & Student | Custom React hook providing notification state, WebSocket realtime events, and actions. |
| **`useTheme`** | `next-themes` | Shared System | Global theme hook persisting light/dark selection across page reloads. |

---

## 3. Light / Dark Theme Testing Matrix

| Theme | Header Toggle Behavior | Visual Result | Layout Shift | QA Result |
|---|---|---|---|---|
| **Light Mode** | Click Sun icon $\rightarrow$ Dark Mode | Crisp slate text on white background (`bg-background`). | None (0px shift) | **PASSED** |
| **Dark Mode** | Click Moon icon $\rightarrow$ Light Mode | High-contrast muted text on dark card slate background (`bg-card`). | None (0px shift) | **PASSED** |
| **Persistence** | Reload page or navigate `/student/notifications` $\leftrightarrow$ `/student/settings` | Retains active theme without visible flash. | None | **PASSED** |

---

## 4. Student Data Isolation & Security Matrix

| Security Rule | Backend / Database Control | Result |
|---|---|---|
| **Student Ownership Scoping** | PostgreSQL RLS policy `SELECT_in_app_notifications_StudentSelf` (`user_id = auth.uid()`) | **PASSED** |
| **Category Authorization** | Server action `fetchInAppNotifications({ portal: "student" })` excludes `security`, `audit`, `system` | **PASSED** |
| **No Admin Credentials Exposed** | Preferences route `/student/settings` renders student-only communication policies | **PASSED** |

---

## 5. Viewport Adaptation Matrix (Mobile to Desktop)

| Screen Viewport | Device Class | Visual Layout Behavior | Result |
|---|---|---|---|
| **320px** | Mobile Small (iPhone SE) | Single column layout, touch-friendly filter bar (`touch-pan-x`), full-width cards. | **PASSED** |
| **375px - 414px** | Mobile Standard | Filter pills scroll smoothly, zero horizontal overflow. | **PASSED** |
| **768px** | Tablet | Responsive 2-column header layout, generous padding. | **PASSED** |
| **1024px+** | Desktop / Laptop | Centered `max-w-5xl` workspace container. | **PASSED** |

---

## 6. Automated Validation Matrix

| Command | Status | Result |
|---|---|---|
| `npx tsc --noEmit` | Verified | **PASSED** (0 Errors) |
| `npm run lint` | Verified | **PASSED** (0 Errors) |
| `npm run build` | Verified | **PASSED** (All student routes prerendered) |

---

UNIFIED NOTIFICATION CENTER & LIGHT/DARK MODE VERIFIED — STUDENT PORTAL SHARES CENTRALIZED NOTIFICATION ARCHITECTURE AND THEME CONTROLS WITH ROLE-SAFE ISOLATION.
