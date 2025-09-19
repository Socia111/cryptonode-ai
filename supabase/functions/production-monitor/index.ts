import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'health' } = await req.json().catch(() => ({}));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;

    switch (action) {
      case 'health':
        result = await getSystemHealth(supabase);
        break;
      case 'signals_stats':
        result = await getSignalsStats(supabase);
        break;
      case 'alert_rates':
        result = await getAlertRates(supabase);
        break;
      case 'filter_analysis':
        result = await getFilterAnalysis(supabase);
        break;
      default:
        result = await getSystemHealth(supabase);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Production Monitor Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// System health check
async function getSystemHealth(supabase: any) {
  // Latest signal time per exchange
  const { data: latestSignals } = await supabase
    .from('signals')
    .select('exchange, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  // Recent scan activity
  const { data: recentScans } = await supabase
    .from('scans')
    .select('exchange, timeframe, started_at, signals_count')
    .gte('started_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Last 4 hours
    .order('started_at', { ascending: false });

  // Error count last 24h
  const { data: errors, count: errorCount } = await supabase
    .from('errors_log')
    .select('*', { count: 'exact' })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    latest_signals: latestSignals,
    recent_scans: recentScans,
    error_count_24h: errorCount,
    system_status: errorCount < 10 ? 'healthy' : 'degraded'
  };
}

// Signals statistics
async function getSignalsStats(supabase: any) {
  const { data } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        exchange,
        timeframe,
        direction,
        COUNT(*) as count,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score
      FROM signals 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY exchange, timeframe, direction
      ORDER BY count DESC
    `
  });

  return data || [];
}

// Alert success rates
async function getAlertRates(supabase: any) {
  const { data } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        channel,
        COUNT(*) as sent,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as ok,
        ROUND(100.0 * AVG(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 2) as ok_rate
      FROM alerts_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY channel
      ORDER BY sent DESC
    `
  });

  return data || [];
}

// Filter analysis for debugging "no signals"
async function getFilterAnalysis(supabase: any) {
  const { data } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        (filters->>'trend')::bool as trend,
        (filters->>'adx')::bool as adx,
        (filters->>'dmi')::bool as dmi,
        (filters->>'stoch')::bool as stoch,
        (filters->>'volume')::bool as volume,
        (filters->>'obv')::bool as obv,
        (filters->>'hvp')::bool as hvp,
        (filters->>'spread')::bool as spread,
        (filters->>'breakout')::bool as breakout,
        COUNT(*) as cnt
      FROM signals
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY 1,2,3,4,5,6,7,8,9
      ORDER BY cnt DESC
      LIMIT 20
    `
  });

  return data || [];
}