# Student Portal Temporary Testing Mode Architecture (`STUDENT_PORTAL_TEST_MODE`)

**Target Institution**: National Forensic Sciences University (NFSU)  
**System**: International Student Compliance Management System (ISCMS)  
**Feature**: Temporary Authentication Bypass for Student Self-Service Portal  
**Status**: ACTIVE (Testing Mode Enabled)  

---

## 1. Executive Summary

To facilitate rapid end-to-end evaluation of the Student Portal by university stakeholders, QA engineers, and solution architects, a configurable **Temporary Testing Mode (`STUDENT_PORTAL_TEST_MODE`)** has been implemented.

### Key Highlights
- **No Maintenance Screens**: The maintenance/unavailable screen has been completely removed.
- **Direct Route Access**: All student subroutes (`/student/dashboard`, `/student/profile`, `/student/efrro`, `/student/history`, `/student/settings`, `/student/upload/[token]`) open directly without requiring OTP authentication.
- **Demo Student Session**: Automatically loads an institutional demo student profile (**Alexander Wright**, Registration Number `NFSU/2026/FS/1089`) with realistic compliance, passport, visa, and eFRRO records.
- **Full Navigation & Upload Integrity**: All menus, sidebars, buttons, activity logs, and document upload forms remain 100% operational.
- **Zero-Code Production Reversal**: Setting `STUDENT_PORTAL_TEST_MODE=false` in the environment instantly restores the complete OTP authentication flow with zero code modifications.

---

## 2. Configuration Model

### Environment Variable Matrix

```env
# Enable Temporary Testing Mode (Default during evaluation)
STUDENT_PORTAL_TEST_MODE=true

# Restore Production WhatsApp OTP Flow (When ready for live deployment)
STUDENT_PORTAL_TEST_MODE=false
```

### Centralized Feature Flag Logic (`src/config/feature-flags.ts`)

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

## 3. Architecture & Routing Control Flow

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
│  Bypass Auth Guard       │                                   │  Server Supabase Auth    │
│  Inject Demo Session     │                                   │  Check User JWT Session  │
│  (Alexander Wright)      │                                   └─────────────┬────────────┘
└────────────┬─────────────┘                                                 │
             │                                                      SESSION? │
             │                                            ┌──────────────────┴──────────────────┐
             │                                       YES  │                                NO   │
             │                                            ▼                                     ▼
             │                              ┌──────────────────────────┐          ┌──────────────────────────┐
             │                              │ Render Student Route     │          │ Redirect /student/login  │
             │                              └──────────────────────────┘          └──────────────────────────┘
             ▼
┌──────────────────────────┐
│ Render Student Route     │
│ with Live Interactive UI │
└──────────────────────────┘
```

---

## 4. Demo Student Snapshot (`Alexander Wright`)

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

---

## 5. Security & Production Reversal Verification

1. **Environment Isolation**: `STUDENT_PORTAL_TEST_MODE` is strictly evaluated at runtime.
2. **Clean Switch**: Setting `STUDENT_PORTAL_TEST_MODE=false` in Vercel / environment settings instantly re-activates:
   - Route protection middleware in `AuthenticatedStudentLayout`.
   - Security checks in `requestStudentWhatsAppOtpByIdentifierAction` & `verifyStudentWhatsAppOtpByIdentifierAction`.
   - Cryptographic JWT verification in `verifyUserAndGetStudentId`.
