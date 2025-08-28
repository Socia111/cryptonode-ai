-- Fix migration idempotency and create proper tables
-- 01_tables.sql
create table if not exists public.configs (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Add columns safely (repeatable migration style)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='configs' and column_name='scope') then
    alter table public.configs add column scope text default 'global';
  end if;
end$$;

-- Signals state table for cooldown management
create table if not exists public.signals_state (
  exchange text not null,
  symbol text not null,
  timeframe text not null,
  direction text not null check (direction in ('LONG','SHORT')),
  last_emitted timestamptz not null,
  primary key (exchange, symbol, timeframe, direction)
);

-- Enhanced signals table
create table if not exists public.signals (
  id bigserial primary key,
  algo text not null,
  exchange text not null,
  symbol text not null,
  timeframe text not null,
  direction text not null check (direction in ('LONG','SHORT')),
  bar_time timestamptz not null,
  price numeric not null,
  score numeric not null,
  atr numeric,
  sl numeric,
  tp numeric,
  hvp numeric,
  filters jsonb,
  indicators jsonb,
  relaxed_mode boolean default false,
  created_at timestamptz not null default now(),
  projected_roi numeric default 0,
  risk_reward_ratio numeric default 0,
  aira_rank integer,
  aira_boost_applied numeric default 0
);

-- Add indexes if they don't exist
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'signals_q') then
    create index signals_q on public.signals(exchange, symbol, timeframe, created_at desc);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'signals_score_idx') then
    create index signals_score_idx on public.signals(score desc, created_at desc);
  end if;
end$$;

-- AIRA rankings table
create table if not exists public.aira_rankings (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,
  aira_score numeric not null,
  rank integer,
  market_cap numeric,
  liquidity_score numeric,
  smart_money_flows numeric,
  sentiment_score numeric,
  on_chain_activity numeric,
  holder_distribution numeric,
  ml_pattern_score numeric,
  quantum_probability numeric,
  factors jsonb default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Add index for rankings
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'aira_rankings_score_idx') then
    create index aira_rankings_score_idx on public.aira_rankings(aira_score desc, rank asc);
  end if;
end$$;

-- Enable RLS and create policies
alter table public.signals enable row level security;
alter table public.aira_rankings enable row level security;
alter table public.signals_state enable row level security;

-- RLS policies for signals (public read, service role write)
drop policy if exists "read_signals_public" on public.signals;
create policy "read_signals_public"
on public.signals for select
to anon, authenticated
using (true);

drop policy if exists "write_signals_service" on public.signals;
create policy "write_signals_service"
on public.signals for all
to service_role
using (true) with check (true);

-- RLS policies for AIRA rankings
drop policy if exists "read_aira_public" on public.aira_rankings;
create policy "read_aira_public"
on public.aira_rankings for select
to anon, authenticated
using (true);

drop policy if exists "write_aira_service" on public.aira_rankings;
create policy "write_aira_service"
on public.aira_rankings for all
to service_role
using (true) with check (true);

-- RLS policies for signals state
drop policy if exists "read_signals_state_service" on public.signals_state;
create policy "read_signals_state_service"
on public.signals_state for select
to service_role
using (true);

drop policy if exists "write_signals_state_service" on public.signals_state;
create policy "write_signals_state_service"
on public.signals_state for all
to service_role
using (true) with check (true);