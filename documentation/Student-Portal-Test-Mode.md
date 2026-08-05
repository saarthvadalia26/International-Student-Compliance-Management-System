# Student Portal Test Mode Architecture (`STUDENT_PORTAL_TEST_MODE`)

**Target Institution**: National Forensic Sciences University (NFSU)  
**System**: International Student Compliance Management System (ISCMS)  
**Feature**: Authentication Bypass & Direct Access for Student Self-Service Portal  
**Status**: ACTIVE & IMPLEMENTED  

---

## 1. Executive Summary

To enable rapid testing and evaluation of the Student Portal by university administrators, QA engineers, and solution architects, a centralized environment variable **`STUDENT_PORTAL_TEST_MODE`** controls the authentication lifecycle of `/student/*` routes.

### Behavior When `STUDENT_PORTAL_TEST_MODE=true`
- **Zero Authentication UI**: The Student Login page, Registration Number input field, WhatsApp OTP input, and "Send WhatsApp Code" buttons are **completely hidden and bypassed**.
- **Automatic Redirect**: Accessing `/student` or `/student/login` automatically redirects directly to `/student/dashboard`.
- **Direct Route Access**: All student subroutes (`/student/dashboard`, `/student/profile`, `/student/efrro`, `/student/history`, `/student/settings`) open immediately without OTP or login prompts.
- **Demo Student Session**: Automatically loads an institutional demo student profile (**Alexander Wright**, Registration Number `NFSU/2026/FS/1089`, B.Tech Cybersecurity) with realistic compliance, passport, visa, and eFRRO records.
- **Full Navigation & Upload Integrity**: All menus, sidebars, buttons, activity logs, and document upload forms remain 100% operational.

### Behavior When `STUDENT_PORTAL_TEST_MODE=false`
- Restores the complete production WhatsApp OTP authentication flow and session guard with **zero code modifications**.

---

## 2. Environment Configuration Matrix

```env
# Enable Temporary Testing Mode (Default during evaluation)
STUDENT_PORTAL_TEST_MODE=true

# Restore Production WhatsApp OTP Flow (When ready for live deployment)
STUDENT_PORTAL_TEST_MODE=false
```

### Centralized Feature Flag (`src/config/feature-flags.ts`)

```typescript
export const FEATURE_FLAGS = {
  /**
   * Temporary testing mode flag: Bypasses OTP authentication for Student Portal
   * and loads a fully functional demo student session for testing.
   */
  STUDENT_PORTAL_TEST_MODE: 
    process.env.NEXT_PUBLIC_STUDENT_PORTAL_TEST_MODE !== "false" && 
    process.env.STUDENT_PORTAL_TEST_MODE !== "false",

  STUDENT_PORTAL_ENABLED: true
} as const;

export function isStudentPortalTestMode(): boolean {
  return FEATURE_FLAGS.STUDENT_PORTAL_TEST_MODE;
}
```

---

## 3. Middleware & Control Flow Architecture (`src/middleware.ts`)

```
                               ┌───────────────────────────┐
                               │  User requests /student/* │
                               └─────────────┬─────────────┘
                                             │
                               ┌─────────────▼─────────────┐
                               │ isStudentPortalTestMode()? │
                               └──────┬─────────────┬──────┘
                                      │             │
                             TRUE     │             │     FALSE
             ┌────────────────────────┘             └────────────────────────┐
             ▼                                                               ▼
┌──────────────────────────┐                                   ┌──────────────────────────┐
│ Is request /student or   │                                   │  Server Supabase Auth    │
│ /student/login?          │                                   │  Check User JWT Session  │
└──────┬─────────────┬─────┘                                   └─────────────┬────────────┘
       │             │                                                       │
   YES │             │ NO                                           SESSION? │
       ▼             ▼                                    ┌──────────────────┴──────────────────┐
┌──────────────┐ ┌──────────────────────────┐        YES  │                                NO   │
│ Redirect     │ │ Bypass Auth Guard        │             ▼                                     ▼
│ to /student/ │ │ Inject Demo Session      │ ┌──────────────────────────┐          ┌──────────────────────────┐
│ dashboard    │ │ (Alexander Wright)       │ │ Render Student Route     │          │ Redirect /student/login  │
└──────────────┘ └───────────┬──────────────┘ └──────────────────────────┘          └──────────────────────────┘
                             │
                             ▼
               ┌──────────────────────────┐
               │ Render Student Route     │
               │ with Live Interactive UI │
               └──────────────────────────┘
```

---

## 4. Demo Student Profile (`Alexander Wright`)

When accessing the portal in test mode, the system automatically injects the following institutional demo dataset:

| Field | Value |
|---|---|
| **Student Name** | Alexander Wright |
| **Registration / Enrollment No.** | `NFSU/2026/FS/1089` |
| **Academic Program** | B.Tech in Cyber Security & Forensic Science |
| **School / Department** | School of Cyber Security & Digital Forensics |
| **Nationality** | United Kingdom |
| **Email** | `alexander.w@nfsu.ac.in` |
| **Passport Expiry** | 15-Oct-2029 (Compliant) |
| **Visa Expiry** | 31-Jul-2027 (Compliant) |
| **eFRRO Status** | Compliant (360 Days Remaining) |
| **Activity History** | 3 Verified Records |
