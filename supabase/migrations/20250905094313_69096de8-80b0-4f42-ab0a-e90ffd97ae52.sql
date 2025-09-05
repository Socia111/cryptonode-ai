-- =========================================================
-- 0) Extensions (safe)
-- =========================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================================================
-- 1) Ensure existing `signals` has the columns we need
--    (Add-only; never drops or renames here)
-- =========================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='signals' and column_name='status'
  ) then
    alter table public.signals add column status text not null default 'new';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='signals' and column_name='timeframe'
  ) then
    alter table public.signals add column timeframe text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='signals' and column_name='confidence'
  ) then
    alter table public.signals add column confidence int;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='signals' and column_name='roi_target'
  ) then
    alter table public.signals add column roi_target numeric;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='signals' and column_name='created_at'
  ) then
    alter table public.signals add column created_at timestamptz not null default now();
  end if;
end$$;

-- Helpful indexes (safe if not exists)
create index if not exists signals_created_idx on public.signals (created_at desc);
create index if not exists signals_status_idx  on public.signals (status);

-- =========================================================
-- 2) Create related tables only if missing
-- =========================================================
create table if not exists public.user_trading_configs (
  user_id uuid primary key,
  auto_execute_enabled boolean not null default false,
  min_confidence_score int not null default 80,
  max_open_positions int not null default 3,
  risk_per_trade numeric not null default 1.0,
  leverage int not null default 5,
  position_mode text not null default 'one-way',
  updated_at timestamptz not null default now()
);

create table if not exists public.strategy_signals (
  id uuid primary key default uuid_generate_v4(),
  source_signal_id uuid references public.signals(id) on delete set null,
  symbol text not null,
  side text not null check (side in ('Buy','Sell')),
  timeframe text not null,
  confidence int not null,
  entry_hint numeric,
  tp_price numeric,
  sl_price numeric,
  status text not null default 'new', -- new|queued|sent|executed|failed|canceled
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  sent_at timestamptz,
  executed_at timestamptz
);

create index if not exists strat_sig_created_idx on public.strategy_signals (created_at desc);
create index if not exists strat_sig_status_idx  on public.strategy_signals (status, confidence desc);

create table if not exists public.trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  strategy_signal_id uuid references public.strategy_signals(id) on delete set null,
  symbol text not null,
  side text not null check (side in ('Buy','Sell')),
  qty numeric not null,
  entry_price numeric,
  tp_price numeric,
  sl_price numeric,
  fees numeric default 0,
  order_link_id text unique,
  status text not null default 'pending', -- pending|open|closed|canceled|rejected
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trades_user_idx   on public.trades (user_id, created_at desc);
create index if not exists trades_signal_idx on public.trades (strategy_signal_id);

-- Optional multi-tenant key store (only if you need it later)
create table if not exists public.user_api_keys (
  user_id uuid primary key,
  api_key_encrypted bytea,
  api_secret_encrypted bytea,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3) RLS (enable + permissive policies only if missing)
--    Tighten later for multi-tenant.
-- =========================================================
alter table public.user_trading_configs enable row level security;
alter table public.strategy_signals      enable row level security;
alter table public.trades                enable row level security;
alter table public.user_api_keys         enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_trading_configs' and policyname='allow_all_user_trading_configs'
  ) then
    create policy "allow_all_user_trading_configs" on public.user_trading_configs for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='strategy_signals' and policyname='allow_all_strategy_signals'
  ) then
    create policy "allow_all_strategy_signals" on public.strategy_signals for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='trades' and policyname='allow_all_trades'
  ) then
    create policy "allow_all_trades" on public.trades for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_api_keys' and policyname='allow_all_user_api_keys'
  ) then
    create policy "allow_all_user_api_keys" on public.user_api_keys for all using (true) with check (true);
  end if;
end$$;

-- =========================================================
-- 4) Queue function (atomic; no ORDER BY/LIMIT in UPDATE)
-- =========================================================
create or replace function public.queue_top_strategy_signals(
  p_min_confidence int default 80,
  p_timeframes text[] default array['15m','30m'],
  p_limit int default 10
)
returns table (queued_id uuid)
language plpgsql
as $$
begin
  return query
  with candidates as (
    select id
    from public.strategy_signals
    where status = 'new'
      and confidence >= p_min_confidence
      and timeframe = any(p_timeframes)
    order by confidence desc, created_at asc
    limit p_limit
    for update skip locked
  ),
  upd as (
    update public.strategy_signals s
       set status = 'queued', queued_at = now()
      from candidates c
     where s.id = c.id
    returning s.id
  )
  select id from upd;
end$$;

-- =========================================================
-- 5) Trade logging (idempotent on order_link_id)
-- =========================================================
create or replace function public.log_trade_sent(
  p_user_id uuid,
  p_strategy_signal_id uuid,
  p_symbol text,
  p_side text,
  p_qty numeric,
  p_tp numeric,
  p_sl numeric,
  p_order_link_id text
)
returns uuid
language plpgsql
as $$
declare
  v_trade_id uuid;
begin
  update public.strategy_signals
     set status = 'sent', sent_at = now()
   where id = p_strategy_signal_id
     and status in ('queued','new');

  insert into public.trades (user_id, strategy_signal_id, symbol, side, qty, tp_price, sl_price, order_link_id, status)
  values (p_user_id, p_strategy_signal_id, p_symbol, p_side, p_qty, p_tp, p_sl, p_order_link_id, 'pending')
  on conflict (order_link_id)
  do update set updated_at = now()
  returning id into v_trade_id;

  return v_trade_id;
end$$;

-- =========================================================
-- 6) Fetch + queue convenience RPC for your poller
-- =========================================================
create or replace function public.fetch_signals_to_execute(
  p_min_confidence int default 80,
  p_timeframes text[] default array['15m','30m'],
  p_limit int default 10
)
returns table(
  id uuid,
  symbol text,
  side text,
  timeframe text,
  confidence int,
  tp_price numeric,
  sl_price numeric
)
language plpgsql
as $$
begin
  perform * from public.queue_top_strategy_signals(p_min_confidence, p_timeframes, p_limit);

  return query
  select s.id, s.symbol, s.side, s.timeframe, s.confidence, s.tp_price, s.sl_price
  from public.strategy_signals s
  where s.status = 'queued'
  order by s.queued_at asc
  limit p_limit;
end$$;