# SRE Monitoring Implementation Guide

- **Status**: Completed
- **Target**: Internal Developers

## Implementing Structured Logging
Never use `console.log()` directly for sensitive operations. Import the `logger` service and pass structured payloads:

```typescript
import { logger } from "@/lib/logger";

logger.info("Student profile updated", {
  userId: session.user.id,
  studentId: targetStudent.id,
  route: "/api/students/update"
});
```

This enforces correlation IDs and auto-routes `error` logs to Sentry.
