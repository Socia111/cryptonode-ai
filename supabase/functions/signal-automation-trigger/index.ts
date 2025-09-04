import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { record, old_record } = await req.json();
    
    console.log('[Signal Automation] New signal received:', record);

    // Check if this is a new high-confidence signal
    if (record && record.score >= 77 && record.created_at) {
      console.log(`[Signal Automation] High confidence signal detected: ${record.symbol} ${record.direction} Score: ${record.score}`);
      
      // Check if automated trading is enabled for any users
      const { data: automationSettings, error: settingsError } = await supabase
        .from('user_trading_configs')
        .select('*')
        .eq('auto_execute_enabled', true)
        .gte('min_confidence_score', record.score);

      if (settingsError) {
        console.error('[Signal Automation] Error fetching automation settings:', settingsError);
        return new Response(JSON.stringify({ success: false, error: settingsError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (automationSettings && automationSettings.length > 0) {
        console.log(`[Signal Automation] Found ${automationSettings.length} users with automation enabled`);
        
        // For each user with automation enabled, trigger their trading engine
        for (const userConfig of automationSettings) {
          try {
            console.log(`[Signal Automation] Triggering automation for user ${userConfig.user_id}`);
            
            // Call the automated trading engine to execute this specific signal
            const { data: executionResult, error: executionError } = await supabase.functions.invoke('bybit-automated-trading', {
              body: {
                action: 'execute_single_signal',
                signal: record,
                config: {
                  enabled: true,
                  max_position_size: userConfig.max_position_size || 10,
                  risk_per_trade: userConfig.risk_per_trade || 2,
                  max_open_positions: userConfig.max_open_positions || 5,
                  min_confidence_score: userConfig.min_confidence_score || 77,
                  timeframes: userConfig.timeframes || ['5m', '15m'],
                  use_leverage: userConfig.use_leverage || false,
                  leverage_amount: userConfig.leverage_amount || 1
                },
                user_id: userConfig.user_id
              }
            });

            if (executionError) {
              console.error(`[Signal Automation] Execution failed for user ${userConfig.user_id}:`, executionError);
            } else if (executionResult?.success) {
              console.log(`[Signal Automation] ✅ Successfully executed signal for user ${userConfig.user_id}`);
            }
          } catch (error) {
            console.error(`[Signal Automation] Error processing automation for user ${userConfig.user_id}:`, error);
          }
        }
      } else {
        console.log('[Signal Automation] No users have automation enabled for this signal');
      }
    } else {
      console.log(`[Signal Automation] Signal doesn't meet automation criteria: Score ${record?.score}, Required: >=77`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Signal automation processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Signal Automation] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});