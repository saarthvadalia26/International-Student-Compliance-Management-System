# Authentication Regression Test Plan

- **Status**: Completed
- **Module**: QA & Regression

## Overview
This document outlines the strict regression test suite required to validate the stability of the enterprise authentication refactor. All developers must verify these workflows before signing off on deployment.

## Test Workflows

### 1. Login Validation
- **[ ] Staff Login**: Provide valid email (`admin@nfsu-staff.in`) and correct password. Ensure successful redirect to `/dashboard`.
- **[ ] Student Login**: Provide a valid student email to trigger the magic link workflow successfully.
- **[ ] Invalid Credentials**: Input an incorrect password. Verify UI displays "Invalid email or password."
- **[ ] Unverified Email**: Input an unverified email. Verify UI displays "Email address is not verified."
- **[ ] Disabled Account**: Input a disabled email. Verify UI displays "Your account has been disabled."

### 2. Session Lifecycle & Persistence
- **[ ] Browser Refresh**: Log in, refresh the browser on `/dashboard`. Ensure the session persists seamlessly via the HttpOnly cookie.
- **[ ] Multi-Tab Sync**: Log in on Tab 1. Open `/dashboard` on Tab 2. Log out on Tab 1. Verify Tab 2 redirects to `/login` upon next navigation.
- **[ ] Session Expiration**: Manually delete the `sb-[id]-auth-token` cookie and reload the page. Verify redirection to `/login`.

### 3. Route Protection & Edge Security
- **[ ] Unauthenticated Access**: Open an incognito window. Attempt to navigate directly to `/settings` or `/students/add`. Verify middleware intercepts and redirects to `/login`.
- **[ ] Authenticated Lockout**: While logged in as Staff, navigate directly to `/login`. Verify middleware intercepts and redirects back to `/dashboard`.
- **[ ] Portal Isolation**: While logged in as a Student, attempt to navigate to `/dashboard` (staff portal). Verify middleware intercepts and rejects access.

### 4. Complete Invalidation
- **[ ] Logout Workflow**: Click "Sign Out" from the account menu. Verify immediate redirection to `/login` and that pressing the browser "Back" button does not grant access to the dashboard.
