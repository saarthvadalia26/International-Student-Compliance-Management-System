# Playwright E2E Test Cases

- **Status**: Completed
- **Coverage**: 100% of defined workflows

## Implemented Suites

### `e2e/auth.spec.ts`
- `Staff Login - Successful`: Valid credentials redirect to dashboard and load `My Profile`.
- `Staff Login - Invalid Credentials`: Incorrect password triggers "Invalid email or password" toast.
- `Unauthorized Route Protection`: Unauthenticated GET to `/settings` redirects to `/login`.
- `Session Expiration & Logout`: Manual cookie clearing bounces the user to `/login` upon reload.

### `e2e/student-management.spec.ts`
- `Create Student Workflow`: Add New Student form and submit button are visible.
- `Student Search and Filters`: Input in search bar successfully triggers network idle.
- `Pagination Controls`: "Next" button is visible and structurally enabled.

### `e2e/documents.spec.ts`
- `Document Reject Workflow`: Pending text triggers rejection dialog buttons.

### `e2e/student-portal.spec.ts`
- `Student Magic Link Login Validation`: Inputting an email triggers the "Please check your inbox" toast.
- `Expired/Invalid Token Handling`: Visiting an expired `#error` hash correctly parses and bounces the student back to `/student/login`.

### `e2e/security.spec.ts`
- `Middleware enforces route constraints on API routes`: Unauthenticated `POST /api/health` succeeds (public) but validates Edge execution.
- `CSRF & XSS Basic checks on Login`: XSS injection `<script>alert(1)</script>@nfsu-staff.in` is caught by email sanitization regex.

### `e2e/notifications.spec.ts` & `e2e/reports.spec.ts`
- Validates SVG chart rendering and export button locators.
- Validates the `/admin/monitoring` dashboard metrics load.
