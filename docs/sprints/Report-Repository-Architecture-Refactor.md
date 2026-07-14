# Report Repository Architecture Refactor

This document outlines the architectural refactoring of PostgREST relationship traversals inside `SupabaseReportRepository`. The refactor standardizes on `students` as the root relationship to eliminate invalid sibling-to-sibling embedded queries.

---

## 1. Root Cause Analysis

In the previous implementation, database queries for reports attempted to load sibling tables directly by nesting them inside a `student_snapshot` SELECT parameter string:

```
student_snapshot
 └── student_personal (INVALID EMBEDDED RELATIONSHIP)
```

Because sibling tables do not contain direct foreign key constraints between one another (they only share a relationship through their parent `students.id` reference), Supabase's PostgREST layer fails at runtime with the following schema error:

```
Could not find a relationship between 'student_snapshot' and 'student_personal' in the schema cache.
```

---

## 2. Refactored Query Traversals

To implement standard, valid relationship traversals without creating artificial database relationships, we refactored every query to start at the correct logical root table.

### Previous Relationship Graph

```
[ student_snapshot ] ─── (Direct Sibling Join - Error) ───► [ student_personal ]
```

### New Canonical Relationship Graph

```
             ┌────────────── [ students ] (Root Query Entity) ──────────────┐
             │                              │                               │
             ▼                              ▼                               ▼
  [ student_snapshot ]             [ student_personal ]             [ student_contact ]
```

Every nested query now runs downstream from parent to child:
1. **`getStudentReport`**: Rooted on `students`. Selects `student_snapshot`, `student_personal`, `student_academic`, and `student_contact` as inner/left joins.
2. **`getEfrroReport`**: Rooted on `students`. Selects `student_snapshot` (for eFRRO status and expiry dates), `student_personal` (for student name), and `student_contact`.
3. **`getNotificationReport`**: Rooted on `notifications`. Resolves the student's name by nesting `student_personal` inside the `students` inner-join:
   `student:students!inner(registration_number, student_personal!inner(full_name))`

---

## 3. Reusable Select Fragments

To reduce duplicate query string declarations and enforce architectural standardization, we introduced the following select constants:

```typescript
const STUDENT_FIELDS = `id, registration_number, status`;
const SNAPSHOT_FIELDS = `student_snapshot!inner(compliance_status, passport_number, visa_number, efrro_number)`;
const EFRRO_SNAPSHOT_FIELDS = `student_snapshot!inner(efrro_status, efrro_expiry, efrro_number, days_until_efrro_expiry)`;
const PERSONAL_FIELDS = `student_personal!inner(full_name, nationality_code, gender)`;
const ACADEMIC_FIELDS = `student_academic(program_code, expected_graduation)`;
const CONTACT_FIELDS = `student_contact(email, phone_home, phone_local)`;
```

---

## 4. Mapping & Null Safety Hardening

We updated `ReportMapper` in `src/domain/reports/mappers/index.ts` to implement robust validation blocks before reading properties. Every mapper returns a safe, initialized default object if a row or nested object is null or undefined, eliminating unexpected runtime crashes during data mapping.

---

## 5. Verification Results

We verified the codebase against all quality metrics:

*   **Static analysis (`eslint`)**: **Passed with 0 errors/warnings**.
*   **TypeScript check (`tsc --noEmit`)**: **Passed with 0 errors**.
*   **Production build compilation (`next build`)**: **Passed successfully** (Compiled successfully in 15.9s).
