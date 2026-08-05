# Production UI Specification — Responsive Mobile Notification Center

Target Institution: National Forensic Sciences University (NFSU)  
System: International Student Compliance Management System (ISCMS)  
Role: Senior UI/UX Engineer  
Date: August 5, 2026  

---

## 1. Executive Summary

This document specifies the responsive UI/UX architecture for the redesigned **Mobile Notification Center** in ISCMS. The notification center provides real-time alerts (student compliance warnings, document expiry reminders, system security alerts, and administrative updates) with a sleek, compact, touch-optimized popover experience on screens below 768px (`< md`).

---

## 2. Responsive Layout System

### Mobile Layout (`< 768px`)
- **Viewport Bounds**: Width bounded to `w-[94vw] max-w-md` (94% of the mobile viewport width up to 420px).
- **Horizontal Centering**: Centered on the viewport with `fixed left-1/2 -translate-x-1/2 top-16 z-50`.
- **Max Height & Flex Column**: Bounded to `max-h-[82vh]` with flexible flex column container to prevent vertical screen overflow.
- **Corner Radius**: Modern `rounded-[20px]` matching enterprise design aesthetics (Stripe / GitHub Enterprise).
- **Elevation & Shadow**: Glassmorphism backdrop blur `backdrop-blur-2xl` with dark ambient drop shadow (`shadow-2xl shadow-black/20 dark:shadow-black/60 border border-border/80 bg-card/95`).
- **Touch Dismiss Overlay**: Renders a subtle dark backdrop (`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden`) when open to focus user attention and support touch dismiss.

### Desktop Layout (`≥ 768px`)
- **Dropdown Anchoring**: Positions smoothly as a right-aligned popover directly under the header bell trigger (`md:absolute md:right-0 md:top-11 md:w-96 md:max-w-none md:max-h-[560px] md:translate-x-0`).
- **Standard Corners**: Clean `md:rounded-2xl`.

---

## 3. Header & Navigation Structure

- **Single Compact Row**: Height reduced (`px-3 py-2.5 sm:px-4 sm:py-3 border-b border-border/80 shrink-0`).
- **Header Elements**:
  1. **Title**: `Notifications` (`font-semibold text-xs sm:text-sm text-foreground truncate`).
  2. **Status Badge**: `{unreadCount} unread` (`text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5`).
  3. **Batch Actions**: `Read All` & `Clear All` buttons with compact icons and hover/focus states.
  4. **Close Button (X)**: Touch-friendly icon button (`h-8 w-8 rounded-full hover:bg-muted/80`) with explicit `aria-label="Close notification center"`.

---

## 4. Sub-header Controls (Search & Category Pills)

- **Fixed Sub-header**: Search bar and category filter pills remain fixed at the top during notification list scrolling.
- **Search Bar**: Input with left search icon and right clear button (`h-8 text-xs bg-background/90`).
- **Category Filter Pills**:
  - Horizontal scrollable container (`overflow-x-auto pb-1 scrollbar-none touch-pan-x`).
  - Active pill: `bg-primary text-primary-foreground border-primary shadow-xs`.
  - Inactive pill: `bg-background text-muted-foreground border-border/80 hover:bg-accent`.
- **Secondary Filters**: Unread-only toggle checkbox and Priority selection dropdown (`All Priorities`, `Critical`, `High`, `Medium`, `Low`).

---

## 5. Notification Cards & Typography

- **Card Container**: `p-2.5 sm:p-3 rounded-xl border transition-all flex items-start gap-2.5 relative group animate-in fade-in-0 duration-150`.
- **Unread Highlight**: Unread cards feature a subtle accent border (`border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10`).
- **Category Icon Box**: `p-2 rounded-xl bg-muted/60 border border-border/40 shrink-0`.
- **Typography Hierarchy**:
  - **Title**: `text-xs sm:text-sm font-semibold text-foreground truncate`.
  - **Timestamp**: `text-[10px] font-mono text-muted-foreground whitespace-nowrap` (`Just now`, `5m ago`, `2h ago`).
  - **Description**: `text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words`.
- **Mobile Touch Actions**: Mark-as-read and Delete action icons are visible on touch devices without requiring mouse hover (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).

---

## 6. Accessibility & ARIA Compliance

1. **ARIA Roles & Attributes**:
   - Panel container: `role="dialog"`, `aria-label="Notification Center"`, `aria-modal="true"`, `id="notification-center-panel"`.
   - Trigger bell button: `aria-expanded={isOpen}`, `aria-controls="notification-center-panel"`.
2. **Keyboard Trapping & Dismiss**:
   - Pressing `Escape` closes the notification center.
   - Clicking outside or on the mobile backdrop overlay closes the notification panel.
3. **Screen Reader Friendly**: All icon buttons include accessible labels (`aria-label`).
