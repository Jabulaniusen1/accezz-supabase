-- Migration: Disable Email Confirmation
-- This migration documents the requirement to disable email confirmation in Supabase
-- Email confirmation must be disabled via the Supabase Dashboard (not via SQL)

-- IMPORTANT: Email confirmation is disabled via Supabase Dashboard:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to Authentication > Settings > Auth Providers
-- 3. Under "Email Auth", disable "Enable email confirmations"
-- 4. Save the changes

-- When email confirmation is disabled:
-- - Users can sign up and immediately access their account
-- - The session is returned immediately after signup
-- - Users are redirected directly to the dashboard after account creation
-- - No email verification step is required

-- Note: This setting cannot be changed via SQL migrations as it's a Supabase
-- platform-level configuration. It must be changed in the dashboard.

-- The application code has been updated to:
-- 1. Handle sessions immediately after signup (signup/page.tsx)
-- 2. Redirect users directly to dashboard instead of login page
-- 3. Remove email verification checks from login flow (login/page.tsx)
-- 4. Update emailRedirectTo to point to dashboard (supabaseAuth.ts)

-- No SQL changes are needed for this migration, but the dashboard setting must be updated.

