# Sprint 06 - Folder Structure Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Directory Tree Configurations

The student portal layout organizes client views, domain rules, and migration logs:

```
src/
├── app/
│   └── student/
│       ├── layout.tsx                # Authenticated student layout wrapper & guards
│       ├── actions.ts                 # Server Actions for profile updates and session checks
│       ├── login/
│       │   └── page.tsx              # Passwordless OTP Email / Magic Link Login
│       ├── dashboard/
│       │   └── page.tsx              # Core Student Welcome & Status Summary
│       ├── profile/
│       │   └── page.tsx              # Read-only details + Editable Mobile & Language
│       ├── history/
│       │   └── page.tsx              # eFRRO versions list and audit remarks
│       ├── efrro/
│       │   └── page.tsx              # Drag-and-drop renewal document PDF uploader
│       └── upload/
│           └── [token]/
│               ├── actions.ts        # Action handling token verification and magic redirection
│               └── page.tsx          # Temporary entry landing page for secure tokens
├── domain/
│   └── student-portal/
│       ├── types/
│       │   └── index.ts              # Student profile and logs specifications
│       ├── repositories/
│       │   └── student-portal.repository.ts # Repository abstraction querying Supabase Auth
│       └── services/
│           └── student-portal.service.ts    # Secure file check processing domain service
supabase/
└── migrations/
    └── 009_student_portal.sql        # Migrations adding upload tokens, activity, and audit logs
```
