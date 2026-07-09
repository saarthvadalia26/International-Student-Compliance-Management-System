# Sprint 05 Architecture Revision Summary (V2)

- **Status**: Completed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Business Rule Modifications

To align implementation with confirmed NFSU administrative policies, the compliance alerting workflow has been refined as follows:
*   **eFRRO Expirations**: Automated reminders, notification queue logging, and scheduler cycles are triggered **exclusively** by eFRRO document validities.
*   **Passport and Visa Expirations**: Passport and Visa remain active tracking components of the student profile and the compliance dashboard. However, their expiration does **NOT** schedule alert items or execute notification delivery loops.

---

## 2. Modified Sections Summary

The following design plans were modified to reflect these business rules:

| Document | Section / Update Details |
| :--- | :--- |
| **[Sprint-05-Architecture.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-05-Architecture.md)** | Updated *Section 2.C* to detail the isolated eFRRO alert pipeline, ensuring passport and visa validities remain compliance-only metadata points. |
| **[Sprint-05-Database-Queries.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-05-Database-Queries.md)** | Added the `idx_notifications_efrro` partial index layout to optimize eFRRO query lookups and updated notification query structures. |
| **[Sprint-05-Implementation-Plan.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-05-Implementation-Plan.md)** | Standardized integration verification phases to focus verification testing on the eFRRO-only reminder pipeline. |
| **[Sprint-05-Task-Breakdown.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-05-Task-Breakdown.md)** | Updated backend, database, and QA checklist logs to verify eFRRO alerting bounds during development. |
| **[Sprint-05-Risk-Assessment.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-05-Risk-Assessment.md)** | Added risk items addressing rule enforcement safety parameters to prevent accidental Passport/Visa scheduling logs. |

---

## 3. Core Engine Scope

*   **Notification Engine Scope**:
    *   Targets only `document_type = 'efrro'`.
    *   Excludes passport/visa types from scheduler queries, template selections, and provider client dispatches.
*   **Reporting & Analytics Scope**:
    *   Passport and Visa remain fully visible on student dashboard profiles, statistics summaries, and export logs, ensuring overall compliance percentages remain accurate.

---

## 4. Future Extensibility Notes

While current rules limit notifications to eFRRO documents, the repository structures and database schemas remain fully extensible:
*   The database `notifications` and `reminder_rules` tables retain their `document_type` column matching check constraints.
*   If passport or visa alerts are requested in a future sprint, they can be enabled simply by adding active entries to the `reminder_rules` database table without modifying codebase repository models or query schemas.
