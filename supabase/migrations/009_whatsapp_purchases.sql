-- WhatsApp purchase bot support
-- Adds whatsapp_link to events and session tracking table

alter table public.events
  add column if not exists whatsapp_link text;

create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  buyer_phone text not null,
  buyer_name text,
  stage text not null default 'initial',
  event_id uuid references public.events(id) on delete set null,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  quantity integer,
  buyer_email text,
  order_id uuid references public.orders(id) on delete set null,
  paystack_reference text,
  paystack_access_code text,
  metadata jsonb not null default '{}'::jsonb,
  last_message text,
  last_message_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_phone)
);

create index if not exists idx_whatsapp_sessions_event_id on public.whatsapp_sessions(event_id);
create index if not exists idx_whatsapp_sessions_stage on public.whatsapp_sessions(stage);
create index if not exists idx_whatsapp_sessions_order_id on public.whatsapp_sessions(order_id);

drop trigger if exists trg_whatsapp_sessions_updated_at on public.whatsapp_sessions;
create trigger trg_whatsapp_sessions_updated_at
before update on public.whatsapp_sessions
for each row
execute function public.handle_updated_at();

alter table public.whatsapp_sessions enable row level security;


