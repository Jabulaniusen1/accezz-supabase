-- ============================================================================
-- COMPLETE SUPABASE DATABASE SETUP
-- ============================================================================
-- This file contains all SQL needed to set up the Accezz project database
-- Run this entire file on a fresh Supabase database to initialize everything
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. BASE SCHEMA - TABLES, TYPES, FUNCTIONS, TRIGGERS
-- ============================================================================

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  country text,
  currency text,
  twofa_enabled boolean DEFAULT false,
  verified boolean DEFAULT false,
  -- Bank account details for payments
  account_name text,
  account_number text,
  bank_code text,
  bank_name text,
  -- Admin and user type (added in migrations)
  is_admin boolean DEFAULT false,
  user_type text DEFAULT 'creator',
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add check constraint for user_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_type_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_type_check
      CHECK (user_type IN ('creator', 'customer'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Event Categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Slug generation function for event categories
CREATE OR REPLACE FUNCTION public.generate_event_category_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  base_slug := regexp_replace(lower(NEW.name), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;

  WHILE EXISTS(SELECT 1 FROM public.event_categories WHERE slug = candidate AND id <> NEW.id) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  END LOOP;

  NEW.slug = candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_categories_slug ON public.event_categories;
CREATE TRIGGER trg_event_categories_slug
BEFORE INSERT OR UPDATE OF name, slug ON public.event_categories
FOR EACH ROW EXECUTE FUNCTION public.generate_event_category_slug();

DROP TRIGGER IF EXISTS trg_event_categories_updated_at ON public.event_categories;
CREATE TRIGGER trg_event_categories_updated_at
BEFORE UPDATE ON public.event_categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed default event categories
INSERT INTO public.event_categories (name)
VALUES
  ('Community'),
  ('Art & Culture'),
  ('Sports & Wellness'),
  ('Career & Business'),
  ('Spirituality & Religion'),
  ('Food & Drink'),
  ('Music & Entertainment'),
  ('Education & Workshops'),
  ('Technology & Innovation'),
  ('Family & Lifestyle')
ON CONFLICT (name) DO NOTHING;

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  venue text,
  location text,
  address text,
  city text,
  country text,
  currency text,
  is_virtual boolean NOT NULL DEFAULT false,
  virtual_details jsonb,
  social_links jsonb,
  category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
  category_custom text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  status text NOT NULL DEFAULT 'published',
  visibility text NOT NULL DEFAULT 'public',
  location_visibility text NOT NULL DEFAULT 'public',
  gallery_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add location_visibility constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_location_visibility_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_location_visibility_check
      CHECK (location_visibility IN ('public','undisclosed','secret'));
  END IF;
END $$;

-- Slug generation function for events
CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  base_slug := regexp_replace(lower(NEW.title), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;

  WHILE EXISTS(SELECT 1 FROM public.events WHERE slug = candidate AND id <> NEW.id) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  END LOOP;

  NEW.slug = candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_slug ON public.events;
CREATE TRIGGER trg_events_slug
BEFORE INSERT OR UPDATE OF title, slug ON public.events
FOR EACH ROW EXECUTE FUNCTION public.generate_event_slug();

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Event Gallery table
CREATE TABLE IF NOT EXISTS public.event_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Function to recalculate gallery count
CREATE OR REPLACE FUNCTION public.recalc_event_gallery_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.events e
  SET gallery_count = (SELECT COUNT(*) FROM public.event_gallery g WHERE g.event_id = e.id),
      updated_at = now()
  WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_gallery_count_ins ON public.event_gallery;
CREATE TRIGGER trg_gallery_count_ins
AFTER INSERT ON public.event_gallery
FOR EACH ROW EXECUTE FUNCTION public.recalc_event_gallery_count();

DROP TRIGGER IF EXISTS trg_gallery_count_del ON public.event_gallery;
CREATE TRIGGER trg_gallery_count_del
AFTER DELETE ON public.event_gallery
FOR EACH ROW EXECUTE FUNCTION public.recalc_event_gallery_count();

-- Locations table (event centers)
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  country text NOT NULL,
  city text NOT NULL,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  capacity int CHECK (capacity IS NULL OR capacity >= 0),
  amenities jsonb,
  event_types text[] NOT NULL DEFAULT '{}',
  booking_price text,
  contact_email text,
  contact_phone text,
  default_image_url text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  x_url text,
  gallery_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Slug generation function for locations
CREATE OR REPLACE FUNCTION public.generate_location_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  base_slug := regexp_replace(lower(NEW.name), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;

  WHILE EXISTS(SELECT 1 FROM public.locations WHERE slug = candidate AND id <> NEW.id) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  END LOOP;

  NEW.slug = candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_locations_slug ON public.locations;
CREATE TRIGGER trg_locations_slug
BEFORE INSERT OR UPDATE OF name, slug ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.generate_location_slug();

DROP TRIGGER IF EXISTS trg_locations_updated_at ON public.locations;
CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Location Gallery table
CREATE TABLE IF NOT EXISTS public.location_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Function to recalculate location gallery count
CREATE OR REPLACE FUNCTION public.recalc_location_gallery_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.locations l
  SET gallery_count = (SELECT COUNT(*) FROM public.location_gallery g WHERE g.location_id = l.id),
      updated_at = now()
  WHERE l.id = COALESCE(NEW.location_id, OLD.location_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_location_gallery_ins ON public.location_gallery;
CREATE TRIGGER trg_location_gallery_ins
AFTER INSERT ON public.location_gallery
FOR EACH ROW EXECUTE FUNCTION public.recalc_location_gallery_count();

DROP TRIGGER IF EXISTS trg_location_gallery_del ON public.location_gallery;
CREATE TRIGGER trg_location_gallery_del
AFTER DELETE ON public.location_gallery
FOR EACH ROW EXECUTE FUNCTION public.recalc_location_gallery_count();

-- Location Booking Status enum
DO $$ BEGIN
  CREATE TYPE public.location_booking_status AS ENUM ('pending','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Location Bookings table
CREATE TABLE IF NOT EXISTS public.location_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name text,
  requester_email text,
  requester_phone text,
  event_type text,
  event_date date NOT NULL,
  start_time text,
  end_time text,
  notes text,
  status public.location_booking_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_location_bookings_updated_at ON public.location_bookings;
CREATE TRIGGER trg_location_bookings_updated_at
BEFORE UPDATE ON public.location_bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Associate events with locations (add column after locations table exists)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

-- Order Status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending','paid','failed','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_full_name text,
  buyer_email text NOT NULL,
  buyer_phone text,
  currency text,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_provider text,
  payment_reference text,
  expires_at timestamptz,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Ticket Validation Status enum
DO $$ BEGIN
  CREATE TYPE public.ticket_validation_status AS ENUM ('valid','invalid','refunded','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ticket Types table
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  quantity int NOT NULL CHECK (quantity >= 0),
  sold int NOT NULL DEFAULT 0 CHECK (sold >= 0),
  reserved int NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, name)
);

-- Add constraint for sold + reserved <= quantity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_types_sold_reserved_quantity_check'
  ) THEN
    ALTER TABLE public.ticket_types 
    DROP CONSTRAINT ticket_types_sold_reserved_quantity_check;
  END IF;
END $$;

ALTER TABLE public.ticket_types
ADD CONSTRAINT ticket_types_sold_reserved_quantity_check 
CHECK (sold + reserved <= quantity);

DROP TRIGGER IF EXISTS trg_ticket_types_updated_at ON public.ticket_types;
CREATE TRIGGER trg_ticket_types_updated_at
BEFORE UPDATE ON public.ticket_types
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  ticket_code text UNIQUE NOT NULL,
  qr_code_url text,
  attendee_name text,
  attendee_email text,
  gender text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  currency text,
  validation_status public.ticket_validation_status NOT NULL DEFAULT 'valid',
  is_scanned boolean NOT NULL DEFAULT false,
  scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add gender constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_gender_check'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_gender_check
      CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer-not-to-say'));
  END IF;
END $$;

-- Generate ticket code function
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS text LANGUAGE sql AS $$
  SELECT encode(gen_random_bytes(10), 'hex');
$$;

ALTER TABLE public.tickets
  ALTER COLUMN ticket_code SET DEFAULT public.generate_ticket_code();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to enforce ticket event match
CREATE OR REPLACE FUNCTION public.enforce_ticket_event_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tt_event uuid;
BEGIN
  SELECT event_id INTO tt_event
  FROM public.ticket_types
  WHERE id = NEW.ticket_type_id;

  IF tt_event IS NULL THEN
    RAISE EXCEPTION 'Ticket type % not found', NEW.ticket_type_id;
  END IF;

  IF NEW.event_id IS NULL THEN
    NEW.event_id := tt_event;
  END IF;

  IF NEW.event_id <> tt_event THEN
    RAISE EXCEPTION 'Ticket event % does not match ticket_type event %', NEW.event_id, tt_event;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_event_match ON public.tickets;
CREATE TRIGGER trg_tickets_event_match
BEFORE INSERT OR UPDATE OF event_id, ticket_type_id
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ticket_event_match();

-- Function to ensure inventory availability
CREATE OR REPLACE FUNCTION public.ensure_inventory_available()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available int;
BEGIN
  SELECT (quantity - sold - reserved) INTO available 
  FROM public.ticket_types 
  WHERE id = NEW.ticket_type_id 
  FOR UPDATE;
  
  IF available IS NULL THEN
    RAISE EXCEPTION 'Ticket type not found';
  END IF;
  
  IF available <= 0 THEN
    RAISE EXCEPTION 'Ticket type is sold out';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_inventory_check ON public.tickets;
CREATE TRIGGER trg_tickets_inventory_check
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.ensure_inventory_available();

-- Function to issue tickets and update inventory
CREATE OR REPLACE FUNCTION public.issue_tickets_and_update_inventory(p_order_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF (SELECT status FROM public.orders WHERE id = p_order_id) <> 'paid' THEN
    RAISE EXCEPTION 'Order must be paid before issuing tickets';
  END IF;

  FOR r IN
    SELECT t.id as ticket_id, t.ticket_type_id
    FROM public.tickets t
    WHERE t.order_id = p_order_id
  LOOP
    UPDATE public.ticket_types tt
    SET sold = sold + 1,
        updated_at = now()
    WHERE tt.id = r.ticket_type_id
      AND (tt.quantity - tt.sold - tt.reserved) > 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient inventory for ticket_type %', r.ticket_type_id;
    END IF;
  END LOOP;
END;
$$;

-- Function to check if order is paid
CREATE OR REPLACE FUNCTION public.is_order_paid(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM public.orders
    WHERE id = p_order_id
      AND status = 'paid'
  );
END;
$$;

-- Payment Transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_ref text,
  status text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Event Views table (analytics)
CREATE TABLE IF NOT EXISTS public.event_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip inet,
  country text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Scan Result enum
DO $$ BEGIN
  CREATE TYPE public.scan_result AS ENUM ('success','duplicate','invalid','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ticket Scans table
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  scanned_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  result public.scan_result NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Email Campaign Status enum
DO $$ BEGIN
  CREATE TYPE public.email_campaign_status AS ENUM ('draft','scheduled','sending','sent','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Email Campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  subject text NOT NULL,
  content text NOT NULL,
  status public.email_campaign_status NOT NULL DEFAULT 'draft',
  sent_count int NOT NULL DEFAULT 0,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Withdrawal Status enum
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Withdrawal Requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN',
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Config table (for abandoned cart API URL)
CREATE TABLE IF NOT EXISTS public.config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. ANALYTICS VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.event_ticket_stats AS
SELECT
  e.id as event_id,
  e.title,
  COALESCE(SUM(tt.sold), 0) as total_sold,
  COALESCE(SUM(tt.sold * tt.price), 0)::numeric(12,2) as revenue,
  jsonb_agg(
    jsonb_build_object(
      'ticketTypeId', tt.id,
      'name', tt.name,
      'sold', tt.sold,
      'price', tt.price
    )
    ORDER BY tt.name
  ) FILTER (WHERE tt.id IS NOT NULL) as sold_by_type
FROM public.events e
LEFT JOIN public.ticket_types tt ON tt.event_id = e.id
GROUP BY e.id;

CREATE OR REPLACE VIEW public.event_daily_sales AS
SELECT
  e.id as event_id,
  date_trunc('day', o.created_at) as day,
  SUM(o.total_amount)::numeric(12,2) as revenue,
  COUNT(DISTINCT o.id) as orders
FROM public.events e
JOIN public.orders o ON o.event_id = e.id AND o.status = 'paid'
GROUP BY e.id, date_trunc('day', o.created_at)
ORDER BY day DESC;

-- ============================================================================
-- 4. SECURITY: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. ADMIN FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_admin_user boolean;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = current_user_id AND is_admin = true
  ) INTO is_admin_user;
  
  RETURN COALESCE(is_admin_user, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- 6. AUTO-CREATE PROFILES FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type text;
BEGIN
  -- Extract user_type from user metadata, default to 'customer' if not specified
  v_user_type := COALESCE(
    NEW.raw_user_meta_data->>'user_type',
    'customer'  -- Default new signups to customer unless specified as creator
  );
  
  -- Ensure valid user_type
  IF v_user_type NOT IN ('creator', 'customer') THEN
    v_user_type := 'customer';
  END IF;

  -- Insert a new profile row for the newly created user
  INSERT INTO public.profiles (user_id, full_name, phone, user_type, country, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    v_user_type,
    COALESCE(NEW.raw_user_meta_data->>'country', NULL),
    COALESCE(NEW.raw_user_meta_data->>'city', NULL)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. TICKET RESERVATION FUNCTIONS
-- ============================================================================

-- Atomic reservation function
CREATE OR REPLACE FUNCTION public.reserve_tickets_atomic(
  p_event_id uuid,
  p_ticket_type_name text,
  p_quantity int,
  p_order_id uuid,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_type_id uuid;
  v_available int;
  v_reserved int;
  v_result jsonb;
BEGIN
  SELECT id, (quantity - sold - reserved) as available, reserved
  INTO v_ticket_type_id, v_available, v_reserved
  FROM public.ticket_types
  WHERE event_id = p_event_id
    AND name = p_ticket_type_name
  FOR UPDATE;

  IF v_ticket_type_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket type not found'
    );
  END IF;

  IF v_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Only %s ticket(s) available', v_available),
      'available', v_available
    );
  END IF;

  UPDATE public.ticket_types
  SET reserved = reserved + p_quantity,
      updated_at = now()
  WHERE id = v_ticket_type_id;

  UPDATE public.orders
  SET expires_at = p_expires_at,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_type_id', v_ticket_type_id,
    'reserved', v_reserved + p_quantity,
    'available', v_available - p_quantity
  );
END;
$$;

-- Function to move reserved tickets to sold
CREATE OR REPLACE FUNCTION public.move_reserved_to_sold(
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_ticket_type_id uuid;
  v_quantity int;
  v_result jsonb;
BEGIN
  SELECT 
    o.id,
    o.event_id,
    o.meta->>'ticketTypeName' as ticket_type_name,
    (o.meta->>'quantity')::int as quantity
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.status = 'paid';

  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or not paid'
    );
  END IF;

  SELECT id INTO v_ticket_type_id
  FROM public.ticket_types
  WHERE event_id = v_order.event_id
    AND name = v_order.ticket_type_name;

  IF v_ticket_type_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket type not found'
    );
  END IF;

  v_quantity := COALESCE(v_order.quantity, 1);

  UPDATE public.ticket_types
  SET 
    reserved = GREATEST(0, reserved - v_quantity),
    sold = sold + v_quantity,
    updated_at = now()
  WHERE id = v_ticket_type_id
    AND reserved >= v_quantity;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient reserved tickets (possible race condition)'
    );
  END IF;

  UPDATE public.orders
  SET expires_at = NULL,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_type_id', v_ticket_type_id,
    'quantity_moved', v_quantity
  );
END;
$$;

-- Function to release expired reservations
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_order record;
  v_released_count int := 0;
  v_orders_updated int := 0;
  v_result jsonb;
BEGIN
  FOR v_expired_order IN
    SELECT 
      o.id,
      o.event_id,
      o.meta->>'ticketTypeName' as ticket_type_name,
      (o.meta->>'quantity')::int as quantity
    FROM public.orders o
    WHERE o.status = 'pending'
      AND o.expires_at IS NOT NULL
      AND o.expires_at < now()
    FOR UPDATE
  LOOP
    DECLARE
      v_ticket_type_id uuid;
      v_quantity int;
    BEGIN
      SELECT id INTO v_ticket_type_id
      FROM public.ticket_types
      WHERE event_id = v_expired_order.event_id
        AND name = v_expired_order.ticket_type_name;

      IF v_ticket_type_id IS NOT NULL THEN
        v_quantity := COALESCE(v_expired_order.quantity, 1);

        UPDATE public.ticket_types
        SET 
          reserved = GREATEST(0, reserved - v_quantity),
          updated_at = now()
        WHERE id = v_ticket_type_id
          AND reserved >= v_quantity;

        IF FOUND THEN
          v_released_count := v_released_count + v_quantity;
        END IF;
      END IF;
    END;

    UPDATE public.orders
    SET 
      status = 'cancelled',
      expires_at = NULL,
      updated_at = now()
    WHERE id = v_expired_order.id;

    IF FOUND THEN
      v_orders_updated := v_orders_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'orders_cancelled', v_orders_updated,
    'tickets_released', v_released_count,
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_tickets_atomic(uuid, text, int, uuid, timestamptz) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.move_reserved_to_sold(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO authenticated, anon;

-- ============================================================================
-- 8. ABANDONED CART FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_abandoned_cart_emails()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_url text;
  response_result record;
  base_url text;
BEGIN
  SELECT value INTO api_url
  FROM public.config
  WHERE key = 'abandoned_cart_api_url'
  LIMIT 1;

  IF api_url IS NULL OR api_url = 'https://www.accezzlive.com/api/emails/send-abandoned-carts' THEN
    BEGIN
      base_url := current_setting('app.settings.base_url', true);
      IF base_url IS NOT NULL THEN
        api_url := base_url || '/api/emails/send-abandoned-carts';
      ELSE
        RAISE EXCEPTION 'Please update the abandoned_cart_api_url in the config table with your actual domain';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Please update the abandoned_cart_api_url in the config table with your actual domain';
    END;
  END IF;

  SELECT * INTO response_result
  FROM net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'minutes', 5,
      'limit', 50
    )
  );

  RETURN jsonb_build_object(
    'status', response_result.status,
    'success', response_result.status = 200,
    'response', response_result.content
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 500,
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to send abandoned cart emails. Make sure pg_net extension is enabled.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_abandoned_cart_emails() TO postgres, service_role;

-- Insert default config for abandoned cart
INSERT INTO public.config (key, value, description)
VALUES (
  'abandoned_cart_api_url',
  'https://www.accezzlive.com/api/emails/send-abandoned-carts',
  'API endpoint URL for sending abandoned cart emails'
)
ON CONFLICT (key) DO UPDATE
SET value = excluded.value,
    updated_at = now();

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_profiles_select_all" ON public.profiles;
CREATE POLICY "admin_profiles_select_all" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- Events policies
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read" ON public.events
FOR SELECT USING (visibility = 'public' AND status = 'published');

DROP POLICY IF EXISTS "events_owner_read" ON public.events;
CREATE POLICY "events_owner_read" ON public.events
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_owner_write" ON public.events;
CREATE POLICY "events_owner_write" ON public.events
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_owner_update" ON public.events;
CREATE POLICY "events_owner_update" ON public.events
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_owner_delete" ON public.events;
CREATE POLICY "events_owner_delete" ON public.events
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_events_select_all" ON public.events;
CREATE POLICY "admin_events_select_all" ON public.events
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_events_delete_all" ON public.events;
CREATE POLICY "admin_events_delete_all" ON public.events
  FOR DELETE USING (public.is_admin());

-- Event gallery policies
DROP POLICY IF EXISTS "gallery_read_public_or_owner" ON public.event_gallery;
CREATE POLICY "gallery_read_public_or_owner" ON public.event_gallery
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.events e
         WHERE e.id = event_id
           AND ((e.visibility = 'public' AND e.status = 'published') OR e.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "gallery_owner_write" ON public.event_gallery;
CREATE POLICY "gallery_owner_write" ON public.event_gallery
FOR ALL USING (
  EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
);

-- Locations policies
DROP POLICY IF EXISTS "locations_public_read" ON public.locations;
CREATE POLICY "locations_public_read" ON public.locations
FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "locations_owner_read" ON public.locations;
CREATE POLICY "locations_owner_read" ON public.locations
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "locations_owner_write" ON public.locations;
CREATE POLICY "locations_owner_write" ON public.locations
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "locations_owner_update" ON public.locations;
CREATE POLICY "locations_owner_update" ON public.locations
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "locations_owner_delete" ON public.locations;
CREATE POLICY "locations_owner_delete" ON public.locations
FOR DELETE USING (auth.uid() = user_id);

-- Location gallery policies
DROP POLICY IF EXISTS "location_gallery_public_read" ON public.location_gallery;
CREATE POLICY "location_gallery_public_read" ON public.location_gallery
FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM public.locations l
    WHERE l.id = location_id
      AND (l.is_active OR l.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "location_gallery_owner_write" ON public.location_gallery;
CREATE POLICY "location_gallery_owner_write" ON public.location_gallery
FOR ALL USING (
  EXISTS(SELECT 1 FROM public.locations l WHERE l.id = location_id AND l.user_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.locations l WHERE l.id = location_id AND l.user_id = auth.uid())
);

-- Location bookings policies
DROP POLICY IF EXISTS "location_bookings_owner_read" ON public.location_bookings;
CREATE POLICY "location_bookings_owner_read" ON public.location_bookings
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.locations l WHERE l.id = location_id AND l.user_id = auth.uid())
  OR requester_user_id = auth.uid()
);

DROP POLICY IF EXISTS "location_bookings_create_any" ON public.location_bookings;
CREATE POLICY "location_bookings_create_any" ON public.location_bookings
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "location_bookings_owner_update" ON public.location_bookings;
CREATE POLICY "location_bookings_owner_update" ON public.location_bookings
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.locations l WHERE l.id = location_id AND l.user_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.locations l WHERE l.id = location_id AND l.user_id = auth.uid())
);

DROP POLICY IF EXISTS "location_bookings_owner_delete" ON public.location_bookings;
CREATE POLICY "location_bookings_owner_delete" ON public.location_bookings
FOR DELETE USING (
  EXISTS(SELECT 1 FROM public.locations l WHERE l.id = location_id AND l.user_id = auth.uid())
);

-- Ticket types policies
DROP POLICY IF EXISTS "ticket_types_read_public_or_owner" ON public.ticket_types;
CREATE POLICY "ticket_types_read_public_or_owner" ON public.ticket_types
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.events e
         WHERE e.id = event_id
           AND ((e.visibility = 'public' AND e.status = 'published') OR e.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "ticket_types_owner_write" ON public.ticket_types;
CREATE POLICY "ticket_types_owner_write" ON public.ticket_types
FOR ALL USING (
  EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
);

DROP POLICY IF EXISTS "admin_ticket_types_select_all" ON public.ticket_types;
CREATE POLICY "admin_ticket_types_select_all" ON public.ticket_types
  FOR SELECT USING (public.is_admin());

-- Orders policies
DROP POLICY IF EXISTS "orders_buyer_or_owner_read" ON public.orders;
CREATE POLICY "orders_buyer_or_owner_read" ON public.orders
FOR SELECT USING (
  buyer_user_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
);

DROP POLICY IF EXISTS "orders_insert_anyone" ON public.orders;
CREATE POLICY "orders_insert_anyone" ON public.orders
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update_owner_only" ON public.orders;
CREATE POLICY "orders_update_owner_only" ON public.orders
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
);

DROP POLICY IF EXISTS "orders_buyer_update_status" ON public.orders;
CREATE POLICY "orders_buyer_update_status" ON public.orders
FOR UPDATE USING (
  buyer_user_id = auth.uid()
  OR (status = 'pending' AND buyer_email IS NOT NULL)
) WITH CHECK (
  buyer_user_id = auth.uid()
  OR (status = 'paid' AND buyer_email IS NOT NULL)
);

DROP POLICY IF EXISTS "admin_orders_select_all" ON public.orders;
CREATE POLICY "admin_orders_select_all" ON public.orders
  FOR SELECT USING (public.is_admin());

-- Tickets policies
DROP POLICY IF EXISTS "tickets_buyer_or_owner_read" ON public.tickets;
CREATE POLICY "tickets_buyer_or_owner_read" ON public.tickets
FOR SELECT USING (
  EXISTS(
    SELECT 1
    FROM public.orders o
    JOIN public.events e ON e.id = o.event_id
    WHERE o.id = order_id
      AND (o.buyer_user_id = auth.uid() OR e.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "tickets_insert_for_paid_orders" ON public.tickets;
CREATE POLICY "tickets_insert_for_paid_orders" ON public.tickets
FOR INSERT WITH CHECK (
  public.is_order_paid(order_id)
);

DROP POLICY IF EXISTS "tickets_update_for_validation" ON public.tickets;
CREATE POLICY "tickets_update_for_validation" ON public.tickets
FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_tickets_select_all" ON public.tickets;
CREATE POLICY "admin_tickets_select_all" ON public.tickets
  FOR SELECT USING (public.is_admin());

-- Payment transactions policies
DROP POLICY IF EXISTS "payments_owner_read" ON public.payment_transactions;
CREATE POLICY "payments_owner_read" ON public.payment_transactions
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.orders o
         JOIN public.events e ON e.id = o.event_id
         WHERE o.id = order_id AND e.user_id = auth.uid())
);

-- Event views policies
DROP POLICY IF EXISTS "event_views_insert_anyone" ON public.event_views;
CREATE POLICY "event_views_insert_anyone" ON public.event_views
FOR INSERT WITH CHECK (true);

-- Ticket scans policies
DROP POLICY IF EXISTS "ticket_scans_owner_read" ON public.ticket_scans;
CREATE POLICY "ticket_scans_owner_read" ON public.ticket_scans
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.tickets t
         JOIN public.orders o ON o.id = t.order_id
         JOIN public.events e ON e.id = o.event_id
         WHERE t.id = ticket_id AND e.user_id = auth.uid())
);

DROP POLICY IF EXISTS "ticket_scans_owner_insert" ON public.ticket_scans;
CREATE POLICY "ticket_scans_owner_insert" ON public.ticket_scans
FOR INSERT WITH CHECK (scanned_by_user_id = auth.uid());

-- Notifications policies
DROP POLICY IF EXISTS "notifications_user_rw" ON public.notifications;
CREATE POLICY "notifications_user_rw" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_user_insert" ON public.notifications;
CREATE POLICY "notifications_user_insert" ON public.notifications
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
CREATE POLICY "notifications_user_update" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

-- Email campaigns policies
DROP POLICY IF EXISTS "campaigns_owner_rw" ON public.email_campaigns;
CREATE POLICY "campaigns_owner_rw" ON public.email_campaigns
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "campaigns_owner_insert" ON public.email_campaigns;
CREATE POLICY "campaigns_owner_insert" ON public.email_campaigns
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "campaigns_owner_update" ON public.email_campaigns;
CREATE POLICY "campaigns_owner_update" ON public.email_campaigns
FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "campaigns_owner_delete" ON public.email_campaigns;
CREATE POLICY "campaigns_owner_delete" ON public.email_campaigns
FOR DELETE USING (user_id = auth.uid());

-- Withdrawal requests policies
DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_insert_own" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_select_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_select_own" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_admin_select" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin_select" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE((p).is_admin, false) = true
    )
  );

