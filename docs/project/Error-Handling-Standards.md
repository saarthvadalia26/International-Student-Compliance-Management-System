# Error Handling Standards

- **Status**: Approved
- **Owner**: Lead Backend Engineer
- **Purpose**: Establish error catching guidelines, bubble behaviors, and user alert standards.
- **Scope**: Applies to Next.js Client, Edge, and Database migration layers.
- **Dependencies**: Zod validation, error.tsx templates
- **Related Documents**: [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md), [Logging-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Logging-Standards.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This framework ensures that failures fail-safely, log audit issues, and present user-friendly alerts.

## Detailed Guidance
*   **Error Layering Guidelines**:
    *   **Frontend**: Wrap components in Error Boundaries. Use toast layouts (`sonner`) for non-blocking alerts. Present localized Next.js `error.tsx` page views for router crashes.
    *   **Backend**: Use try/catch blocks. Cast custom API exceptions including descriptive status codes. Never leak raw SQL engine traces.
    *   **Database**: Check constraints and triggers fail transactions, raising SQL exceptions caught by client libraries.
*   **Retry Logic**: Async worker integrations (e.g. Resend) must execute an exponential backoff retry configuration up to 3 times before entering a failed queue.

## Best Practices
*   Map server error types to user-friendly messages rather than printing stack traces.
*   Ensure that all validation exceptions indicate the specific fields that failed Zod parsing.

## Examples
```typescript
try {
  const result = ZodValidationService.validateStudent(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new ValidationError("Invalid student payload details.", error.errors);
  }
}
```

## Future Updates
*   Incorporate telemetry trackers to monitor exception rates in production environments.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
