// hooks/useObservability.ts
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ---------- tiny helpers ----------
function useInterval(fn: () => void, ms: number | null) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function useRealtimeRefresh(
  channelName: string,
  table: string,
  refresh: () => void,
  opts?: { events?: Array<'INSERT'|'UPDATE'|'DELETE'>; schema?: string }
) {
  const { events = ['INSERT','UPDATE'], schema = 'public' } = opts || {};
  useEffect(() => {
    const ch = supabase
      .channel(channelName, { config: { broadcast: { ack: true } } })
      .on(
        'postgres_changes',
        { event: '*', schema, table },
        (payload) => {
          if (events.includes(payload.eventType as any)) {
            refresh();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [channelName, table, schema, refresh, JSON.stringify(opts)]);
}

// ---------- types ----------
export type SignalLive = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'LONG'|'SHORT'|string;
  price: number;
  score: number;
  grade: 'A+'|'A'|'B'|'C'|string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  source: string | null;
  algo: string | null;
};

export type SignalWithOrder = {
  signal_id: string;
  symbol: string;
  timeframe: string;
  direction: string;
  price: number | null;
  score: number | null;
  grade: string;
  signal_time: string;
  order_id: string | null;
  order_status: string | null;
  qty: number | null;
  order_time: string | null;
};

export type KPI = {
  signals_30m: number;
  orders_30m: number;
  latest_signal: string | null;
  latest_order: string | null;
};

export type HeartbeatRow = {
  component: string;
  status: string;
  last_heartbeat: string;
};

// ---------- hooks ----------
export function useDebugKPIs(refreshMs = 30000) {
  const [data, setData] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    try {
      setErr(null);
      // Since we don't have the RPC function yet, let's create manual query
      const [signalsResult, ordersResult] = await Promise.all([
        supabase
          .from('signals')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()),
        supabase
          .from('execution_queue')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      ]);

      const signals = signalsResult.data || [];
      const orders = ordersResult.data || [];

      setData({
        signals_30m: signals.length,
        orders_30m: orders.length,
        latest_signal: signals.length > 0 ? signals[signals.length - 1].created_at : null,
        latest_order: orders.length > 0 ? orders[orders.length - 1].created_at : null
      });
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetcher(); }, [fetcher]);
  useInterval(fetcher, refreshMs);

  // realtime: refresh when base tables change
  useRealtimeRefresh('kpis_signals', 'signals', fetcher);
  useRealtimeRefresh('kpis_orders', 'execution_queue', fetcher);

  return { data, loading, error: err, refresh: fetcher };
}

export function useSignalsLive(limit = 100, refreshMs = 30000) {
  const [rows, setRows] = useState<SignalLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    try {
      setErr(null);
      const { data, error } = await supabase
        .from('signals')
        .select('id, symbol, timeframe, direction, price, score, signal_grade, created_at, expires_at, is_active, source, algo')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setRows((data || []).map(s => ({ ...s, grade: s.signal_grade || 'C' })) as SignalLive[]);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetcher(); }, [fetcher]);
  useInterval(fetcher, refreshMs);

  useRealtimeRefresh('signals_live_base', 'signals', fetcher);

  return { rows, loading, error: err, refresh: fetcher };
}

export function useSignalsWithOrdersLast30m(limit = 300, refreshMs = 30000) {
  const [rows, setRows] = useState<SignalWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    try {
      setErr(null);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: signals, error: signalsError } = await supabase
        .from('signals')
        .select(`
          id,
          symbol,
          timeframe,
          direction,
          price,
          score,
          signal_grade,
          created_at
        `)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (signalsError) throw signalsError;

      // Get orders separately to avoid relation issues
      const { data: orders, error: ordersError } = await supabase
        .from('execution_queue')
        .select('id, signal_id, status, amount_usd, created_at')
        .gte('created_at', thirtyMinutesAgo);

      if (ordersError) throw ordersError;

      const mappedRows = (signals || []).map(s => {
        const relatedOrders = (orders || []).filter(o => o.signal_id === s.id);
        if (relatedOrders.length === 0) {
          return [{
            signal_id: s.id,
            symbol: s.symbol,
            timeframe: s.timeframe,
            direction: s.direction,
            price: s.price,
            score: s.score,
            grade: s.signal_grade || 'C',
            signal_time: s.created_at,
            order_id: null,
            order_status: null,
            qty: null,
            order_time: null
          }];
        }
        return relatedOrders.map(order => ({
          signal_id: s.id,
          symbol: s.symbol,
          timeframe: s.timeframe,
          direction: s.direction,
          price: s.price,
          score: s.score,
          grade: s.signal_grade || 'C',
          signal_time: s.created_at,
          order_id: order.id,
          order_status: order.status,
          qty: order.amount_usd,
          order_time: order.created_at
        }));
      }).flat();

      setRows(mappedRows as SignalWithOrder[]);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetcher(); }, [fetcher]);
  useInterval(fetcher, refreshMs);

  useRealtimeRefresh('joined_signals', 'signals', fetcher);
  useRealtimeRefresh('joined_orders', 'execution_queue', fetcher);

  return { rows, loading, error: err, refresh: fetcher };
}

export function useHeartbeat(refreshMs = 30000) {
  const [rows, setRows] = useState<HeartbeatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    try {
      setErr(null);
      const { data, error } = await supabase
        .from('system_status')
        .select('service_name, status, last_update')
        .order('last_update', { ascending: false });
      if (error) throw error;
      setRows((data || []).map(s => ({ 
        component: s.service_name, 
        status: s.status, 
        last_heartbeat: s.last_update 
      })) as HeartbeatRow[]);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetcher(); }, [fetcher]);
  useInterval(fetcher, refreshMs);

  useRealtimeRefresh('heartbeat', 'system_status', fetcher);

  const staleThreshold = useMemo(() => Date.now() - 2 * 60 * 1000, []);
  const summary = useMemo(() => {
    const byComponent = new Map<string, { status: string; last: Date }>();
    for (const r of rows) {
      byComponent.set(r.component, { status: r.status, last: new Date(r.last_heartbeat) });
    }
    const items = [...byComponent.entries()].map(([component, v]) => ({
      component,
      status: v.status,
      last_heartbeat: v.last,
      stale: v.last.getTime() < staleThreshold
    }));
    const unhealthy = items.filter(i => i.status !== 'active' || i.stale).length;
    return { items, unhealthy };
  }, [rows, staleThreshold]);

  return { rows, loading, error: err, refresh: fetcher, summary };
}