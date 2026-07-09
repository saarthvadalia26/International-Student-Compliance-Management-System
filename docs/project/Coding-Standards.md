# Coding Standards

- **Status**: Approved
- **Owner**: Lead Frontend/Backend Engineers
- **Purpose**: Define development guidelines and style standards across TypeScript, React, and Next.js layers.
- **Scope**: Applied to all source code files inside the src/ folder.
- **Dependencies**: eslint, typescript, prettier
- **Related Documents**: [Definition-of-Done](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Definition-of-Done.md), [Naming-Conventions](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Naming-Conventions.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This document sets strict code formatting, TypeScript configurations, and React component paradigms for the ISCMS platform to achieve modularity, type safety, and clean folder layouts.

## Detailed Guidance
*   **TypeScript Conventions**:
    *   Set strict type configurations (`"strict": true`). Avoid `any` at all boundaries. Prefer `unknown` when data structure is uncertain.
    *   Explicitly declare function return types.
    *   Utilize interfaces for public contracts and type aliases for simple structure shapes.
*   **React & Next.js Conventions**:
    *   Next.js 16 App Router standard: Use Server Components by default. Label Client Components with `"use client"` at the file top.
    *   Use functional components. Hook actions must follow standard React lifecycles.
    *   Utilize Base UI primitives via the `render` prop to maintain clean HTML outputs without violating type rules.
*   **Import Ordering**:
    *   Group 1: React, Next.js, and core third-party packages.
    *   Group 2: Workspace components, styles, configurations, and services using `@/` paths.
    *   Group 3: Relative path imports.

## Best Practices
*   Keep components small and focused on a single responsibility.
*   Extract hook logic out of components when state management is complex.
*   Do not write inline business logic inside page routing templates.

## Examples
```typescript
// Good: Clear type declaration and import order
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = "Loading..." }: SpinnerProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
```

## Future Updates
*   Integrate auto-formatting checks directly in staging commit pipelines.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
