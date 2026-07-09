# Development Workflow

- **Status**: Approved
- **Owner**: Release Manager
- **Purpose**: Detail the 13 sequential workflow phases enforcing the Local Development First model.
- **Scope**: Applies to all code tasks, feature integrations, and releases.
- **Dependencies**: Git, Next.js build engines, Supabase migrations
- **Related Documents**: [Local-Setup](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/development/Local-Setup.md), [Developer-Checklist](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/development/Developer-Checklist.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This document guarantees that all engineering follows a strict Local-First model, verifying safety before pushes.

## Detailed Guidance
The standard workflow consists of the following 13 steps:

1.  **Clone Repository**: Clone the project repository from GitHub.
    *   `git clone <url>`
2.  **Install Dependencies**: Install the locked project packages.
    *   `npm ci`
3.  **Configure Environment Variables**: Set up local variable parameters.
    *   Copy `.env.example` to `.env.local`.
4.  **Start Local Supabase**: Initialize the local Supabase emulator stack.
    *   `supabase start`
5.  **Apply Database Migrations**: Migrate changes onto the local Postgres instance.
    *   `supabase db reset`
6.  **Run Development Server**: Start the local Next.js development server.
    *   `npm run dev`
7.  **Run Lint**: Verify code style rules locally.
    *   `npm run lint`
8.  **Run Type Checking**: Validate TypeScript type safety.
    *   `node node_modules/typescript/bin/tsc --noEmit`
9.  **Run Production Build**: Test local Next.js compilation.
    *   `npm run build`
10. **Commit Changes**: Check in changes locally following commit rules.
    *   `git commit -m "feat(auth): describe change"`
11. **Push to GitHub**: Push feature branches for review.
    *   `git push origin feature/name`
12. **Deploy to Preview**: GitHub Actions triggers preview site builds.
    *   Automated Vercel preview deployment.
13. **Deploy to Production**: Launch updates to production targets.
    *   Promote preview release builds after review.

## Best Practices
*   Never skip local linting and type-checking before committing.
*   Always reset the local database schema to confirm migrations apply cleanly.

## Examples
```bash
# Typical daily cycle:
supabase start
npm run dev
# Make edits...
npm run lint
node node_modules/typescript/bin/tsc --noEmit
git commit -am "fix(compliance): adjust threshold timeline"
git push origin feature/compliance-fixes
```

## Future Updates
*   Integrate auto-checking pre-commit hooks using husky.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Release Manager | Initial Version Release |
