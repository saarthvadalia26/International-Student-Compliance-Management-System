# Agent Operating Manual

- **Status**: Approved
- **Owner**: Lead Architect
- **Purpose**: Define responsibility grids, ownership limits, and coordination processes for AI engineering agents.
- **Scope**: Applies to all AI agents active during code execution.
- **Dependencies**: Custom agent prompts, workspace configs
- **Related Documents**: [Definition-of-Done](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Definition-of-Done.md), [Decision-Making-Process](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Decision-Making-Process.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This manual coordinates AI coding assistants to ensure structural alignment, database constraints, frontend components separation, and QA checklists.

## Detailed Guidance
*   **Agent Roles & Boundaries**:
    *   **Database Architect**: Owns PostgreSQL and Supabase schemas. Implements triggers, indexes, and constraints. Never alters frontend page routes or TS layouts.
    *   **Backend Engineer**: Owns API structure, Edge Functions, validation Zod structures. Never writes raw SQL.
    *   **Frontend Engineer**: Owns Next.js pages, Base UI layouts. Never configures SQL triggers or database schemas.
    *   **QA Engineer**: Reviews folder quality, naming standards, security issues. Generates verification audits. Never writes production implementations.
*   **Conflict Resolution & Escalations**:
    *   If an agent discovers an API mismatch, it must pause and request the human operator to resolve the boundary scope.
    *   Any change to the approved database architecture must follow the official decision-making RFC workflow.

## Best Practices
*   Always consult the corresponding role skill instructions before code adjustments.
*   Run validation compilers (lint, tsc) before presenting work for review.

## Examples
*   *Database Agent*: Edits `supabase/migrations/002_reference_data.sql`.
*   *Frontend Agent*: Edits `src/app/(app)/students/page.tsx`.
*   *QA Agent*: Creates `docs/project/Code-Review-Checklist.md`.

## Future Updates
*   Incorporate dynamic prompt context updates for role switches during agent coordination.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
