-- Fix table structure and create proper production tables
-- Create AIRA rankings table first
create table if not exists public.aira_rankings (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,
  aira_score numeric not null default 0,
  rank integer,
  market_cap numeric default 0,
  liquidity_score numeric default 0,
  smart_money_flows numeric default 0,
  sentiment_score numeric default 0,
  on_chain_activity numeric default 0,
  holder_distribution numeric default 0,
  ml_pattern_score numeric default 0,
  quantum_probability numeric default 0,
  factors jsonb default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Add rank position for compatibility
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='aira_rankings' and column_name='rank_position') then
    alter table public.aira_rankings add column rank_position integer;
  end if;
end$$;

-- Add index for rankings (only after table exists)
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'aira_rankings_score_idx') then
    create index aira_rankings_score_idx on public.aira_rankings(aira_score desc, rank asc);
  end if;
end$$;

-- Enable RLS
alter table public.aira_rankings enable row level security;

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