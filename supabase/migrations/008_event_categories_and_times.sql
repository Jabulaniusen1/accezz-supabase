begin;

-- 1) Event categories catalog
create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_event_category_slug()
returns trigger language plpgsql as $$
declare
  base_slug text;
  candidate text;
  suffix int := 0;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;

  while exists(select 1 from public.event_categories where slug = candidate and id <> new.id) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;

  new.slug = candidate;
  return new;
end;
$$;

drop trigger if exists trg_event_categories_slug on public.event_categories;
create trigger trg_event_categories_slug
before insert or update of name, slug on public.event_categories
for each row execute function public.generate_event_category_slug();

drop trigger if exists trg_event_categories_updated_at on public.event_categories;
create trigger trg_event_categories_updated_at
before update on public.event_categories
for each row execute function public.handle_updated_at();

-- 2) Restructure events scheduling and classification
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'date'
  ) then
    alter table public.events rename column date to start_time;
  end if;
end
$$;

alter table public.events
  drop column if exists time;

alter table public.events
  add column if not exists end_time timestamptz,
  add column if not exists category_id uuid references public.event_categories(id) on delete set null,
  add column if not exists category_custom text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7);

-- Ensure start_time is always present
alter table public.events
  alter column start_time set not null;

create index if not exists idx_events_category_id on public.events(category_id);
create index if not exists idx_events_start_time on public.events(start_time);

-- Seed default categories
insert into public.event_categories (name)
values
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
on conflict (name) do nothing;

commit;

