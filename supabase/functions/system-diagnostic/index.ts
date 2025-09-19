import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[System Diagnostic] Running comprehensive system check...');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issues: [],
      components: {},
      performance: {}
    };

    // 1. Check recent signals
    const { data: recentSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (signalsError) {
      diagnostics.issues.push(`Signals error: ${signalsError.message}`);
      diagnostics.components.signals = { status: 'error', error: signalsError.message };
    } else {
      const signalCount = recentSignals?.length || 0;
      const highQualityCount = recentSignals?.filter(s => s.score >= 75).length || 0;
      
      diagnostics.components.signals = {
        status: signalCount > 0 ? 'active' : 'degraded',
        count: signalCount,
        high_quality_count: highQualityCount,
        latest_source: recentSignals?.[0]?.source || 'none'
      };
    }

    // 2. Check live market data
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(5);

    if (marketError) {
      diagnostics.issues.push(`Market data error: ${marketError.message}`);
      diagnostics.components.market_data = { status: 'error', error: marketError.message };
    } else {
      const dataCount = marketData?.length || 0;
      diagnostics.components.market_data = {
        status: dataCount > 0 ? 'active' : 'stale',
        count: dataCount,
        latest_update: marketData?.[0]?.updated_at || 'none'
      };
    }

    // 3. Check trade executor
    const { data: recentTrades, error: tradesError } = await supabase
      .from('execution_orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (tradesError) {
      diagnostics.issues.push(`Trade execution error: ${tradesError.message}`);
      diagnostics.components.trade_executor = { status: 'error', error: tradesError.message };
    } else {
      const tradeCount = recentTrades?.length || 0;
      const successCount = recentTrades?.filter(t => t.status === 'executed' || t.status === 'filled').length || 0;
      const successRate = tradeCount > 0 ? (successCount / tradeCount) * 100 : 0;
      
      diagnostics.components.trade_executor = {
        status: successRate > 50 ? 'active' : 'degraded',
        total_trades: tradeCount,
        success_rate: Math.round(successRate),
        latest_trade: recentTrades?.[0]?.created_at || 'none'
      };
    }

    // 4. Test critical functions
    const functionTests = [];
    
    try {
      const liveDataResponse = await supabase.functions.invoke('live-bybit-data-feed', {
        body: { test: true, symbols: ['BTCUSDT'] }
      });
      functionTests.push({
        function: 'live-bybit-data-feed',
        status: liveDataResponse.error ? 'error' : 'ok',
        response_time: Date.now() - performance.now()
      });
    } catch (error) {
      functionTests.push({
        function: 'live-bybit-data-feed',
        status: 'error',
        error: error.message
      });
    }

    try {
      const tradeResponse = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });
      functionTests.push({
        function: 'aitradex1-trade-executor',
        status: tradeResponse.error ? 'error' : 'ok',
        response_time: Date.now() - performance.now()
      });
    } catch (error) {
      functionTests.push({
        function: 'aitradex1-trade-executor',
        status: 'error',
        error: error.message
      });
    }

    diagnostics.components.edge_functions = {
      status: functionTests.every(t => t.status === 'ok') ? 'active' : 'degraded',
      tests: functionTests
    };

    // 5. Overall health determination
    const componentStatuses = Object.values(diagnostics.components).map(c => c.status);
    if (componentStatuses.includes('error')) {
      diagnostics.status = 'critical';
    } else if (componentStatuses.includes('degraded') || componentStatuses.includes('stale')) {
      diagnostics.status = 'degraded';
    }

    console.log(`[System Diagnostic] Overall status: ${diagnostics.status}`);
    console.log(`[System Diagnostic] Issues found: ${diagnostics.issues.length}`);

    return new Response(JSON.stringify(diagnostics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[System Diagnostic] Critical error:', error);
    return new Response(JSON.stringify({
      status: 'critical',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});