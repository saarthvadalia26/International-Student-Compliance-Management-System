# Notification Preferences Navigation Architecture Specification

Target Institution: National Forensic Sciences University (NFSU)  
System: International Student Compliance Management System (ISCMS)  
Role: Senior Software Architect / UI Engineer  
Date: August 7, 2026  

---

## 1. Problem Statement & Root Cause Analysis

### Observed Issue
When clicking the **"Preferences"** link in the header of the Notification Center (`/notifications`), the application previously navigated to `/settings?tab=notifications`, but the Settings page rendered **Settings → General** instead of opening the Notification settings workspace.

### Root Cause Identification
1. The Notification Center link in `src/app/(app)/notifications/page.tsx` pointed to `/settings?tab=notifications`.
2. However, `src/app/(app)/settings/page.tsx` was not reading `useSearchParams()`. As a result, `activeTab` defaulted statically to `"general"`.
3. Consequently, any request to `/settings?tab=notifications` fell back to rendering General Settings instead of Notification Preferences.

---

## 2. Technical Architecture & Fix Details

### 1. URL Query Parameter Sync in Settings
- Integrated `useSearchParams()` into `SettingsPage` inside a `<React.Suspense>` boundary.
- Added a `React.useEffect` hook watching `tabParam`:
  ```tsx
  const tabParam = searchParams ? searchParams.get("tab") : null;

  React.useEffect(() => {
    if (tabParam && ["general", "programs", "notifications", "retention", "system", "security", "users"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  ```

### 2. Header Breadcrumb Route Awareness
- Updated `src/config/breadcrumbs.ts` so that when `pathname === "/settings"` and `searchParams.get("tab") === "notifications"`, the breadcrumb dynamically displays:
  ```
  Workspace / Settings / Notification Preferences
  ```
- Screen readers receive the correct active page context via `aria-current="page"`.

### 3. Back Navigation to Notification Center
- Rendered an explicit back link at the top of the Notifications tab in Settings:
  ```tsx
  <Link href="/notifications" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
    <ArrowLeft className="h-4 w-4" />
    <span>Back to Notification Center</span>
  </Link>
  ```

---

## 3. Scope & Permission Controls

- **Notification Preferences Scope**: Contains channel toggles (Email Alerts, WhatsApp Alerts), alert category configurations, and multi-language preview templates (English, Hindi, Spanish, French, Arabic, Chinese).
- **Backend Infrastructure Protection**: No Twilio auth tokens, SMTP password credentials, R2 secret keys, or Supabase service role keys are rendered in this preference UI.
