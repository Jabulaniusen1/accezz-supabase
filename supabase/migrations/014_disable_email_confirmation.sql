-- Migration: Email Confirmation Enabled
-- This migration documents that email confirmation is ENABLED in Supabase
-- Email confirmation must be enabled via the Supabase Dashboard (not via SQL)

-- IMPORTANT: Email confirmation MUST be enabled via Supabase Dashboard:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to Authentication > Settings > Auth Providers
-- 3. Under "Email Auth", ENABLE "Enable email confirmations"
-- 4. Save the changes

-- When email confirmation is enabled:
-- - Users must verify their email before they can sign in
-- - A verification email is sent automatically after signup
-- - Users are redirected to login page with verification notice after signup
-- - Login will check for email verification and show appropriate errors

-- Email Configuration:
-- - SMTP must be properly configured in Supabase Dashboard
-- - Go to Project Settings > Auth > SMTP Settings
-- - Configure your SMTP provider (e.g., ZeptoMail, SendGrid, etc.)
-- - Ensure sender email is from a verified domain

-- The application code:
-- 1. Redirects users to login page after signup with verification notice (signup/page.tsx)
-- 2. Checks for email verification in login flow (login/page.tsx)
-- 3. Shows verification notice and resend option when needed
-- 4. Updates emailRedirectTo to point to login page (supabaseAuth.ts)
-- 5. Sends welcome email after signup (non-blocking)

-- No SQL changes are needed for this migration, but the dashboard settings must be configured.

