# AI Prompting Guidelines

- **Status**: Approved
- **Owner**: AI Governance Lead
- **Purpose**: Define guidelines and best practices for collaborating with AI engineering agents.
- **Scope**: Applies to all prompt queries, workspace tasks, and agent coordination.
- **Dependencies**: Agent operating models, prompt templates
- **Related Documents**: [Agent-Operating-Manual](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Agent-Operating-Manual.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This guide outlines prompt templates and context boundaries to ensure consistent agent output quality.

## Detailed Guidance
*   **Prompt Writing Principles**:
    *   Provide clear context, goals, constraints, and files list in all queries.
    *   Specify output formats (such as code snippets, tables, or markdown).
    *   Reference target database schemas and component files explicitly.
*   **Context Boundaries**: Keep prompts focused on single-issue tasks to prevent context drift and model hallucinations.
*   **Escalation Rules**: AI agents must pause and request user confirmation if task requirements conflict with existing specifications.

## Best Practices
*   Clean up prompt queries before execution.
*   Verify AI-generated code against project style guidelines.

## Examples
```markdown
# Good prompt template:
Fix the select onValueChange handler in src/app/(app)/students/page.tsx.
Ensure it handles null values to prevent TypeScript compile errors.
```

## Future Updates
*   Keep prompting guidelines up to date with core model updates.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
