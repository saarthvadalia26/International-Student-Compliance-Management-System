# Sprint 06 - Performance Strategy Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Page Rendering Strategy

The Student Portal leverages Next.js App Router streaming architecture:
*   **Static Views**: Login pages and the layout templates are pre-rendered at compile time (SSG) for instantaneous load times.
*   **Dynamic Data Fetching**: The dashboard and profile views fetch user session details dynamically using Next.js **React Server Components (RSC)**.
*   **Suspense Streaming**: Dense sections (like upload history tables and notifications delivery logs) are wrapped in `<Suspense>` loaders, allowing the layout template and dashboard headers to render immediately while data streams in from Supabase.

---

## 2. SQL Query Optimizations
*   **Indexes B-Tree Selection**: Single-use token hash and student ID indices prevent table scans.
*   **Selective Select Projection**: Fetches only the required fields (e.g. `.select("id, student_id, file_path, created_at, is_active")` instead of selecting all fields (`*`)), reducing data transmission overhead.

---

## 3. Storage Performance
*   **Signed Storage URLs**: Buckets are kept private. The portal generates short-lived (15-minute expiration) signed download URLs on demand, offloading static file serving from Next.js server actions.
