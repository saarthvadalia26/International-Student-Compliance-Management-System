# Debugging Guide

- **Status**: Approved
- **Owner**: Lead Backend Engineer
- **Purpose**: Outline troubleshooting playbooks for debugging Next.js router, Supabase migrations, and local Edge functions.
- **Scope**: Applied to diagnosing errors during development.
- **Dependencies**: Docker logs, browser DevTools, database logs
- **Related Documents**: [Local-Setup](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/development/Local-Setup.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This guide helps developers isolate issues across frontend rendering, API calls, and local Postgres triggers.

## Detailed Guidance
*   **Next.js Debugging**:
    *   Use browser DevTools for Client Components state issues.
    *   Inspect server terminal output for Server Component data-fetching logs.
*   **Supabase / Database Debugging**:
    *   Check local container logs via `docker logs supabase-db`.
    *   Run `supabase db migrations list` to inspect migration states.
*   **Edge Functions Diagnostics**:
    *   Inspect function logs by running `supabase functions serve` locally.

## Best Practices
*   Verify database table RLS policies if query calls return empty arrays.
*   Clear browser storage and local tokens if auth redirects fail.

## Examples
```bash
# Print real-time container log traces
docker logs -f supabase-db
# Verify local database migration status
supabase db status
```

## Future Updates
*   Add centralized debugger configurations in vscode settings.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Release Manager | Initial Version Release |
