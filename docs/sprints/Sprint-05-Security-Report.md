# Sprint 05 - Security & Audit Report

This security report details the policies, constraints, implementation controls, and logging mechanisms deployed to protect Personally Identifiable Information (PII) of international students at the National Forensic Science University (NFSU).

---

## 1. Personally Identifiable Information (PII) Protection

International student registries contain sensitive documents (Passport, Visa, and eFRRO numbers). Under NFSU compliance policies, administrative screens must mask these fields by default.

### Default Masking Rule
*   Sensitives are transformed on the server before dispatch, or masked in the UI structure.
*   Formatting mask: `XXXX-XXXX-1234` (revealing only the last 4 characters).

---

## 2. Secure Administrative Unmasking Flow

When an authorized administrator needs to inspect a document number, they request it explicitly.

```
┌─────────────────┐        1. Request Unmask        ┌────────────────┐
│   Admin UI      ├────────────────────────────────>│ Server Action  │
│ (Audit Page Log)│                                 │ (unmask ID)    │
└────────▲────────┘                                 └───────┬────────┘
         │                                                  │
         │ 4. Unmasked PII                                  │ 2. Log Action
         │    Returned                                      ▼
┌────────┴────────┐                                 ┌────────────────┐
│   Rendered UI   │                                 │   Audit Log    │
│  (Session Only) │                                 │  (UNMASK_PII)  │
└─────────────────┘                                 └────────────────┘
```

*   **Logging Requirement**: Every unmasking trigger invokes `unmaskIdentifier` which inserts a security record containing the action (`UNMASK_PII`), the administrator's email, target student reference, and metadata (IP address, User Agent).

---

## 3. Security Audit Trail

All administrative database operations, configuration adjustments, exports, and PII views are stored in the `audit_log` system table.
*   **System Integrity**: The audit table has strict row insertion parameters. Records can only be written through backend actions.
*   **Traceability**: The `/reports/audit` subpage provides real-time access to audit logs, making it simple for the head security officer to verify system access patterns.
