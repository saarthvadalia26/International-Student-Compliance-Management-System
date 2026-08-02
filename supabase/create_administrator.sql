-- ============================================================================
-- Supabase SQL Script — Create Administrator Account
-- Project: International Student Compliance Management System (ISCMS)
-- Institution: National Forensic Sciences University (NFSU)
-- ============================================================================
-- Execute this script in the Supabase Dashboard SQL Editor as `postgres`.
-- Replace 'admin@nfsu.ac.in' and 'YourSecurePassword123!' with desired credentials.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  admin_email TEXT := 'admin@nfsu.ac.in';
  admin_password TEXT := 'YourSecurePassword123!';
  admin_name TEXT := 'Dr. Administrator Name';
  encrypted_pw TEXT;
BEGIN
  -- Generate bcrypt password hash
  encrypted_pw := extensions.crypt(admin_password, extensions.gen_salt('bf'));

  -- Check if user with this email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    -- Update existing user to Administrator role
    UPDATE auth.users
    SET 
      encrypted_password = encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_build_object(
        'role', 'administrator',
        'full_name', admin_name
      )
    WHERE email = admin_email;
    
    RAISE NOTICE 'Existing user % updated to Administrator role.', admin_email;
  ELSE
    -- Insert new Administrator account directly into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      encrypted_pw,
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object(
        'role', 'administrator',
        'full_name', admin_name
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Insert corresponding identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      format('{"sub":"%s","email":"%s"}', new_user_id, admin_email)::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'New Administrator account created for % with ID %', admin_email, new_user_id;
  END IF;
END $$;

-- Verify Administrator creation
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' AS role,
  raw_user_meta_data->>'full_name' AS full_name,
  email_confirmed_at
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'administrator';
