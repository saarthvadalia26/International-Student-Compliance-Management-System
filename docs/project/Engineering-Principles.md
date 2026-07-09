# Engineering Principles

- **Status**: Approved
- **Owner**: Lead Architect
- **Purpose**: Establish core philosophies and architectural values guiding the engineering lifecycle.
- **Scope**: Applies to all architectural designs, code decisions, and database schemas.
- **Dependencies**: Project Constitution
- **Related Documents**: [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This handbook defines structural guidelines to achieve high simplicity, decoupling, type safety, and security.

## Detailed Guidance
*   **Core Principles**:
    *   **Simplicity**: Avoid complex over-engineering. Write code that is easy to read, refactor, and audit.
    *   **Don't Repeat Yourself (DRY)**: Abstract common tasks to reusable utility layers, but avoid wrong abstractions.
    *   **Composition over Inheritance**: Build complex behaviors by composing small, modular functions/components.
    *   **Database-First Validation**: Database constraints are the final boundary of truth. Keep validation rules synchronized between database check constraints and Zod schema layers.
    *   **Security by Default**: Enforce RLS rules, bound parameters, PII encryption, and least privilege database configurations.

## Best Practices
*   Write SQL schemas before writing backend models.
*   Separate presentation logic from business computations.

## Examples
*   Good composition: Structuring compliance engines out of independent validator functions (passport, visa, eFRRO) rather than building a bloated, inherited Class hierarchy.

## Future Updates
*   Conduct monthly architecture review sessions to align implementations with these principles.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
