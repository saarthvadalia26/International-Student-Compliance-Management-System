# Sprint 05 - Folder Structure Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Directory Tree Configurations

The directories configuration integrates the dashboard feature module and the refined domain layout:

```
src/
├── app/
│   └── (app)/
│       ├── dashboard/
│       │   └── page.tsx               # landing page after authentication
│       └── reports/
│           ├── page.tsx               # Main Reports directory index listing
│           ├── students/
│           │   └── page.tsx           # Student General Report Page
│           ├── passports/
│           │   └── page.tsx           # Passport Expiry and Verification Report Page
│           ├── visas/
│           │   └── page.tsx           # Visa Expiry and Verification Report Page
│           ├── efrro/
│           │   └── page.tsx           # eFRRO Compliance Report Page
│           ├── compliance/
│           │   └── page.tsx           # Aggregated Compliance Matrix Report Page
│           ├── notifications/
│           │   └── page.tsx           # eFRRO Alerts & Delivery Logs Report Page
│           └── audit/
│               └── page.tsx           # Admin verification actions audit trail
├── domain/
│   └── reports/
│       ├── dto/                       # Data Transfer Objects
│       ├── mappers/                   # DB rows to Domain Mapper helpers
│       ├── repositories/              # Repository interfaces
│       ├── services/                  # Business calculations services
│       ├── types/                     # Shared types and filters schemas
│       └── validators/                # Zod filters validation checkers
├── features/
│   ├── dashboard/                     # Dedicated Feature Module
│   │   ├── charts/                    # Recharts wrapper components
│   │   ├── metrics/                   # Overview metrics grid panels
│   │   ├── constants/                 # Dashboard status items
│   │   └── hooks/                     # Dashboard statistics fetchers
│   └── reports/
│       ├── components/                # Shared reporting controls (filters, tables)
│       ├── constants/                 # Filter configurations definitions
│       └── hooks/                     # Fetch hooks mapping search parameters
```
