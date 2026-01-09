-- Migration: Enable pgcrypto extension
-- This extension is required for gen_random_bytes() function used in ticket code generation
-- Run this migration FIRST before running other migrations that use gen_random_bytes

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Grant usage on the extension schema (if needed)
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

   