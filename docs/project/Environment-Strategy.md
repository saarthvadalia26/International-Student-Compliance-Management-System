# Environment Strategy

- **Status**: Approved
- **Owner**: DevOps Engineer
- **Purpose**: Establish environment structures, routing scopes, and deployment lifecycles.
- **Scope**: Applies to local dev, preview staging, and production hosting sites.
- **Dependencies**: Vercel, Supabase projects configuration
- **Related Documents**: [Configuration-Management](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Configuration-Management.md), [Release-Management](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Release-Management.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This document sets standard environments config, guaranteeing staging isolation and deployment safety.

## Detailed Guidance
*   **Environment Inventory**:
    *   **Local Development**: Configured on local computers using mock data and local database instances.
    *   **Preview Staging**: Automated PR-based test environment verifying Next.js page generation and database migrations.
    *   **Production**: Secure, optimized site serving real client compliance audits.
*   **Deployment Pipeline**: Updates transition step-by-step from Local -> Preview -> Production. Direct deployment to production is blocked.

## Best Practices
*   Ensure database migrations run successfully on staging before deployment to production.
*   Run automated integration tests on preview environments.

## Examples
*   Local environment connects to localhost database port 54322.
*   Production connects to the main Supabase cluster via SSL only.

## Future Updates
*   Automate the creation of environment preview branches.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
