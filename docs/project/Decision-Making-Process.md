# Decision Making Process

- **Status**: Approved
- **Owner**: Lead Architect
- **Purpose**: Establish protocols for proposing, reviewing, and approving architectural changes.
- **Scope**: Applies to database schemas, third-party integrations, and framework updates.
- **Dependencies**: ADR templates
- **Related Documents**: [Documentation-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Documentation-Standards.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This document sets a collaborative framework for architectural changes, documented via ADRs.

## Detailed Guidance
*   **Decision-Making Protocol**:
    *   **Proposing Changes**: Propose architectural changes via Request for Comments (RFC) documents.
    *   **Review Period**: RFCs are open for team review and feedback for 5 working days.
    *   **ADR Generation**: Record approved decisions in the `docs/architecture/` folder as ADR markdown files.
    *   **Adherence**: All engineering teams must adhere to approved ADR guidelines.

## Best Practices
*   Write detailed rationales and alternatives in all proposed RFCs.
*   Follow the standard naming convention for ADR files (e.g. `ADR-[Number]-[Name].md`).

## Examples
*   RFC-011 proposed to introduce database partition rules for audit logs.
*   Approved and recorded in: `docs/architecture/ADR-011-Partitioning.md`.

## Future Updates
*   Integrate ADR reviews into quarterly project planning.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
