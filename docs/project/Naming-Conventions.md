# Naming Conventions

- **Status**: Approved
- **Owner**: QA Lead
- **Purpose**: Define strict spelling, casing, and folder nomenclature guidelines across all layers of ISCMS.
- **Scope**: Applies to all filenames, code variables, functions, components, and database objects.
- **Dependencies**: DDS, Coding Standards
- **Related Documents**: [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md), [Database-Design-Specification.md](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/database/Database-Design-Specification.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This document regulates directory layouts and code variables naming patterns to maintain consistency.

## Detailed Guidance
*   **Casing Paradigms**:
    *   **Folders**: lower-case-kebab (e.g. `src/app/(app)/students`).
    *   **Component Files**: lower-case-kebab (e.g. `mobile-sidebar.tsx`).
    *   **React Components**: PascalCase (e.g. `StudentDetails`).
    *   **Variables & Functions**: camelCase (e.g. `calculateCompliance`).
    *   **Database Tables & Columns**: lower_snake_case (e.g. `reference_data`, `display_order`).
    *   **Database Constraints**: type_table_column (e.g. `fk_students_personal`).
    *   **Types & Interfaces**: PascalCase (e.g. `IComplianceEngine`).

## Best Practices
*   Do not abbreviate names unless it is a standard industry acronym (e.g. ID, URL, PII, RLS).
*   Prefix interface definitions with an 'I' to distinguish from implementation classes.

## Examples
*   File: `src/components/sidebar/mobile-sidebar.tsx`
*   Interface: `IValidationService`
*   Database Table: `student_academic`
*   Constraint: `chk_current_semester`

## Future Updates
*   Automate naming standards checking within standard lint rules.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
