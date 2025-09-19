import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// This edge function acts as a scheduler that keeps the automation running
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⏰ Automated Scheduler Running - ' + new Date().toISOString());

    // Phase 1: Check if automation should be running
    const { data: config } = await supabase
      .from('automated_trading_config')
      .select('*')
      .eq('enabled', true)
      .single();

    if (!config) {
      console.log('❌ Automated trading not enabled, skipping...');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Automated trading disabled' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Automated trading enabled for user:', config.user_id);

    // Phase 2: Generate new signals every run
    console.log('📡 Step 1: Generating fresh signals...');
    const signalGen = await supabase.functions.invoke('signal-auto-generator', {
      body: { 
        mode: 'scheduled_run',
        force_refresh: true 
      }
    });

    console.log('📊 Signal generation result:', signalGen.data || signalGen.error);

    // Wait a moment for signals to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 3: Process signals and execute trades
    console.log('🚀 Step 2: Processing signals and executing trades...');
    const orchestrator = await supabase.functions.invoke('fully-automated-orchestrator', {
      body: { 
        mode: 'scheduled_execution',
        user_id: config.user_id 
      }
    });

    console.log('🤖 Orchestrator result:', orchestrator.data || orchestrator.error);

    // Phase 4: Update scheduler status
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'automated_scheduler',
        status: 'active',
        metadata: {
          last_run: new Date().toISOString(),
          scheduler_active: true,
          next_run_in_seconds: 120, // 2 minutes
          signal_generation: signalGen.data ? 'success' : 'error',
          trade_execution: orchestrator.data ? 'success' : 'error'
        },
        success_count: 1,
        last_update: new Date().toISOString()
      });

    // Phase 5: Schedule next run (this would typically be done via cron in production)
    console.log('⏰ Scheduler cycle completed, next run in 2 minutes');

    return new Response(JSON.stringify({
      success: true,
      message: 'Automated scheduler completed successfully',
      signal_result: signalGen.data || signalGen.error,
      orchestrator_result: orchestrator.data || orchestrator.error,
      next_run: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Automated scheduler error:', error);
    
    // Update system status with error
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'automated_scheduler',
        status: 'error',
        metadata: {
          last_error: error.message,
          error_timestamp: new Date().toISOString()
        },
        error_count: 1,
        last_update: new Date().toISOString()
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
