# Security Coding Guidelines

- **Status**: Approved
- **Owner**: Security Lead
- **Purpose**: Define development procedures to protect system databases and client interfaces.
- **Scope**: Applies to all application integrations, database schemas, and edge runtime instances.
- **Dependencies**: Supabase Auth, Row Level Security policies
- **Related Documents**: [Database-Design-Specification.md](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/database/Database-Design-Specification.md), [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
These guidelines implement robust code policies ensuring data isolation, authorization controls, and secure uploads.

## Detailed Guidance
*   **Security Principles**:
    *   **Input Sanitization**: Always validate inputs against Zod schema ranges.
    *   **SQL Injection Guard**: Never construct raw SQL strings using variables. Use parameterized queries or Supabase client RPC bindings.
    *   **Secrets Isolation**: Never check credentials, tokens, or private keys into source repository files. Access variables via `process.env` configurations.
    *   **File Upload Validation**: Validate file extensions (PDF only), size limits (Max 2MB), and scan headers before saving to private buckets.
    *   **PII Encryption**: Store contact details behind restricted access views and secure via Row Level Security (RLS) tables.

## Best Practices
*   Always configure RLS policies on new database tables immediately after schema creation.
*   Ensure that all document access is authenticated using short-lived signed URLs.

## Examples
```sql
-- Good: Enable RLS and define restricted select access
ALTER TABLE public.passport_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_admin_passports ON public.passport_versions
  FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'administrator');
```

## Future Updates
*   Schedule automated dependency vulnerability checks via Snyk or Github Actions.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
