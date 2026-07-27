# Sprint 09 - Administration & Configuration Module

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 09 - Administration & Configuration Module
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. System Settings Portal

The administration settings module provides a centralized workspace:
*   **General Settings**: Configure Institute name, branding, support contacts (email, phone), default language (Hindi, English), and local timezones.
*   **Branding Configuration**: Administrators customize logos (light, dark), favicons, and portal theme accent colors.
*   **Security Settings**: Controls session timeouts, login retry thresholds, password rules, and allowed upload formats.

---

## 2. Notification & Templates Configuration

*   **Reminder Thresholds**: Custom schedules (30, 15, 7, 3, 1 day) and max retry attempts rules.
*   **Multilingual Template Editor**: Edit and preview alert templates for supported languages (English, Hindi, French, Spanish, Arabic, Chinese, Russian, Portuguese) prior to publishing.
*   **Language Manager**: Extensible schema allows registering future language locales directly via database inserts without modifying application code.
