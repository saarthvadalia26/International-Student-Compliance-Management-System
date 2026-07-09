# Sprint 05 - Database Queries Specification

- **Status**: Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. SQL Query Definitions

### A. General Metrics Calculations
Queries executed by the statistics service engine.

```sql
-- 1. Compliance Percentage Calculations
SELECT 
  ROUND(
    (COUNT(CASE WHEN passport_status = 'COMPLIANT' AND visa_status = 'COMPLIANT' AND efrro_status = 'COMPLIANT' THEN 1 END)::NUMERIC / 
     NULLIF(COUNT(*), 0)) * 100, 2
  ) as compliance_percentage,
  COUNT(*) as total_students
FROM public.student_snapshot;

-- 2. Average Document Verification Audit Time
SELECT 
  AVG(updated_at - created_at) as avg_verification_duration
FROM (
  SELECT updated_at, created_at FROM public.passport_versions WHERE verification_status = 'verified'
  UNION ALL
  SELECT updated_at, created_at FROM public.visa_versions WHERE verification_status = 'verified'
  UNION ALL
  SELECT updated_at, created_at FROM public.efrro_versions WHERE verification_status = 'verified'
) as all_verifications;
```

---

### B. Scalable Filtering & Search Query
Executes reports pagination and keyword search operations.

```sql
SELECT 
  s.id,
  sp.full_name,
  s.registration_number,
  snap.passport_status,
  snap.visa_status,
  snap.efrro_status,
  snap.days_until_expiry,
  sp.nationality_name,
  sp.program_name,
  sp.school
FROM public.students s
JOIN public.student_personal sp ON s.id = sp.student_id
JOIN public.student_snapshot snap ON s.id = snap.student_id
WHERE 
  -- Search Keyword matching index limits
  (sp.full_name ILIKE :searchQuery OR s.registration_number ILIKE :searchQuery)
  -- Reusable dynamic filters
  AND (:schoolFilter IS NULL OR sp.school = :schoolFilter)
  AND (:countryFilter IS NULL OR sp.nationality_name = :countryFilter)
  AND (:statusFilter IS NULL OR 
        (CASE 
           WHEN :statusFilter = 'expired' THEN snap.days_until_expiry <= 0
           WHEN :statusFilter = 'expiring_soon' THEN snap.days_until_expiry > 0 AND snap.days_until_expiry <= 30
           ELSE TRUE
         END))
ORDER BY sp.full_name ASC
LIMIT :limitOffset OFFSET :pageOffset;
```

---

## 2. Optimized Indexes Layout

To scale performance to 50,000+ students and prevent table scans:

```sql
-- Index student details for quick search lookup queries
CREATE INDEX IF NOT EXISTS idx_student_personal_search ON public.student_personal (full_name, school);

-- Index snapshot status and expiration days offsets
CREATE INDEX IF NOT EXISTS idx_student_snapshot_expiry ON public.student_snapshot (days_until_expiry, passport_status, visa_status, efrro_status);

-- Composite index to support sorting by registration and status
CREATE INDEX IF NOT EXISTS idx_students_reg_num ON public.students (registration_number);
```
