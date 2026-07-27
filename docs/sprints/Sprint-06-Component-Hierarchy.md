# Sprint 06 - Component Hierarchy Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Hierarchy Tree

The Student Portal component architecture is organized hierarchically:

```
[layout.tsx (StudentPortalLayout)]
 ├── [Header / Navigation Sidebar (Responsive Mobile Drawer)]
 └── [Page Components]
      ├── [login/page.tsx (StudentLoginPage)]
      │    └── AsyncActionButton (Magic Link Dispatcher)
      ├── [dashboard/page.tsx (StudentDashboard)]
      │    ├── WelcomeCard
      │    ├── PersonalInfoSummary
      │    ├── eFRROStatusCard (Expiry Countdown, Current Status)
      │    ├── RecentNotificationsPanel
      │    └── UploadHistorySummary
      ├── [profile/page.tsx (StudentProfilePage)]
      │    ├── ReadOnlyPersonalDetails
      │    └── ContactDetailsEditForm
      │         └── AsyncActionButton (Save Contact Changes)
      ├── [history/page.tsx (UploadHistoryPage)]
      │    └── VersionsAuditTable (Responsive Card Layout on Mobile)
      └── [efrro/page.tsx (eFRRORenewalUploadPage)]
           ├── DragAndDropZone
           ├── PDFPreviewFrame (IFrame View)
           └── AsyncActionButton (Submit Document File)
```

---

## 2. Reused Shared Core UI Controls

To ensure consistency, the Student Portal leverages existing shared Tailwind/Vanilla CSS components:
*   `src/components/ui/async-action-button.tsx` — Standardizes loading state animations and double click prevention during uploads or saving actions.
*   `src/components/ui/card.tsx` — Reused across dashboard grid lists.
*   `src/components/ui/badge.tsx` — Displays status tags (Approved, Pending Review, Rejected).
*   `src/components/ui/input.tsx` & `textarea.tsx` — Standard form controls.
