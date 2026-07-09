# Git Workflow

- **Status**: Approved
- **Owner**: Release Manager
- **Purpose**: Define workspace commit protocols, branch handling rules, and release/rollback procedures.
- **Scope**: Applies to all code contributions and branch lifecycle actions.
- **Dependencies**: git CLI, GitHub repositories config
- **Related Documents**: [Branching-Strategy](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Branching-Strategy.md), [Release-Management](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Release-Management.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This workflow regulates how engineers collaborate on code, manage branches, structure commits, and recover from failed deployments.

## Detailed Guidance
*   **Commit Message Convention**:
    *   Adopt Angular style: `<type>(<scope>): <subject>` (e.g. `feat(auth): add local storage session check`).
    *   Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
*   **Pull Request Protocol**:
    *   All PRs require passing lint, TypeScript, and build checks before merge review.
    *   Reviewers must verify RLS, constraints compliance, and documentation completeness.
*   **Rollback & Recovery**:
    *   On deployment failure: immediately revert the main branch head to the last verified release tag.
    *   Rollback migrations must be executed in reverse numerical order.

## Best Practices
*   Keep branch scopes narrow; avoid massive multi-issue pull requests.
*   Rebase develop before merging feature branches to keep commit logs flat.
*   Never rewrite Git history of the main or develop branches.

## Examples
```bash
# Good commit flow
git checkout -b feature/compliance-engine
git commit -m "feat(compliance): implement precedence of severity check"
git push origin feature/compliance-engine
```

## Future Updates
*   Automate release tag generation based on conventional commits logs.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
