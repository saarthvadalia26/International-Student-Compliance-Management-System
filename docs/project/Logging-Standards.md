# Logging Standards

- **Status**: Approved
- **Owner**: Lead Backend Engineer
- **Purpose**: Define structured logging configurations, log level parameters, and PII protection standardizations.
- **Scope**: Applies to all application logs, database audit logs, and edge logging services.
- **Dependencies**: ConsoleLoggingService, activity_log tables
- **Related Documents**: [Coding-Standards](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Coding-Standards.md), [Security-Coding-Guidelines](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/project/Security-Coding-Guidelines.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This document defines a logging taxonomy to generate structural JSON traces without exposing private user coordinates.

## Detailed Guidance
*   **Log Levels**:
    *   `ERROR`: High system failure (database crashes, integration provider downtime). Requires immediate alert trigger.
    *   `WARN`: Unexpected transaction issues (retry triggers, near-expiry document alerts).
    *   `INFO`: Audit actions and core lifecycles (student created, document verified).
    *   `DEBUG`: Fine-grain execution traces for development.
*   **Structured Format**: All outputs must be written as structured JSON.
*   **PII & Secrets Scrubbing**: Never log raw student emails, phone numbers, passport numbers, or auth tokens. Use UUID references and hash identifiers.

## Best Practices
*   Use correlation IDs across async workers to trace request journeys.
*   Audit log records must match the database `activity_log` schema naming.

## Examples
```json
{
  "level": "INFO",
  "timestamp": "2026-07-07T15:00:00Z",
  "correlationId": "req-12345",
  "actorId": "usr_987",
  "action": "INSERT",
  "eventName": "StudentCreated",
  "tableName": "students",
  "rowId": "student-uuid-999"
}
```

## Future Updates
*   Deploy Logflare or Datadog integrations to ingest structured JSON logs.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Engineering Governance Board | Initial Version Release |
