import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlgorithmRequest {
  action: 'trigger_all' | 'trigger_single' | 'get_status' | 'update_config';
  algorithmId?: string;
  config?: any;
  mode?: 'full' | 'signals_only' | 'data_only';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json() as AlgorithmRequest;
    console.log('[Algorithm Orchestrator] Request:', body.action);

    switch (body.action) {
      case 'trigger_all':
        return await triggerAllAlgorithms(supabase, body.mode || 'full');
      
      case 'trigger_single':
        if (!body.algorithmId) {
          throw new Error('Algorithm ID is required for single trigger');
        }
        return await triggerSingleAlgorithm(supabase, body.algorithmId, body.config);
      
      case 'get_status':
        return await getAlgorithmStatus(supabase);
      
      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

  } catch (error) {
    console.error('[Algorithm Orchestrator] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function triggerAllAlgorithms(supabase: any, mode: string) {
  console.log(`[Algorithm Orchestrator] Triggering all algorithms in ${mode} mode`);
  
  const algorithms = [
    'aitradex1-enhanced-scanner',
    'enhanced-signal-generation',
    'live-exchange-feed',
    'comprehensive-trading-pipeline'
  ];

  const results: any[] = [];
  const errors: any[] = [];

  // Trigger algorithms in parallel
  const promises = algorithms.map(async (algorithmName) => {
    try {
      console.log(`[Algorithm Orchestrator] Triggering ${algorithmName}...`);
      
      const payload = {
        mode,
        timestamp: new Date().toISOString(),
        triggered_by: 'algorithm-orchestrator'
      };

      const { data, error } = await supabase.functions.invoke(algorithmName, {
        body: payload
      });

      if (error) {
        console.error(`[Algorithm Orchestrator] ${algorithmName} failed:`, error);
        errors.push({ algorithm: algorithmName, error: error.message });
        return null;
      }

      console.log(`[Algorithm Orchestrator] ✅ ${algorithmName} completed successfully`);
      results.push({ algorithm: algorithmName, result: data });
      return data;

    } catch (error) {
      console.error(`[Algorithm Orchestrator] ${algorithmName} exception:`, error);
      errors.push({ algorithm: algorithmName, error: error.message });
      return null;
    }
  });

  await Promise.all(promises);

  // Update algorithm status in database
  await updateAlgorithmStatus(supabase, results, errors);

  return new Response(JSON.stringify({
    success: true,
    mode,
    timestamp: new Date().toISOString(),
    algorithmsTriggered: algorithms.length,
    successfulAlgorithms: results.length,
    failedAlgorithms: errors.length,
    results,
    errors
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function triggerSingleAlgorithm(supabase: any, algorithmId: string, config?: any) {
  console.log(`[Algorithm Orchestrator] Triggering single algorithm: ${algorithmId}`);
  
  try {
    const payload = {
      mode: 'full',
      timestamp: new Date().toISOString(),
      triggered_by: 'algorithm-orchestrator',
      ...config
    };

    const { data, error } = await supabase.functions.invoke(algorithmId, {
      body: payload
    });

    if (error) {
      throw error;
    }

    // Update individual algorithm status
    await updateSingleAlgorithmStatus(supabase, algorithmId, 'success', data);

    console.log(`[Algorithm Orchestrator] ✅ ${algorithmId} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      algorithmId,
      timestamp: new Date().toISOString(),
      result: data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    await updateSingleAlgorithmStatus(supabase, algorithmId, 'error', null, error.message);
    throw error;
  }
}

async function getAlgorithmStatus(supabase: any) {
  console.log('[Algorithm Orchestrator] Getting algorithm status');
  
  try {
    // Get recent signals count by source
    const { data: signalCounts } = await supabase
      .from('signals')
      .select('source')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Group signals by source
    const signalsBySource = signalCounts?.reduce((acc: any, signal: any) => {
      const source = signal.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get recent execution orders
    const { data: recentTrades } = await supabase
      .from('execution_orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Get exchange feed status
    const { data: exchangeStatus } = await supabase
      .from('exchange_feed_status')
      .select('*')
      .order('last_update', { ascending: false });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      signalsBySource,
      totalSignalsToday: Object.values(signalsBySource).reduce((sum: number, count: any) => sum + count, 0),
      recentTrades: recentTrades?.length || 0,
      exchangeStatus: exchangeStatus || [],
      systemHealth: {
        signalGeneration: Object.keys(signalsBySource).length > 0 ? 'healthy' : 'warning',
        tradeExecution: recentTrades && recentTrades.length > 0 ? 'active' : 'idle',
        marketData: exchangeStatus && exchangeStatus.length > 0 ? 'connected' : 'disconnected'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Algorithm Orchestrator] Status check failed:', error);
    throw error;
  }
}

async function updateAlgorithmStatus(supabase: any, results: any[], errors: any[]) {
  try {
    // Log successful algorithms
    for (const result of results) {
      await supabase
        .from('audit_log')
        .insert({
          action: 'algorithm_triggered',
          resource_type: 'algorithm',
          resource_id: result.algorithm,
          metadata: {
            status: 'success',
            result: result.result,
            timestamp: new Date().toISOString()
          }
        });
    }

    // Log failed algorithms
    for (const error of errors) {
      await supabase
        .from('audit_log')
        .insert({
          action: 'algorithm_failed',
          resource_type: 'algorithm',
          resource_id: error.algorithm,
          metadata: {
            status: 'error',
            error: error.error,
            timestamp: new Date().toISOString()
          }
        });
    }

    console.log(`[Algorithm Orchestrator] Status updated: ${results.length} success, ${errors.length} errors`);

  } catch (error) {
    console.error('[Algorithm Orchestrator] Failed to update status:', error);
  }
}

async function updateSingleAlgorithmStatus(supabase: any, algorithmId: string, status: string, result?: any, error?: string) {
  try {
    await supabase
      .from('audit_log')
      .insert({
        action: status === 'success' ? 'algorithm_triggered' : 'algorithm_failed',
        resource_type: 'algorithm',
        resource_id: algorithmId,
        metadata: {
          status,
          result,
          error,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`[Algorithm Orchestrator] ${algorithmId} status updated: ${status}`);

  } catch (logError) {
    console.error('[Algorithm Orchestrator] Failed to log status:', logError);
  }
}