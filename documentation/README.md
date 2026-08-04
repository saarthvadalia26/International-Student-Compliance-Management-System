# International Student Compliance Management System (ISCMS)
## National Forensic Sciences University (NFSU)

**Version:** v1.0.0 Production Release  
**Status:** Approved & Production-Ready  
**Date:** August 2026  

---

## 1. Executive Summary & Overview

The **International Student Compliance Management System (ISCMS)** is a specialized enterprise web application engineered specifically for the **National Forensic Sciences University (NFSU)**. It streamlines international student record management, passport validation, visa expiration tracking, eFRRO registration compliance, automated notifications (WhatsApp & Email), role-based security, and institutional reporting.

---

## 2. Key Modules & Production Capabilities

- **Intelligent System Initialization & Recovery Mode**: Differentiates between fresh installations and missing admin recovery modes automatically.
- **Student Profile & Record Management**: Full student lifecycle tracking with country of origin, course details, and contact information.
- **Multi-Version Compliance Records**: Comprehensive version histories for Passport, Visa, and eFRRO certificates with staff approval workflows.
- **Automated Reminder & Notification Engine**: Scheduled alerts for expiring documents via Twilio (WhatsApp) and Resend (Email).
- **Role-Based Access Control (RBAC)**: Distinct permissions for Administrators and Staff.
- **Administrator Diagnostic Mode**: Role-gated error boundary rendering log reference IDs without exposing technical stack traces.
- **Factory Reset**: Pre-handover wipe functionality that restores the application to a brand-new setup wizard state.
- **Mobile Navigation Parity**: Touch-friendly accordion submenus for Students and Documents matching the desktop sidebar layout.
- **Automatic Notification Dismissal**: Category-driven toast display durations (Success: 3s, Info: 4s, Warning: 5s, Error: 6s).

---

## 3. Technology Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **UI Architecture:** React 19, TailwindCSS v4, Lucide Icons, Sonner Toaster
- **Database & Security:** Supabase Managed PostgreSQL with Row-Level Security (RLS)
- **Object Storage:** Cloudflare R2 (S3-Compatible Object Storage)
- **Bot Protection & Auth:** Cloudflare Turnstile CAPTCHA, Supabase SSR Auth
- **Quality Assurance:** TypeScript 5, ESLint, Playwright

---

## 4. Directory Structure

```
/documentation
├── README.md                      # GitHub & Repository Overview
├── Administrator-User-Manual.pdf  # Admin System Administration Guide
├── Staff-User-Manual.pdf          # Staff Daily Operations Guide
├── Installation-Guide.pdf         # Infrastructure & Local Setup
├── Deployment-Guide.pdf           # Vercel, Supabase & R2 Deployment
├── System-Architecture.pdf        # Architecture Topology & Flowcharts
├── Database-Documentation.pdf     # ER Diagrams, Schemas & RLS Policies
├── API-Documentation.pdf          # Server Actions & API Endpoint Specs
├── Features.pdf                   # Complete Module-by-Module Feature List
├── Security.pdf                   # Security Architecture & Headers
├── Release-Notes-v1.0.0.pdf       # Release Notes for v1.0.0
└── Submission-Summary.pdf         # Executive Handover Summary for NFSU
```

---

## 5. Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local

# 3. Perform type check & linting
npx tsc --noEmit
npm run lint

# 4. Launch local dev server
npm run dev

# 5. Build production bundle
npm run build
```

---

## 6. Environment Variables Reference

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET_NAME=isms-documents
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

---

## 7. License & Support

Developed for **National Forensic Sciences University (NFSU)**. All rights reserved.
