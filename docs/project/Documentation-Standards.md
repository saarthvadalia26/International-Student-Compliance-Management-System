# Documentation Standards

- **Status**: Approved
- **Owner**: QA Lead
- **Purpose**: Establish documentation conventions, folder structures, and update policies.
- **Scope**: Applies to all markdown specifications, API docs, and database schematics.
- **Dependencies**: DDS, project wiki templates
- **Related Documents**: [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md), [Decision-Making-Process](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Decision-Making-Process.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This standard keeps documentation synchronized with source implementation, preventing stale specifications.

## Detailed Guidance
*   **Documentation Rules**:
    *   **Standard Headers**: All docs must contain a standardized template block (Title, Status, Owner, Purpose, Revision History).
    *   **File Linking**: Reference related specifications using clickable absolute file paths.
    *   **Documentation Updates**: Any pull request changing database schemas or business API routes must include documentation updates before approval.
    *   **No Placeholders**: Writing 'TODO' or 'lorem ipsum' is blocked. Mark planned items as 'Planned' instead.

## Best Practices
*   Review documentation changes during pull request checks.
*   Write clear document titles that match their file names.

## Examples
*   Link formatting: `[DDS](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/database/Database-Design-Specification.md)`

## Future Updates
*   Automate verification checks to find broken documentation links.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
