# Authentication Migration Guide

- **Status**: Completed
- **Module**: Identity Integration

## Guide for Developers & Seed Scripts

The ISCMS authentication architecture has been refactored to support enterprise identity standards. If you are developing new features or maintaining database seed scripts, please observe the following strictly enforced rules:

### 1. No Bare Usernames
The legacy translation of `admin` to `admin@nfsu-staff.in` is strictly prohibited. All users MUST authenticate using their full, exact email address. When updating environment files (`.env.local`), documentation, or providing demo credentials to stakeholders, you must provide the full email (e.g., `admin@nfsu-staff.in`).

### 2. No Email-Based Foreign Keys
When creating new tables or relationships, **never use email addresses as foreign keys**.
- **Correct**: `user_id UUID REFERENCES auth.users(id)`
- **Incorrect**: `user_email VARCHAR REFERENCES public.student_contact(email)`

### 3. Server Actions & Authentication
Do not use `getAdminSupabase()` to bypass RLS in Server Actions unless explicitly performing a background system task (like chron jobs). All user-driven Server Actions must now authenticate the request utilizing `getServerSupabase()`:

```typescript
const supabase = await getServerSupabase();
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) throw new Error("Unauthorized");
```

Failure to enforce this pattern will result in security violations.
