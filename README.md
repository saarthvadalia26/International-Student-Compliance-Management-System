# ISCMS
**International Student Compliance Management System**

<div align="center">
A centralized platform engineered for higher-education institutions, universities, and international student offices to manage international student immigration documents, compliance metadata, document versions, expiration monitoring, automated reminder workflows, and administrative governance.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15+-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
</div>

---

## Documentation Architecture

> [!IMPORTANT]
> **Source of Truth for Versioning**
> The canonical source of truth for the application version is `package.json`. The System Health dashboard and API endpoints read directly from this source. This README serves as a version-agnostic documentation router.

To ensure developers and administrators are referring to the correct architectural specifications, ISCMS documentation is strictly versioned. 

Please select the documentation corresponding to the release you are currently deploying or developing against.

### Current Release

* **[Version 0.2.0 (Active)](./README-v0.2.0.md)** — _Current canonical documentation detailing the active architecture, Multi-Provider Notification schemas, Bulk Import enhancements, and Resilient Document Loading strategies._

### Historical Snapshots

* **[Version 0.1.0 (Deprecated)](./README-v0.1.0.md)** — _Preserved snapshot of the initial release architecture._

---

## Deployment & Getting Started

For full deployment instructions, testing protocols, and architectural documentation, please refer to the [Current Release Documentation](./README-v0.2.0.md).

### Quick Start (Local Development)

```bash
# 1. Clone and Install
git clone https://github.com/saarthvadalia26/International-Student-Compliance-Management-System.git
cd International-Student-Compliance-Management-System
npm install

# 2. Configure Environment (.env.local)
cp .env.example .env.local

# 3. Start Development Server
npm run dev
```

---

## Ownership & Licensing
ISCMS is proprietary software developed for internal institutional use.
Unauthorized reproduction, distribution, or public fork creation is prohibited without explicit permission.

© 2026. All rights reserved.
