# Branding Refactor Walkthrough

- **Status**: Completed / Certified
- **Role**: Lead Software Architect
- **Sprint**: Sprint 11 - Branding Refactor

---

## 1. Centralized Configuration System

We created the centralized branding module under **[src/config/branding.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/config/branding.ts)**.

This module exports standard properties including:
*   `universityName`: `"National Forensic Sciences University"`
*   `shortName`: `"NFSU"`
*   `appName`: `"International Student Compliance Management System"`
*   `appShortName`: `"ISCMS"`
*   `logoPaths`: Maps unified branding path `/assets/branding/nfsu-logo.png`.
*   `faviconPaths`: Paths targeting newly provisioned ICO, PNGs, and manifest files.

---

## 2. Dynamic Integrations Mapping

The following layers were updated to consume variables from the unified Branding configurations:
1.  **Browser Metadata Layout**: Updated layouts using Next.js Metadata API referencing `Branding` attributes dynamically.
2.  **Portal Authentication Pages**: Login screens render the official university emblem and titles.
3.  **UI Layout Panels**: Desktop headers, footers, sidebars, and mobile overlays utilize configuration identifiers.
4.  **Backend Services**: Resend dispatches format from headers and emails signatures dynamically.
