import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseConnection() {
  try {
    const { data, error } = await supabase.from('signals').select('count', { count: 'exact', head: true });
    return { connected: !error, error: error?.message };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

async function checkEdgeFunctions() {
  const functions = [
    'signals-api',
    'aitradex1-trade-executor', 
    'bybit-authenticate',
    'symbol-validator'
  ];
  
  const results: any = {};
  
  for (const fn of functions) {
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { action: 'status' }
      });
      results[fn] = { available: !error, error: error?.message };
    } catch (e) {
      results[fn] = { available: false, error: e.message };
    }
  }
  
  return results;
}

async function checkBybitConnectivity() {
  try {
    const response = await fetch('https://api.bybit.com/v5/market/time');
    const data = await response.json();
    return { 
      connected: data.retCode === 0, 
      serverTime: data.result?.timeSecond,
      error: data.retCode !== 0 ? data.retMsg : null
    };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Running system diagnostics...');
    
    const [db, functions, bybit] = await Promise.all([
      checkDatabaseConnection(),
      checkEdgeFunctions(),
      checkBybitConnectivity()
    ]);

    // Get signal counts
    const { count: signalCount } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get market count
    const { count: marketCount } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true);

    const diagnostics = {
      timestamp: new Date().toISOString(),
      database: db,
      edge_functions: functions,
      bybit: bybit,
      data: {
        signals_24h: signalCount || 0,
        markets_enabled: marketCount || 0
      },
      environment: {
        supabase_url: !!Deno.env.get('SUPABASE_URL'),
        bybit_keys: {
          api_key: !!Deno.env.get('BYBIT_API_KEY'),
          api_secret: !!Deno.env.get('BYBIT_API_SECRET')
        }
      }
    };

    const overallHealth = db.connected && bybit.connected && 
      Object.values(functions).some((f: any) => f.available);

    return new Response(JSON.stringify({
      success: true,
      health: overallHealth ? 'healthy' : 'degraded',
      diagnostics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in diagnostics:', error);
    return new Response(JSON.stringify({
      success: false,
      health: 'error',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});