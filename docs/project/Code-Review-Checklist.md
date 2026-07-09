# Code Review Checklist

- **Status**: Approved
- **Owner**: QA Lead
- **Purpose**: Define review criteria across database, backend, frontend, accessibility, and security domains.
- **Scope**: Applies to all incoming pull requests before branch integration.
- **Dependencies**: eslint, type checkers, standard templates
- **Related Documents**: [Definition-of-Done](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Definition-of-Done.md), [Agent-Operating-Manual](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Agent-Operating-Manual.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This checklist ensures that human operators and AI agents review code changes against strict consistency and quality criteria.

## Detailed Guidance
*   **Review Matrices**:
    *   **Database**: Verify check constraints, NOT NULL definitions, index usage, and migration sequence alignment.
    *   **Backend**: Verify Zod payload validation, explicit typing, unit test coverage, and console log pollution prevention.
    *   **Frontend**: Confirm Base UI render properties, responsive layouts, theme styling, and state changes within effects.
    *   **Security**: Ensure secrets are omitted, inputs are sanitized, SQL parameters are bound, and PII elements are safe.
    *   **Accessibility**: Confirm screen reader landmarks, keyboard focus, and contrast scores.

## Best Practices
*   Check for unused variables or imports during manual file scans.
*   Verify that any logic modification is mapped by corresponding test updates.

## Examples
*   "Does the database migration file name start with the next sequence number?" -> Checked.
*   "Are all raw data values sanitized by Zod schema parse?" -> Checked.

## Future Updates
*   Integrate review checklist validations directly into standard PR templates.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
