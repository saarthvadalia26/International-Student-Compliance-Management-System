# Developer Checklist

- **Status**: Approved
- **Owner**: QA Lead
- **Purpose**: Provide a pre-commit and pre-push compliance checklist for engineers.
- **Scope**: Applies to code updates in all developer cycles.
- **Dependencies**: Coding Standards
- **Related Documents**: [Development-Workflow](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/development/Development-Workflow.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This checklist enforces that all developers verify code quality before commits and PR reviews.

## Detailed Guidance
*   **Pre-Commit Checklist**:
    *   [ ] I have verified code complies with the project style guidelines.
    *   [ ] I have verified code contains no unused imports or variables.
    *   [ ] I have verified lint checks pass successfully.
    *   [ ] I have verified type safety compiles with zero errors.
*   **Pre-Push / PR Checklist**:
    *   [ ] I have verified Next.js compiles production builds successfully.
    *   [ ] I have verified database migrations run without constraint violations.
    *   [ ] I have verified all secrets are omitted from committed code files.
    *   [ ] I have documented any new environment variables.

## Best Practices
*   Review changes via `git diff` before staging.
*   Check off each item systematically during development.

## Examples
*   Developer: "Checking off list for feature branch..."
    *   Lint passed? [x]
    *   Build passed? [x]
    *   Secrets checked? [x] -> Safe to push!

## Future Updates
*   Incorporate the checklist into git hooks.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Release Manager | Initial Version Release |
