# International Student Compliance Management System (ISCMS)

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: Private](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](https://github.com)

The **International Student Compliance Management System (ISCMS)** is a secure, production-grade web application custom-built for the **National Forensic Science University (NFSU)**. It is designed to manage international student profiles and track crucial compliance documents (Passports, Visas, and eFRRO forms). By automating compliance status evaluation, alerting administrators to upcoming expirations, and tracking document versions, ISCMS streamlines institutional compliance, minimizes risk, and maintains audit readiness.

---

## 🚀 Features

*   **Student Management**: Register, view, search, and update detailed international student profiles.
*   **Passport Management**: Record passports details, issue/expiry dates, and track validation states.
*   **Visa Management**: Track visas numbers, visa types, and verification logs.
*   **eFRRO Management**: Log eFRRO registrations and compliance status.
*   **Compliance Status Tracking**: Evaluates real-time compliance states (Compliant, Expiring Soon, Expired, or Missing Documents).
*   **Automated Reminder Engine**: Runs evaluations against student document statuses to schedule automated pre-expiry and post-expiry alerts.
*   **Notification Center**: Unified admin interface showing metrics, delivery statuses, and gateway retry logs.
*   **Document Version History**: Keep auditable tracks of all uploaded document versions and verification records.
*   **Secure Document Storage**: Integrates with Supabase Storage with dynamic URL signing to restrict document access.
*   **Reporting Dashboard**: Summary cards detailing metrics, pending audits, and active warning statuses.
*   **Search & Filtering**: Search students by name, registration ID, nationality, or compliance standing.
*   **Audit Trail**: Logs all document verification comments and status changes.
*   **Responsive UI**: Optimized for mobile and desktop screens.

---

## 🛠 Technology Stack

*   **Frontend**: React, Next.js (App Router), Tailwind CSS
*   **Backend**: Next.js Server Actions, Route Handlers
*   **Database**: PostgreSQL, Supabase DB
*   **Authentication**: Supabase Auth (Cookie-based session validation)
*   **Storage**: Supabase Storage buckets
*   **Notifications**: Custom queue manager with Resend and Twilio provider stubs
*   **Deployment**: Vercel / Docker (Planned)

---

## 📐 Architecture

ISCMS implements a strict modular architecture to separate business logic from infrastructure details:

*   **App Router**: Structural separation of public routes, app shells, and API handlers.
*   **Feature-Based Structure**: Frontend components, utils, and assets are grouped under feature modules (e.g. `/features/compliance/`, `/features/notifications/`).
*   **Domain Layer**: Houses canonical domain objects (e.g. `Passport`, `Visa`, `StudentSnapshot`) as the single source of truth.
*   **Repository Pattern**: Standardized database query boundaries (`INotificationRepository`, `IComplianceDocumentRepository`) isolating public client API calls.
*   **Dependency Injection**: Domain services receive their repository interfaces via constructor injection, decoupling code from Supabase endpoints.
*   **Compliance Engine**: Central service evaluating expirations and document statuses against institutional guidelines.
*   **Notification Engine**: Cron-driven processor evaluating active alerts and dispatching messages in transaction-locked batches.

---

## 📁 Folder Structure

```
├── .agents/                 # Customize guidelines, rules, and assistant skills
├── docs/                    # Sprints architectural plan specs and walkthroughs
├── supabase/
│   ├── migrations/          # Sorted SQL schema migrations
│   └── seed/                # Mock data seeds
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable shared UI layout components
│   ├── config/              # Environment configurations & navigation maps
│   ├── domain/              # Domain models, repositories, & services
│   ├── features/            # Feature-oriented UI components (compliance, notifications)
│   ├── lib/                 # Supabase client utilities & mock data helpers
│   ├── providers/           # Query, routing, and theme wrapper providers
│   └── services/            # Legacy system services
```

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v20+ recommended)
*   npm or pnpm
*   A Supabase Project instance

### Installation
1. Clone this repository to your local system.
2. Install npm dependencies:
   ```bash
   npm install
   ```

### Environment Variables
Create a `.env.local` file at the project root based on the following template:

```env
# Public Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Private Supabase service role key (Never expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Notification Provider Gateways API keys
RESEND_API_KEY=re_your_api_key_placeholder
TWILIO_ACCOUNT_SID=ACyour_account_sid_placeholder
TWILIO_AUTH_TOKEN=your_auth_token_placeholder
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verification Tasks
*   **Build Production Bundle**: `npm run build`
*   **Typecheck code**: `tsc --noEmit`
*   **Linter checking**: `npm run lint`

---

## 🗄 Database Migrations

Database definitions are managed under **[supabase/migrations/](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/supabase/migrations/)**. Migrations are executed in sequential order:
*   `001_enable_extensions.sql`: Prepares public extensions.
*   `002_reference_data.sql`: Seed data for nationalities and academic programs.
*   `003_students.sql`: Setup table for core student credentials.
*   `004_student_details.sql`: Setup student address and academic detail tables.
*   `005_documents.sql`: Setup passport, visa, efrro versioning, and student snapshot tables.
*   `006_notifications.sql`: Setup template parameters, queues logs, and reminder rules.

---

## ✉ Notifications

The notification system runs asynchronously using a cron-evaluated database queue:
*   **Current status**: Implemented using stubbed provider clients for Resend (Email) and Twilio (WhatsApp) to allow verification of delivery flows, retry backoffs, and logs processing.
*   **Production Integrations**: Future deployments will replace stubs with live APIs for:
    *   **Email**: Institution-SMTP server or Resend API key activation.
    *   **WhatsApp**: Twilio Business API client keys integration.

---

## 🗺 Roadmap

*   ✅ **Sprint 1 — Foundation**: Directory setup, Supabase environment routing clients, and startup checks.
*   ✅ **Sprint 2 — Student Management**: Dynamic registration tables, nationality lookups, and validations.
*   ✅ **Sprint 3 — Compliance Documents**: Versioned document tables, storage signatures, timelines, and audit comments.
*   ✅ **Sprint 4 — Notification Engine**: Extensible channels, template translators, preferences, and scheduler batches.
*   🔄 **Sprint 5 — Reporting & Analytics (Planned)**: Detailed export PDF summaries and visual audit tracking statistics.
*   🔄 **Sprint 6 — Production Readiness (Planned)**: SMTP integration and final regression checks.

---

## 🔒 Security

*   **Row Level Security (RLS)**: PostgreSQL tables restrict select, update, and delete access. Only authenticated administrator scopes bypass safety rules.
*   **Server-Side Validation**: Domain layers enforce strict Zod schemas checks before saving record changes.
*   **Secure Document Access**: PDFs uploaded to Supabase Storage are private. Access is mediated by server-signed token URLs valid only for short durations.

---

## 🏛 Development Standards

*   **Strict TypeScript**: TypeScript strict mode is enabled. No `any` type definitions are permitted.
*   **Linting**: Strict ESLint rules ensure syntax guidelines remain standard.
*   **Accessibility (a11y)**: Focus states, screen-reader parameters (`aria-label`), and color contrast ratios conform to WCAG 2.1 specifications.

---

## 📄 License
Private Repository. Developed exclusively for the **National Forensic Science University (NFSU)**. Unauthorized duplication or redistribution of any files is strictly prohibited.

---

## ✍ Author
Developed by **Saarth**.
*AI-assisted development powered by Antigravity and ChatGPT.*
