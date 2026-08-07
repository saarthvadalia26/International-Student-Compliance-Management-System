# Dynamic Page Header & Breadcrumb Architecture Specification

Target Institution: National Forensic Sciences University (NFSU)  
System: International Student Compliance Management System (ISCMS)  
Role: Senior UI/UX Engineer  
Date: August 7, 2026  

---

## 1. Root Cause Analysis & Problem Statement

### Observed Problem
Previously, when a user navigated to different routes (such as `/reports`, `/settings`, `/students`, `/reminders`, `/notifications`), the page content updated correctly, but the top navigation header continued to display a static breadcrumb:
```
Workspace / Dashboard
```

### Root Cause Identification
Inspection of `src/components/header/header.tsx` revealed static hardcoded HTML markup in the header layout component:
```tsx
{/* Breadcrumb Placeholder */}
<div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex font-small">
  <span>Workspace</span>
  <span className="text-border">/</span>
  <span className="font-medium text-foreground">Dashboard</span>
</div>
```
Because the shared header layout hardcoded `Dashboard`, client-side route changes never updated the visible breadcrumb or page context.

---

## 2. Dynamic Route-Aware Architecture

We implemented a centralized, single-source-of-truth route metadata and breadcrumb resolution architecture:

```
                  ┌──────────────────────────────┐
                  │ Next.js Active Route         │
                  │ (usePathname)                │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ getRouteMetadata()           │
                  │ (src/config/breadcrumbs.ts)  │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ <HeaderBreadcrumb />         │
                  │ (src/components/header/...)  │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
       ┌──────────────────────────────────────────────────┐
       │ Accessible <nav aria-label="Breadcrumb">         │
       │ Workspace / Reports / Audit Logs Report          │
       └──────────────────────────────────────────────────┘
```

---

## 3. Centralized Route Configuration (`src/config/breadcrumbs.ts`)

- **Route Metadata Resolver (`getRouteMetadata`)**:
  - Automatically matches exact routes (e.g. `/dashboard`, `/reports`, `/settings`, `/students`, `/reminders`, `/notifications`).
  - Supports nested routes dynamically (e.g. `/students/[id]`, `/students/[id]/passport`, `/students/[id]/visa`, `/students/[id]/efrro`, `/reports/audit`, `/reports/students`, `/reports/notifications`, `/reports/efrro`, `/dashboard/health`).
  - Formats raw URL slugs into human-readable labels (`"efrro"` $\rightarrow$ `"eFRRO"`, `"passport"` $\rightarrow$ `"Passport"`, `"audit"` $\rightarrow$ `"Audit Logs"`).

---

## 4. Header Component (`src/components/header/header.tsx`)

Replaced the hardcoded breadcrumb placeholder with `<HeaderBreadcrumb />`:
```tsx
{/* Left side: Hamburger, Logo, Title, Dynamic Breadcrumb */}
<div className="flex items-center gap-3 sm:gap-4 min-w-0">
  <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onMenuOpen}>
    <Menu className="h-5 w-5" />
  </Button>

  <div className="flex items-center gap-2 shrink-0">
    <img src={Branding.logoPaths.logo} alt={Branding.shortName} className="h-8 w-8 object-contain" />
    <span className="hidden font-display text-sm font-semibold tracking-tight text-foreground sm:block">
      {Branding.appShortName} Portal
    </span>
  </div>

  <span className="hidden h-5 w-px bg-border sm:block shrink-0" />

  {/* Dynamic Route-Aware Breadcrumb */}
  <HeaderBreadcrumb />
</div>
```

---

## 5. Accessibility & Responsive Systems

1. **Accessibility (`aria-label="Breadcrumb"`)**:
   - Uses `<nav aria-label="Breadcrumb">` wrapper.
   - Sets `aria-current="page"` on the current active route segment.
   - Provides screen-reader friendly link titles.
2. **Responsive Adaptation**:
   - On small screens (`< 640px`), the root section label (`Workspace`) is hidden (`hidden sm:inline`), prioritizing the active page title to eliminate horizontal text overflow or clipping on 320px–412px mobile viewports.
   - Long page names truncate gracefully (`truncate max-w-[140px] sm:max-w-[220px] md:max-w-xs`).