DROP POLICY IF EXISTS "withdrawals_admin_update" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin_update" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE((p).is_admin, false) = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE((p).is_admin, false) = true
    )
  );

-- ============================================================================
-- 10. PERFORMANCE INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_category_id ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_user_id ON public.orders(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON public.orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at_status ON public.orders(expires_at, status) 
  WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Ticket indexes
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON public.tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_validation_status ON public.tickets(validation_status);

-- Ticket type indexes
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON public.ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_name ON public.ticket_types(event_id, name);

-- Event gallery indexes
CREATE INDEX IF NOT EXISTS idx_event_gallery_event_id ON public.event_gallery(event_id);

-- Ticket scans indexes
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON public.ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON public.ticket_scans(scanned_by_user_id);

-- Event views indexes
CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON public.event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_created_at ON public.event_views(created_at DESC);

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_ref ON public.payment_transactions(provider_ref);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================================
-- 11. STORAGE POLICIES
-- ============================================================================

-- event-images: public read
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'event_images_public_read';
  IF NOT FOUND THEN
    CREATE POLICY "event_images_public_read" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'event-images');
  END IF;
END $$;

-- event-images: owner write
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'event_images_owner_write';
  IF NOT FOUND THEN
    CREATE POLICY "event_images_owner_write" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'event-images'
        AND name LIKE ('events/' || auth.uid()::text || '/%')
      );
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'event_images_owner_update_delete';
  IF NOT FOUND THEN
    CREATE POLICY "event_images_owner_update_delete" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'event-images'
        AND name LIKE ('events/' || auth.uid()::text || '/%')
      )
      WITH CHECK (
        bucket_id = 'event-images'
        AND name LIKE ('events/' || auth.uid()::text || '/%')
      );
    CREATE POLICY "event_images_owner_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'event-images'
        AND name LIKE ('events/' || auth.uid()::text || '/%')
      );
  END IF;
