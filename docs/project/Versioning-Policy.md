# Versioning Policy

- **Status**: Approved
- **Owner**: Release Manager
- **Purpose**: Establish version standardizations based on Semantic Versioning (SemVer) for the ISCMS platform.
- **Scope**: Applies to all system packages, tag releases, and schema updates.
- **Dependencies**: SemVer 2.0.0 rules
- **Related Documents**: [Release-Management](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Release-Management.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This policy guarantees that version metrics represent breaking changes, standard releases, or patch bugfixes.

## Detailed Guidance
*   **SemVer Format**: `MAJOR.MINOR.PATCH`
    *   `MAJOR`: Incremented for breaking API changes, database schema redesigns, or structural routing modifications.
    *   `MINOR`: Incremented for new compliant features, additional lookup categories, or services interfaces.
    *   `PATCH`: Incremented for bug fixes, lint adjustments, or typos.
*   **Pre-Release Tagging**:
    *   Use `-rc.N` suffix for Release Candidates (e.g. `1.0.0-rc.1`) during integration testing steps.

## Best Practices
*   Always verify DB migrations compatibility before incrementing MAJOR version.
*   Tag commits on main branch with the exact version code.

## Examples
*   `1.0.0`: Production launch.
*   `1.1.0`: Minor feature update (e.g. adding eFRRO check filter).
*   `1.1.1`: Fast patch release (fixing UI dropdown focus).

## Future Updates
*   Automate package.json version updates within Github deployment workflows.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
