# Logout & Authentication Refactor Walkthrough

This document outlines the refactoring of the authentication architecture to standardize entirely on Supabase Auth as the single source of truth, removing the legacy local-storage check, and introducing a secure sign-out confirmation flow inside the ISCMS App Shell.

---

## 1. Files Modified

*   **[src/app/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/page.tsx)**: Refactored authentication check on the entry landing route to query Supabase Auth session instead of the mock `isms_session` local storage key.
*   **[src/app/login/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/login/page.tsx)**: Swapped out mock login timeouts for standard `signInWithPassword()` client checks against Supabase Auth. Added a self-healing automatic developer registration block that dynamically registers `admin` / `admin` credentials when run in new or unseeded Supabase environments.
*   **[src/components/shell/app-shell.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/components/shell/app-shell.tsx)**: Replaced mock session lookups inside the layout container's state hooks with `supabase.auth.getSession()` queries on mount and active listeners via `supabase.auth.onAuthStateChange()`.
*   **[src/components/header/header.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/components/header/header.tsx)**: Mounted the new client-side `AccountMenu` dropdown component in the header navigation panel.
*   **[src/components/header/account-menu.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/components/header/account-menu.tsx)**: Created this new widget containing the account details (Initials Avatar, User Name, Role) dropdown list and the controlled sign-out confirmation dialog.

---

## 2. Authentication Flow

Standardized Supabase Auth implementation guarantees a robust verification pipeline:

```
┌────────────────┐      1. Enter Credentials      ┌────────────────┐
│                ├───────────────────────────────>│  Supabase Auth │
│   Login Page   │<───────────────────────────────┤  (Sign-In API) │
│                │      2. Yield Active Session   │                │
└────────────────┘                                └────────────────┘
        │
        │ 3. Redirect /dashboard
        ▼
┌────────────────┐      4. Verify session         ┌────────────────┐
│   App Layout   ├───────────────────────────────>│  Supabase Auth │
│   (AppShell)   │<───────────────────────────────┤  (Get Session) │
│                │      5. Render Page            │                │
└────────────────┘                                └────────────────┘
```

1. **Sign-In Action**: The user inputs credentials on the `/login` page. The app translates input to email standard (`admin` -> `admin@nfsu.edu`) and calls `supabase.auth.signInWithPassword()`.
2. **Onboarding Safety Net**: If sign-in fails due to invalid credentials in new local environments, the handler registers the demo account automatically and logs in.
3. **Session Verification**: The `AppShell` component verifies the session on render. If the user lacks an active token, the client redirects to `/login`.

---

## 3. Session Cleanup Process

Confirming logout triggers the following cleanup process:
1. **Supabase Invalidation**: Invokes `supabase.auth.signOut()`, invalidating the session tokens on the Supabase authentication server.
2. **Real-time Listener Update**: The state listener inside `AppShell` captures `SIGNED_OUT` via `onAuthStateChange()`, updating `isAuthenticated` to `false`.
3. **State Clear**: Local state is garbage collected, and the user is redirected back to `/login`.
4. **Error Resilience**: If Supabase Auth fails during signOut, the error is caught, keeping the session active and notifying the administrator with a toast alert.

---

## 4. Route Protection Verification

To verify that unauthenticated requests cannot access any workspace layout screens:
*   Accessing `/dashboard` or `/reports/*` triggers `AppShell`'s mount hook.
*   The check queries `supabase.auth.getSession()`.
*   If the session evaluates to `null` or is empty, the client redirects to `/login` immediately.

---

## 5. Build Verification Results

We verified that the refactored code has built cleanly:
*   **Static Code Analysis (`npm run lint`)**: **Passed with 0 errors/warnings**.
*   **TypeScript check (`tsc --noEmit`)**: **Passed with 0 errors**.
*   **Production bundle compilation (`npm run build`)**: **Passed successfully** (Compiled in 22.2s, generating all static and dynamic modules).
