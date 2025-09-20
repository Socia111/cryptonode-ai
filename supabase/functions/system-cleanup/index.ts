import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// List of unused functions to be deleted
const UNUSED_FUNCTIONS = [
  'test-signal-generation',
  'direct-3commas-test', 
  'direct-bybit-test',
  'simple-test',
  'testnet-trade-test',
  'trading-connection-test',
  'manual-api-test',
  'debug-bybit-api',
  'debug-trading-status',
  'api-diagnostics',
  'coinapi-proxy',
  'free-crypto-api-integration',
  'jwt-token-generator',
  'setup-telegram-bot',
  'webhook-alerts'
];

const DEPRECATED_FUNCTIONS = [
  'bybit-broker', // replaced by bybit-broker-v2
  'trade-executor', // replaced by trade-executor-v2
  'scanner-engine', // replaced by enhanced-signal-generation
  'generate-signals', // replaced by enhanced-signal-generation
  'sma-ema-signal-engine' // replaced by enhanced-signal-generation
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action } = await req.json();

    switch (action) {
      case 'list_unused':
        return new Response(JSON.stringify({
          success: true,
          message: 'List of functions to clean up',
          data: {
            unused: UNUSED_FUNCTIONS,
            deprecated: DEPRECATED_FUNCTIONS,
            total_to_remove: UNUSED_FUNCTIONS.length + DEPRECATED_FUNCTIONS.length
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'cleanup_test_signals':
        // Remove test signals from database
        const { error: cleanupError, count } = await supabase
          .from('signals')
          .delete()
          .or('source.like.%test%,source.like.%mock%,source.like.%demo%');

        if (cleanupError) throw cleanupError;

        return new Response(JSON.stringify({
          success: true,
          message: `Cleaned up ${count || 0} test signals`,
          data: { cleaned_count: count || 0 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'system_status':
        // Get system status and recommendations
        const { data: recentSignals } = await supabase
          .from('signals')
          .select('id, source, created_at')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        const { data: systemStatus } = await supabase
          .from('system_status')
          .select('*')
          .order('last_update', { ascending: false })
          .limit(5);

        return new Response(JSON.stringify({
          success: true,
          message: 'System status retrieved',
          data: {
            recent_signals: recentSignals?.length || 0,
            signal_sources: [...new Set(recentSignals?.map(s => s.source) || [])],
            system_services: systemStatus?.length || 0,
            recommendations: [
              'Remove unused edge functions to reduce deployment overhead',
              'Clean up test signals older than 1 hour',
              'Monitor signal generation performance',
              'Ensure real-time data feeds are active'
            ]
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('❌ System cleanup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});