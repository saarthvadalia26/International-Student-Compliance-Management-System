# Sprint 06 - Risk Assessment Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Risk Matrix

| Identified Risk | Probability | Impact | Mitigation Strategy | Architectural Fallback |
| :--- | :--- | :--- | :--- | :--- |
| **Token Hijacking via Shared Device** | Medium | High | Token links are configured with short lifespan (7 days) and instantly marked used upon activation. | Fallback to standard email OTP login screen if token validation fails. |
| **Malicious Large File Uploads** | Low | High | Enforce server-side 5MB limit constraints before processing file stream payloads. | Direct storage bucket limits policies prevent excessive network bandwidth consumption. |
| **Unauthorized Data Updates** | Low | Critical | Hardcode read-only fields inside form controllers and enforce database RLS policies. | DB reject transactions if unauthorized fields are updated. |
| **Double Form Submissions** | Medium | Medium | Integrate `<AsyncActionButton>` locking click interactions during uploads. | File checksum validation check blocks duplicate files upload. |
