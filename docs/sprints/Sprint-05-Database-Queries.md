# Sprint 05 - Database Queries Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. SQL Query Definitions

### A. Dashboard Metrics Queries
Aggregated query evaluations for dashboard widgets:

```sql
-- 1. General Compliance & Expirations (eFRRO Only Alerts)
SELECT
  -- Total registered international students
  COUNT(*) as total_students,
  -- Fully compliant counts
  COUNT(CASE WHEN passport_status = 'COMPLIANT' AND visa_status = 'COMPLIANT' AND efrro_status = 'COMPLIANT' THEN 1 END) as fully_compliant,
  -- eFRRO Expiring (30 Days)
  COUNT(CASE WHEN efrro_status = 'EXPIRING' AND days_until_efrro_expiry > 15 AND days_until_efrro_expiry <= 30 THEN 1 END) as efrro_expiring_30,
  -- eFRRO Expiring (15 Days)
  COUNT(CASE WHEN efrro_status = 'EXPIRING' AND days_until_efrro_expiry <= 15 THEN 1 END) as efrro_expiring_15,
  -- eFRRO Expired
  COUNT(CASE WHEN efrro_status = 'EXPIRED' THEN 1 END) as efrro_expired,
  -- Missing eFRRO
  COUNT(CASE WHEN efrro_status = 'MISSING' THEN 1 END) as missing_efrro
FROM public.student_snapshot;

-- 2. Daily Notification Activity Logs (eFRRO ONLY)
SELECT 
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_today,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_today
FROM public.notifications
WHERE 
  document_type = 'efrro'
  AND created_at >= CURRENT_DATE;
```

---

### B. Global Search & Decryption
Global query matching multiple document identifiers, optimized to run within sub-second thresholds:

```sql
SELECT 
  s.id,
  sp.full_name,
  s.registration_number,
  s.email,
  s.mobile_number,
  snap.passport_number,
  snap.visa_number,
  snap.efrro_number
FROM public.students s
JOIN public.student_personal sp ON s.id = sp.student_id
JOIN public.student_snapshot snap ON s.id = snap.student_id
WHERE 
  s.registration_number ILIKE :searchQuery
  OR sp.full_name ILIKE :searchQuery
  OR snap.passport_number ILIKE :searchQuery
  OR snap.visa_number ILIKE :searchQuery
  OR snap.efrro_number ILIKE :searchQuery
  OR s.email ILIKE :searchQuery
  OR s.mobile_number ILIKE :searchQuery
LIMIT 10;
```

---

## 2. Optimized Indexes Layout

To scale performance to 50,000+ students and prevent full table scans on search queries:

```sql
-- Search identifiers indices on students core table
CREATE INDEX IF NOT EXISTS idx_students_reg_num ON public.students (registration_number);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students (email);

-- Search identifiers indices on snapshot table
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshot_passport_num ON public.student_snapshot (passport_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshot_visa_num ON public.student_snapshot (visa_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshot_efrro_num ON public.student_snapshot (efrro_number);

-- Expiration indexing (eFRRO Alerts Only)
CREATE INDEX IF NOT EXISTS idx_snapshot_efrro_expiry ON public.student_snapshot (days_until_efrro_expiry);
```
