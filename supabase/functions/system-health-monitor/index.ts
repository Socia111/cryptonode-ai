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
    console.log('[System Health Monitor] Starting comprehensive health check...');

    const healthData = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy',
      components: {},
      alerts: [],
      metrics: {}
    };

    // Check signal generation health
    const { data: recentSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .eq('is_active', true);

    if (signalsError) {
      healthData.components.signals = { status: 'error', error: signalsError.message };
      healthData.alerts.push('Signal generation system error');
    } else {
      const signalCount = recentSignals?.length || 0;
      healthData.components.signals = { 
        status: signalCount > 0 ? 'healthy' : 'degraded', 
        count: signalCount 
      };
      healthData.metrics.signals_last_10min = signalCount;
    }

    // Check market data health
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(10);

    if (marketError) {
      healthData.components.market_data = { status: 'error', error: marketError.message };
      healthData.alerts.push('Market data feed error');
    } else {
      const dataCount = marketData?.length || 0;
      healthData.components.market_data = { 
        status: dataCount > 0 ? 'healthy' : 'degraded', 
        count: dataCount 
      };
      healthData.metrics.market_data_last_5min = dataCount;
    }

    // Check execution health
    const { data: executions, error: execError } = await supabase
      .from('execution_orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(50);

    if (execError) {
      healthData.components.execution = { status: 'error', error: execError.message };
    } else {
      const successCount = executions?.filter(e => e.status === 'executed').length || 0;
      const totalCount = executions?.length || 0;
      const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
      
      healthData.components.execution = { 
        status: successRate > 70 ? 'healthy' : successRate > 30 ? 'degraded' : 'unhealthy',
        success_rate: successRate,
        total_orders: totalCount
      };
      healthData.metrics.execution_success_rate = successRate;
    }

    // Determine overall status
    const componentStatuses = Object.values(healthData.components).map(c => c.status);
    if (componentStatuses.includes('error') || componentStatuses.includes('unhealthy')) {
      healthData.overall_status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      healthData.overall_status = 'degraded';
    }

    // Log health summary
    console.log(`[System Health Monitor] Overall status: ${healthData.overall_status}`);
    console.log(`[System Health Monitor] Alerts: ${healthData.alerts.length}`);

    return new Response(JSON.stringify(healthData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[System Health Monitor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      overall_status: 'error',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});