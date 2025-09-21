import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🕒 Crypto Scheduler started - Live Trading Mode');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Scheduler tick - checking system status');
    
    // Check if automated trading is enabled
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .in('key', ['automated_trading_enabled', 'live_trading_enabled']);
    
    const automatedEnabled = settings?.find(s => s.key === 'automated_trading_enabled')?.value === true;
    const liveEnabled = settings?.find(s => s.key === 'live_trading_enabled')?.value === true;
    
    if (!automatedEnabled || !liveEnabled) {
      console.log('⏸️ Trading disabled, skipping execution');
      return new Response(JSON.stringify({
        success: true,
        status: 'disabled',
        message: 'Automated trading is disabled'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Trigger unified signal engine (1-hour signals only)
    console.log('📡 Triggering unified signal engine for 1h signals...');
    
    // Run unified signal engine with 1h timeframe only
    const unifiedResponse = await fetch(`${supabaseUrl}/functions/v1/unified-signal-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        scheduler: true,
        timeframes: ["1h"]
      })
    });

    // Parse results
    const unifiedResult = await unifiedResponse.json();
    
    console.log('Unified signal engine result:', unifiedResult);
    
    const totalSignalsGenerated = unifiedResult.signals_generated || 0;
    
    console.log(`📊 Total signals generated: ${totalSignalsGenerated}`);

    // Update scheduler status
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'crypto_scheduler',
        status: 'active',
        last_update: new Date().toISOString(),
        success_count: 1,
        metadata: {
          signals_generated: totalSignalsGenerated,
          unified_signals: unifiedResult.signals_generated || 0,
          algorithm: unifiedResult.algorithm || 'unified_1h',
          last_run: new Date().toISOString()
        }
      });

    console.log('✅ Scheduler execution completed');

    return new Response(JSON.stringify({
      success: true,
      scheduler_run: new Date().toISOString(),
      signals: {
        unified: unifiedResult,
        total_generated: totalSignalsGenerated,
        algorithm: 'unified_1h_only'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Scheduler error:', error);
    
    // Update scheduler status with error
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'crypto_scheduler',
        status: 'error',
        last_update: new Date().toISOString(),
        error_count: 1,
        metadata: { error: error.message }
      });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});