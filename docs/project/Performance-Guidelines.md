# Performance Guidelines

- **Status**: Approved
- **Owner**: Lead Architect
- **Purpose**: Establish efficiency targets, query optimizations, and database scaling rules.
- **Scope**: Applies to database indexing, Next.js page generation, and API responses.
- **Dependencies**: Supabase client APIs, Turbopack configs
- **Related Documents**: [Database-Design-Specification.md](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/database/Database-Design-Specification.md), [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This guide outlines standards to maintain constant low page latency and optimal resource usage.

## Detailed Guidance
*   **Performance Guidelines**:
    *   **Query Optimization**: Ensure all common filters (e.g. `deleted_at`, `expiry_date`) are supported by B-Tree indexing.
    *   **Avoid Sequential Scans**: Query plans must leverage index scans for O(log N) operations.
    *   **UI Caching & Pagination**: Paginate student directory records. Fetch only required fields. Cache static lists (like schools, programs) at the client level.
    *   **Lazy Loading**: Split Next.js bundles. Lazy load heavy layout component modules (like document viewers).

## Best Practices
*   Run EXPLAIN ANALYZE on complex joins during database schema testing.
*   Optimize assets (e.g. compress icons, minimize JS dependencies).

## Examples
*   Applying composite index: `CREATE INDEX ON notifications(status, next_retry_at) WHERE status = 'queued';`

## Future Updates
*   Set up monitoring tools to track database query times in real-time.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
