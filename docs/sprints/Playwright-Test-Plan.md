# Playwright E2E Test Plan

- **Status**: Completed
- **Framework**: Playwright (`@playwright/test`)
- **Scope**: Production Staging Validation

## Overview
This test plan defines the automated End-to-End verification strategy for ISCMS. Playwright was selected to ensure cross-browser compatibility and exact emulation of mobile/desktop form factors, eliminating regressions before production deployment.

## Test Matrix
1. **Authentication:** Tests login workflows, JWT expiration, cookie invalidation, and Edge route interception.
2. **Student Management:** Validates UI presence of Add Student forms, Search bars, Filters, and Pagination controls.
3. **Documents:** Tests mock rejection workflows and document lifecycle state transitions.
4. **Student Portal:** Confirms magic link forms, toast notifications, and hash-fragment token error handling.
5. **Notifications:** Ensures the SRE dashboard properly lists Email/WhatsApp dependencies.
6. **Reports:** Validates SVG/Canvas charting layers and export button accessibility.
7. **Admin/Security:** Verifies CSRF rejection (script injection) and unauthorized `/settings` blocks.

## Execution Strategy
The test suite is hooked into `.github/workflows/playwright.yml`. It will run automatically on every Pull Request against the `main` and `master` branches, spinning up parallel workers to evaluate 7 viewport configurations simultaneously.
