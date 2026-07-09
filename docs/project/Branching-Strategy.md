# Branching Strategy

- **Status**: Approved
- **Owner**: Release Manager
- **Purpose**: Define Git branching configurations, naming protocols, and branch merging lifecycle policies.
- **Scope**: Applies to code repository branch setup.
- **Dependencies**: git config
- **Related Documents**: [Git-Workflow](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Git-Workflow.md), [Versioning-Policy](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Versioning-Policy.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This strategy describes a git-flow-based branch layout, ensuring release isolation and production stability.

## Detailed Guidance
*   **Branch Inventory**:
    *   `main`: Houses production-ready code. Matches production releases.
    *   `develop`: Integration branch containing finished sprint updates.
    *   `feature/*`: Used for sprint tasks (e.g. `feature/visa-alerts`).
    *   `release/*`: Temporary branch for final testing/tagging before production launch.
    *   `hotfix/*`: Direct bugfix branch targeted to production main.
*   **Merge Policy**:
    *   Features must merge to develop via PR with squash merge.
    *   Develop merges to main via release branch and merge commit.

## Best Practices
*   Delete feature branches on GitHub immediately after merging.
*   Release branches must incorporate a minor version tag change.

## Examples
*   `feature/compliance-checks` -> Squashed to develop.
*   `hotfix/auth-expiry` -> Merged to main and develop.

## Future Updates
*   Apply GitHub branch protection rules to lock down develop and main branches.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
