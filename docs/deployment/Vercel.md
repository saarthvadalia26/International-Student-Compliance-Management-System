# Vercel Deployment Architecture & Release Strategy

- **Status**: Approved & Active
- **Release Baseline**: v0.2.0
- **Platform**: Vercel Serverless Edge Platform (Next.js 16.2.x Turbopack)
- **Production Branch**: `main`

---

## 1. Branch Targeting & Deployment Environments

Vercel Git integration maps branches to deployment targets:

| Branch / Action | Vercel Environment | Domain Assignment | Purpose |
| :--- | :--- | :--- | :--- |
| `main` (push/merge) | **Production** | Canonical Production Domain (e.g. `https://iscms-web.vercel.app`) | Live production release for staff and students. |
| `develop/*` (push/PR) | **Preview** | Branch-specific URL (e.g. `https://iscms-git-develop-v020-*.vercel.app`) | Integration testing, stakeholder review, QA verification. |
| `feature/*` (push/PR) | **Preview** | Ephemeral PR / branch URL | Individual feature testing. |
| Manual CLI `vercel deploy` | **Preview** | Ephemeral preview URL | Ad-hoc CLI inspection. |
| Manual CLI `vercel deploy --prod` | **Production** | Canonical Production Domain | Emergency hotfix or manual production promotion. |

---

## 2. Root Cause of Previous Preview Deployments

### Issue Analysis
During the development of `v0.2.0`, all commits and pushes were made to the branch `develop/v0.2.0`.
Because Vercel is configured with `main` as the designated **Production Branch**, every push to `develop/v0.2.0` automatically produced a **Preview Deployment**.

### Release Workflow
To deploy a new version (e.g. `v0.2.0`, `v0.3.0`, `v0.4.0`) to Production:
1. Complete and validate all features on the release/development branch (`develop/v0.X.0`).
2. Run all lint, typecheck, unit test, and build suites.
3. Merge `develop/v0.X.0` into `main`.
4. Tag the commit with the semantic release tag (e.g. `git tag -a v0.2.0 -m "Release v0.2.0"`).
5. Push `main` and tags to remote (`git push origin main --tags`).
6. Vercel automatically detects the push to `main` and initiates a **Production Deployment** with zero manual promotion needed.

---

## 3. Canonical Environment Variables Audit

The following variables must be configured in Vercel Project Settings (`Settings -> Environment Variables`):

| Variable | Environment | Scope | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Dev, Preview, Prod | Client/Server | REST API endpoint of the Supabase project instance. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dev, Preview, Prod | Client/Server | Public anonymous key subject to Row Level Security. |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev, Preview, Prod | Server Only | Administrative service key bypassing RLS. |
| `SUPABASE_JWT_SECRET` | Dev, Preview, Prod | Server Only | Signing secret for OTP tokens and secure links. |
| `STORAGE_PROVIDER` | Dev, Preview, Prod | Server Only | `cloudflare-r2` or `supabase`. |
| `R2_ACCOUNT_ID` | Dev, Preview, Prod | Server Only | Cloudflare R2 Account Identifier. |
| `R2_ACCESS_KEY_ID` | Dev, Preview, Prod | Server Only | Cloudflare R2 Access Key. |
| `R2_SECRET_ACCESS_KEY` | Dev, Preview, Prod | Server Only | Cloudflare R2 Secret Access Key. |
| `R2_BUCKET_NAME` | Dev, Preview, Prod | Server Only | Target bucket (e.g. `iscms-documents`). |
| `R2_ENDPOINT` | Dev, Preview, Prod | Server Only | S3-compatible R2 endpoint. |
| `NEXT_PUBLIC_APP_URL` | Optional (Prod/Preview) | Client/Server | Optional custom domain override. If unset, automatically resolves via `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` / dynamic request headers. |

> [!CAUTION]
> **No environment variable in Production or Preview must ever reference `localhost` or `127.0.0.1`.**
