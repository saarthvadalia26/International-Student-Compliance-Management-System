# Sprint 06 - Task Breakdown Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Task Assignments & Status

| Task ID | Component / Task Name | Assigned Role | Completion Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **TS6-01** | Database schema & migrations | Database Architect | **100% Completed** | Deploy migration `009_student_portal.sql` creating token checks, audit logging, and activity tables. |
| **TS6-02** | Secure upload business logic | Backend Engineer | **100% Completed** | Implement file size checks, MIME validators, checksum comparisons, and storage writes in Domain Services. |
| **TS6-03** | Auth protection layout guards | Backend Engineer | **100% Completed** | Build Next.js app router guards verifying student-metadata roles in token entries and navigation layouts. |
| **TS6-04** | Passwordless login UI form | Frontend Engineer | **100% Completed** | Develop `/student/login` magic link inputs, error messages, and async state indicators. |
| **TS6-05** | Student Dashboard UI widgets | Frontend Engineer | **100% Completed** | Design welcome card summaries, countdown limits, upload buttons, and historical tables. |
| **TS6-06** | Profile coordinates edit form | Frontend Engineer | **100% Completed** | Enable profile editing specifically for phone, email, and preferred language, keeping other properties read-only. |
| **TS6-07** | Lint, build, and QA audit | QA Engineer | **100% Completed** | Run ESDoc validation scripts, checking imports, code compiles, and RLS integrity rules. |