END $$;

-- event-gallery: public read
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'event_gallery_public_read';
  IF NOT FOUND THEN
    CREATE POLICY "event_gallery_public_read" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'event-gallery');
  END IF;
END $$;

-- event-gallery: owner write
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'event_gallery_owner_write';
  IF NOT FOUND THEN
    CREATE POLICY "event_gallery_owner_write" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'event-gallery'
        AND (name LIKE ('events/' || auth.uid()::text || '/%'))
      );
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'event_gallery_owner_update_delete';
  IF NOT FOUND THEN
    CREATE POLICY "event_gallery_owner_update_delete" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'event-gallery'
        AND (name LIKE ('events/' || auth.uid()::text || '/%'))
      )
      WITH CHECK (
        bucket_id = 'event-gallery'
        AND (name LIKE ('events/' || auth.uid()::text || '/%'))
      );
    CREATE POLICY "event_gallery_owner_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'event-gallery'
        AND (name LIKE ('events/' || auth.uid()::text || '/%'))
      );
  END IF;
END $$;

-- locations-images: public read
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'locations_images_public_read';
  IF NOT FOUND THEN
    CREATE POLICY "locations_images_public_read" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'locations-images');
  END IF;
END $$;

-- locations-images: owner write
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'locations_images_owner_write';
  IF NOT FOUND THEN
    CREATE POLICY "locations_images_owner_write" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'locations-images'
        AND name LIKE ('locations/' || auth.uid()::text || '/%')
      );
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'locations_images_owner_update_delete';
  IF NOT FOUND THEN
    CREATE POLICY "locations_images_owner_update_delete" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'locations-images'
        AND name LIKE ('locations/' || auth.uid()::text || '/%')
      )
      WITH CHECK (
        bucket_id = 'locations-images'
        AND name LIKE ('locations/' || auth.uid()::text || '/%')
      );
    CREATE POLICY "locations_images_owner_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'locations-images'
        AND name LIKE ('locations/' || auth.uid()::text || '/%')
      );
  END IF;
