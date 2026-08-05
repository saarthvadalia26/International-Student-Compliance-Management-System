# Academic Program Duration & Auto-Calculation Specification

**Target Institution**: National Forensic Sciences University (NFSU)  
**System**: International Student Compliance Management System (ISCMS)  
**Feature**: Program Duration Extension & Graduation Date Calculation  
**Status**: ACTIVE & IMPLEMENTED  

---

## 1. Executive Summary

This feature extends the Master Data **Academic Programs** module so that every program includes an official **Program Duration** (`duration_value` and `duration_unit`). 

Program duration serves as the authoritative source for student enrollment lifecycle calculations across the university. When registering new international students or editing existing student profiles, selecting an academic program automatically computes the **Expected Graduation Date** relative to their **Admission Date**, while retaining complete administrator override capability.

---

## 2. Database Architecture & Schema Extensions

### Migration `026_academic_program_duration.sql`

```sql
ALTER TABLE public.academic_programs 
  ADD COLUMN IF NOT EXISTS duration_value INTEGER NOT NULL DEFAULT 4 CHECK (duration_value > 0),
  ADD COLUMN IF NOT EXISTS duration_unit TEXT NOT NULL DEFAULT 'Years' 
    CHECK (duration_unit IN ('Years', 'Semesters', 'Trimesters', 'Months', 'Credits', 'Research_Months'));
```

### Future Readiness & Extensible Units
The `duration_unit` column enforces a flexible CHECK constraint supporting diverse academic structures:
- `Years`: Standard degree programs (e.g. 4 Years B.Tech, 2 Years M.Tech / MBA, 6 Years PhD)
- `Semesters`: Semester-based courses (e.g. 8 Semesters)
- `Trimesters`: Quarter/Trimester academic calendars
- `Months`: Diploma & short-term research fellowships
- `Credits`: Credit-hour based completion tracking
- `Research_Months`: PhD and postdoctoral research terms

---

## 3. Backfill Data Defaults

Existing records in `academic_programs` were backfilled as follows:

| Program Pattern | Level | Duration Value | Duration Unit |
|---|---|---|---|
| **B.Tech / B.Sc** | Undergraduate | 4 | Years |
| **M.Tech / M.Sc / MBA** | Postgraduate | 2 | Years |
| **Integrated M.Sc** | Integrated | 5 | Years |
| **Ph.D / Doctorate** | Doctorate | 6 | Years |

---

## 4. Expected Graduation Date Auto-Calculation Formula

When an academic program and admission date are selected in the Student Registration form (`/students/add`):

$$\text{Expected Graduation Date} = \begin{cases} 
\text{Admission Date} + (\text{duration\_value}) \text{ Years} & \text{if unit = 'Years'} \\
\text{Admission Date} + (\text{duration\_value} \times 6) \text{ Months} & \text{if unit = 'Semesters'} \\
\text{Admission Date} + (\text{duration\_value}) \text{ Months} & \text{if unit = 'Months' / 'Research\_Months'}
\end{cases}$$

### Example Calculations
- **Admission Date**: `01-Aug-2026` + **B.Tech (4 Years)** $\rightarrow$ **Expected Graduation Date**: `01-Aug-2030`
- **Admission Date**: `01-Aug-2026` + **M.Tech (2 Years)** $\rightarrow$ **Expected Graduation Date**: `01-Aug-2028`
- **Admission Date**: `01-Aug-2026` + **Diploma (8 Semesters)** $\rightarrow$ **Expected Graduation Date**: `01-Aug-2030`

---

## 5. Master Data Management UI

The Settings tab (`/settings` $\rightarrow$ Academic Programs) includes:
1. **Table Column Order**: `Order | Program Name | Code | Level | Duration | Status | Actions`.
2. **Add & Edit Modals**: Form inputs for `Program Duration` (positive integer input) and `Duration Unit` (dropdown selector).
3. **Duplicate Prevention**: Duplicate checks on `LOWER(program_name)` and `LOWER(program_code)`.
