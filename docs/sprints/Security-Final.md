# Final Security hardening Registry

- **Status**: Production-Ready / Certified
- **Role**: Lead Software Architect
- **Sprint**: Sprint 11 - Production Readiness & Final Hardening
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Network & Header Protections

*   **Content Security Policy (CSP)**: Restrictions mapping allowed scripts, frame-ancestors, object-src, and stylesheets sources.
*   **Transport Hardening**: HTTPS enforcement (HSTS with subdomains preload option) and X-Frame-Options set to DENY.
*   **CSRF Validation**: Validation checks on mutative endpoint requests.

---

## 2. Access Controls & PII Hardening

*   **Row-Level Security (RLS)**: Active on database schemas preventing student leaks.
*   **Signed URL Assets Access**: Document binaries are fetched exclusively via time-bound signed links.
*   **PII Masking & Encryption**:
    *   Administrative audit log displays student names and document files with asterisks masks (`J*** D**`).
    *   Authentication tokens are hashed before DB database persistence.
    *   Passwords use bcrypt hashing.
*   **File MIME Verification**: Check actual file byte headers on upload to reject spoofed files (restricting upload to PDF files only).
