# Document Cleanup Architecture Walkthrough

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Architectural Components

The cleanup execution is structured cleanly:

```
[Cron Scheduler Job (Daily)]
            │
            ▼ (Triggers)
     [RetentionService]
            │
            ├─► getRetentionPolicies()
            │
            ├─► getExpiredDocumentVersions()
            │   (Filters out verification_status = 'pending' and file_path = '[PURGED]')
            │
            ▼
   [Execute Live Purge]
            │
            ├─► supabase.storage.remove([file_path]) (Delete binary)
            │
            ├─► deleteDocumentVersionRow() (Updates file_path = '[PURGED]' in DB)
            │
            └─► logRetentionActivity() (Inserts audit trail)
```

---

## 2. Decoupled Interface Contract

*   **`SupabaseRetentionRepository.getExpiredDocumentVersions(...)`**: Executes an optimized query filtering out pending files and selecting versions older than `retentionPeriodDays + gracePeriodDays`.
*   **`SupabaseRetentionRepository.deleteDocumentVersionRow(...)`**: Instead of executing SQL hard deletions, it performs a secure SQL update changing `file_path` to `"[PURGED]"`. This ensures all metadata row objects remain permanently preserved in DB tables.
