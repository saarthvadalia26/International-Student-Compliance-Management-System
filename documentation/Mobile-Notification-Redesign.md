# Production UI Specification — Native Mobile Bottom Sheet Notification Center

Target Institution: National Forensic Sciences University (NFSU)  
System: International Student Compliance Management System (ISCMS)  
Role: Senior UI/UX Engineer  
Date: August 6, 2026  

---

## 1. Executive Summary

This document specifies the technical architecture and design system for the **Native Mobile Bottom Sheet Notification Center** in ISCMS. Rather than patching desktop popups for mobile screens, desktop and mobile now utilize completely distinct, native implementations:
- **Desktop (`≥ 768px`)**: Top-anchored popover dropdown attached below the header bell trigger.
- **Mobile (`< 768px`)**: Dedicated **Native Bottom Sheet** sliding up from the bottom of the viewport with touch drag-handle gesture dismiss, safe-area inset support, and rounded top corners (`rounded-t-[24px]`).

---

## 2. Desktop vs. Mobile Implementation Comparison

| Design Feature | Desktop Viewport (`≥ 768px`) | Mobile Viewport (`< 768px`) |
|---|---|---|
| **UI Container Component** | Dropdown Popover | Native Bottom Sheet |
| **Positioning** | Top-right anchored (`right-0 top-11 absolute`) | Bottom anchored (`fixed inset-x-0 bottom-0 z-50`) |
| **Sizing Bounds** | `w-96 max-h-[560px]` | Phone: `w-full`, Tablet: `sm:max-w-lg sm:mx-auto` (480–512px centered), `max-h-[80vh]` |
| **Border Radius** | Fully rounded (`rounded-2xl`) | Top rounded corners (`rounded-t-[24px]`) |
| **Backdrop Overlay** | None | Dark glassmorphism overlay (`fixed inset-0 bg-black/60 backdrop-blur-xs z-40`) |
| **Opening Animation** | Zoom-in fade (`zoom-in-95 fade-in-0 150ms`) | Slide-up fade (`slide-in-from-bottom-full fade-in-0 250ms`) |
| **Dismiss Gestures** | Click outside / ESC key / Close X button | Touch swipe-down drag handle / Tap backdrop / Tap Close X button |
| **Safe Area Inset** | N/A | `pb-[max(1.5rem,env(safe-area-inset-bottom))]` for iOS & Android gesture bars |

---

## 3. Mobile Bottom Sheet Component Specifications

### Layout & Container
- **Position**: `fixed inset-x-0 bottom-0 z-50 md:hidden`
- **Max Height**: Bounded to `80% of screen height` (`max-h-[80vh] min-h-fit flex flex-col`).
- **Drag Handle**: Tactile pill handle at top (`w-12 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50 rounded-full mx-auto my-2.5 shrink-0 cursor-grab active:cursor-grabbing`).
- **Touch Gesture Listener**: Smooth downward drag listener (`onTouchStart`, `onTouchMove`, `onTouchEnd`). Swiping downward >70px automatically dismisses the sheet.

### Fixed Header Controls
- **Fixed Top Bar**: Drag handle + Header row + Search bar + Category filter pills remain fixed (`shrink-0 bg-card`).
- **Header Items**:
  - Title: `Notifications` (`font-bold text-sm text-foreground`).
  - Status Badge: `{unreadCount} unread` (`text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5`).
  - Actions: `Read All` & `Clear All` buttons.
  - Close Button: Explicit `(X)` button (`h-8 w-8 rounded-full bg-muted/50 hover:bg-muted`) with `aria-label="Close notification sheet"`.

### Scrollable Card List & Touch Actions
- **Scroll Container**: Independent scrolling (`flex-1 overflow-y-auto min-h-0 space-y-2 p-2.5 sm:p-3 scroll-smooth overscroll-contain`).
- **Compact Notification Cards**:
  - `p-2.5 sm:p-3 rounded-xl border border-border/50 bg-background/80 flex items-start gap-2.5 relative`.
  - Unread Accent: `border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10`.
  - Title & Timestamp: `font-semibold text-xs sm:text-sm text-foreground truncate` + `text-[10px] font-mono text-muted-foreground whitespace-nowrap`.
  - Description: `text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words`.
  - Touch Actions: Quick action icons (Mark as read, Delete) are visible on touch devices without mouse hover.

---

## 4. Accessibility & Performance Controls

1. **ARIA Compliance**:
   - Bottom sheet container: `role="dialog"`, `aria-label="Notification Center Mobile Sheet"`, `aria-modal="true"`.
   - Trigger bell button: `aria-expanded={isOpen}`, `aria-controls="notification-center-desktop-panel"`.
2. **Body Scroll Locking**: Opening the bottom sheet on mobile locks `document.body.style.overflow = "hidden"`, preventing background scrolling.
3. **Safe Area Support**: Supports `env(safe-area-inset-bottom)` for iPhone home indicators and Android gesture navigation bars.
