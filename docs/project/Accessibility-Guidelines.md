# Accessibility Guidelines

- **Status**: Approved
- **Owner**: Lead Frontend Engineer
- **Purpose**: Define UI guidelines matching WCAG 2.1 AA specifications to support accessibility.
- **Scope**: Applies to all presentation elements, routes, and layout structures inside the src/ folder.
- **Dependencies**: Base UI primitives, tailwind focus tokens
- **Related Documents**: [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This document sets styling conventions to ensure accessibility across keyboard, contrast, and screen readers.

## Detailed Guidance
*   **Accessibility Standards**:
    *   **Keyboard Navigation**: All action features (links, buttons, dialog close triggers) must support keyboard access (`Tab`, `Enter`, `Space`).
    *   **Focus Ring Indicator**: Never hide focus rings. Use Tailwind styling for focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).
    *   **Contrast Index**: Text-to-background contrast ratio must be at least 4.5:1 for standard text, 3:1 for large text.
    *   **ARIA Landmarks**: Utilize semantic tags (`<main>`, `<nav>`, `<aside>`). Assign `aria-invalid` and describe validation states using screen-friendly elements.

## Best Practices
*   Always provide alternative descriptions for interactive elements without visible text.
*   Ensure modal dialog components trap keyboard focus correctly.

## Examples
```tsx
// Good: Clear label, focus state, and semantic element
<Button 
  variant="ghost" 
  size="icon" 
  className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
  aria-label="Close dialog window"
>
  <XIcon className="h-4 w-4" />
</Button>
```

## Future Updates
*   Run automatic accessibility audits (Lighthouse / axe-core) in development pipelines.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
