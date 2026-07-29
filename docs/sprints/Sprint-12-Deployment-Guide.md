# Sprint 12: Vercel Deployment Guide

- **Status**: Completed
- **Role**: DevOps

## CLI Deployment Instructions
If you are deploying manually without GitHub Actions:
1. Open PowerShell / Command Prompt.
2. Run `npm install -g vercel`.
3. Login via `vercel login`.
4. Navigate to the root directory.
5. Execute `vercel --prod`.

Ensure all production environment variables (Sentry DSN, Supabase Keys) are explicitly set in the Vercel Dashboard Settings under "Environment Variables" before running the production trigger.
