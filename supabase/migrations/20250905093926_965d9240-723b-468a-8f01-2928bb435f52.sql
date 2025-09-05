-- 0) Extensions (optional as needed)
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 1) Core tables

create table if not exists public.user_trading_configs (
  user_id uuid primary key,
  auto_execute_enabled boolean not null default false,
  min_confidence_score int not null default 80,
  max_open_positions int not null default 3,
  risk_per_trade numeric not null default 1.0, -- percent
  leverage int not null default 5,
  position_mode text not null default 'one-way', -- or 'hedge'
  updated_at timestamptz not null default now()
);

create table if not exists public.signals (
  id uuid primary key default uuid_generate_v4(),
  symbol text not null,
  side text not null check (side in ('Buy','Sell')),
  timeframe text not null,
  confidence int not null,
  roi_target numeric, -- optional, %
  created_at timestamptz not null default now(),
  status text not null default 'new' -- new|enhanced|ignored
);

create index if not exists signals_created_idx on public.signals (created_at desc);
create index if not exists signals_status_idx on public.signals (status);

create table if not exists public.strategy_signals (
  id uuid primary key default uuid_generate_v4(),
  source_signal_id uuid references public.signals(id) on delete set null,
  symbol text not null,
  side text not null check (side in ('Buy','Sell')),
  timeframe text not null,
  confidence int not null,
  entry_hint numeric,  -- optional price hint
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
  order_link_id text unique, -- idempotency
  status text not null default 'pending', -- pending|open|closed|canceled|rejected
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trades_user_idx on public.trades (user_id, created_at desc);
create index if not exists trades_signal_idx on public.trades (strategy_signal_id);

-- (Optional) per-user keys if you'll support multi-tenant trading later
create table if not exists public.user_api_keys (
  user_id uuid primary key,
  api_key_encrypted bytea,
  api_secret_encrypted bytea,
  created_at timestamptz not null default now()
);

-- 2) RLS (loose defaults; tighten for multi-tenant)
alter table public.user_trading_configs enable row level security;
alter table public.strategy_signals      enable row level security;
alter table public.trades                enable row level security;
alter table public.user_api_keys         enable row level security;