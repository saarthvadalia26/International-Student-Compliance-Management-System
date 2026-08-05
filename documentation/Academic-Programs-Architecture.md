# Administrator-Managed Academic Programs Architecture

**Target Institution**: National Forensic Sciences University (NFSU)  
**System**: International Student Compliance Management System (ISCMS)  
**Module**: Academic Programs Master Data Management  
**Status**: Production-Ready  

---

## 1. Executive Summary

Previously, academic programs (such as B.Tech Computer Science, Ph.D. Forensic Science, M.Sc. Digital Forensics) were hardcoded directly inside frontend `<SelectItem>` dropdown components. Because higher education institutions frequently introduce, rename, or archive degree programs across schools and faculties, hardcoded lists lead to maintenance overhead and data inconsistency.

The **Administrator-Managed Academic Programs Master Data Module** provides a dynamic, database-backed master data system allowing administrators to:
1. **Define & Maintain Master Programs**: Create, edit, archive, and restore academic programs with custom display ordering and program codes.
2. **Dynamic UI Rendering**: Automatically populate student registration, edit profile, and setup wizard forms with live active programs.
3. **Graceful Fallbacks**: Ensure robust operational continuity even during database migrations or initial wizard setup.

---

## 2. Database Schema Architecture

### Migration File: `supabase/migrations/025_academic_programs.sql`

```sql
CREATE TABLE IF NOT EXISTS public.academic_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL UNIQUE,
  program_code TEXT UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  school_name TEXT,
  academic_level TEXT, -- e.g. UG, PG, PhD, Diploma
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_academic_programs_active 
  ON public.academic_programs(is_active, display_order);
```

---

## 3. Architecture Layers & Services

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend UI Layer                        │
│  - Setup Wizard (/setup)                                    │
│  - Settings Master Data Tab (/settings -> Academic Programs)│
│  - Add Student Form (/students/add)                         │
│  - Edit Student Dialog (/students/[id])                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Server Actions
┌──────────────────────────────▼──────────────────────────────┐
│                    Server Actions Layer                     │
│  - getActiveAcademicProgramsAction()                         │
│  - getAllAcademicProgramsAction()                            │
│  - createAcademicProgramAction()                            │
│  - updateAcademicProgramAction()                            │
│  - toggleAcademicProgramStatusAction()                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Domain Service
┌──────────────────────────────▼──────────────────────────────┐
│                   AcademicProgramService                    │
│  - Fallback program seeding during setup                     │
│  - Sorting by display_order & program_name                   │
│  - Duplicate checks & sanitization                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Supabase Client
┌──────────────────────────────▼──────────────────────────────┐
│                    PostgreSQL Database                      │
│  Table: public.academic_programs                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Key Security & Operational Controls

1. **Role-Based Authorization (RLS)**:
   - **Public / Staff**: Read access to active programs (`is_active = true`).
   - **Administrators**: Full CRUD access (Create, Read, Update, Archive/Restore).
2. **Data Integrity & Non-Destructive Archiving**:
   - Deleting programs used by past student records would break historical compliance audits.
   - Programs are archived (`is_active = false`) rather than hard-deleted.
3. **Sanitization**:
   - Program codes are automatically formatted to uppercase (e.g. `BTECH_CSE`).
   - Duplicate program names are rejected at both domain service and database constraint levels.
