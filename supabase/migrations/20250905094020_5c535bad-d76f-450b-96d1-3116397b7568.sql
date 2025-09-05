-- 3) Helper function: atomically queue top N signals WITHOUT using ORDER BY/LIMIT in UPDATE
--    Pattern: ORDER BY/LIMIT in the CTE, then update by joining that CTE.

create or replace function public.queue_top_strategy_signals(
  p_min_confidence int default 80,
  p_timeframes text[] default array['15m','30m'],
  p_limit int default 10
)
returns table (queued_id uuid) language plpgsql as $$
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

-- 4) Helper function: mark a signal as sent/executed and write trade (idempotent via order_link_id)

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
  -- mark sent
  update public.strategy_signals
     set status = 'sent', sent_at = now()
   where id = p_strategy_signal_id
     and status in ('queued','new'); -- tolerate race

  -- upsert trade by order_link_id idempotently
  insert into public.trades (user_id, strategy_signal_id, symbol, side, qty, tp_price, sl_price, order_link_id, status)
  values (p_user_id, p_strategy_signal_id, p_symbol, p_side, p_qty, p_tp, p_sl, p_order_link_id, 'pending')
  on conflict (order_link_id)
  do update set updated_at = now()
  returning id into v_trade_id;

  return v_trade_id;
end$$;

-- 5) Example RPC to fetch & queue in one roundtrip (for your poller/Edge Function)

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
) language plpgsql as $$
begin
  -- queue first (atomic)
  perform * from public.queue_top_strategy_signals(p_min_confidence, p_timeframes, p_limit);

  -- return the queued rows to the caller
  return query
  select s.id, s.symbol, s.side, s.timeframe, s.confidence, s.tp_price, s.sl_price
  from public.strategy_signals s
  where s.status = 'queued'
  order by s.queued_at asc
  limit p_limit;
end$$;

-- 6) Start a new automated trading session
SELECT public.start_automated_trading_session() as session_id;