END $$;

-- ticket-qr: public read
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ticket_qr_public_read';
  IF NOT FOUND THEN
    CREATE POLICY "ticket_qr_public_read" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'ticket-qr');
  END IF;
END $$;

-- ticket-qr: allow inserts
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ticket_qr_insert';
  IF NOT FOUND THEN
    CREATE POLICY "ticket_qr_insert" ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'ticket-qr');
  END IF;
END $$;

-- ticket-qr: allow updates and deletes
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ticket_qr_update_delete';
  IF NOT FOUND THEN
    CREATE POLICY "ticket_qr_update_delete" ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'ticket-qr')
      WITH CHECK (bucket_id = 'ticket-qr');
    CREATE POLICY "ticket_qr_delete" ON storage.objects
      FOR DELETE
      USING (bucket_id = 'ticket-qr');
  END IF;
END $$;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Your database is now fully configured!
-- 
-- Next steps:
-- 1. Create storage buckets in Supabase Dashboard:
--    - event-images (public)
--    - event-gallery (public)
--    - locations-images (public)
--    - ticket-qr (public)
--
-- 2. Set up cron jobs (optional):
--    - Abandoned cart emails: */5 * * * * -> SELECT public.send_abandoned_cart_emails();
--    - Release expired reservations: */2 * * * * -> SELECT public.release_expired_reservations();
--
-- 3. Update the config table with your actual domain:
--    UPDATE public.config SET value = 'https://yourdomain.com/api/emails/send-abandoned-carts' 
--    WHERE key = 'abandoned_cart_api_url';
--
-- 4. To make a user an admin:
--    UPDATE public.profiles SET is_admin = true WHERE user_id = '<user-uuid>';
-- ============================================================================

