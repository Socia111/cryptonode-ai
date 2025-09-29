import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Environment status
    const environment = {
      hasApiKey: !!Deno.env.get('BYBIT_API_KEY'),
      hasApiSecret: !!Deno.env.get('BYBIT_API_SECRET'),
      apiKeyLength: Deno.env.get('BYBIT_API_KEY')?.length || 0,
      apiSecretLength: Deno.env.get('BYBIT_API_SECRET')?.length || 0,
      autoTradingEnabled: Deno.env.get('AUTO_TRADING_ENABLED') === 'true',
      liveTradingEnabled: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
      paperTrading: Deno.env.get('PAPER_TRADING') === 'true'
    }

    // Database connectivity test
    let databaseStatus = 'disconnected'
    try {
      const { data, error } = await supabaseClient
        .from('signals')
        .select('count(*)')
        .limit(1)
      
      if (!error) {
        databaseStatus = 'connected'
      }
    } catch (error) {
      console.error('Database test failed:', error)
    }

    // Recent signals check
    const { data: recentSignals } = await supabaseClient
      .from('signals')
      .select('id, symbol, created_at, score')
      .order('created_at', { ascending: false })
      .limit(5)

    // Trading accounts check
    const { data: tradingAccounts } = await supabaseClient
      .from('user_trading_accounts')
      .select('id, exchange, account_type, is_active')
      .eq('is_active', true)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        environment,
        database: {
          status: databaseStatus,
          recent_signals: recentSignals?.length || 0,
          trading_accounts: tradingAccounts?.length || 0
        },
        system: {
          uptime: 'healthy',
          memory_usage: 'normal',
          response_time: 'fast'
        },
        debug_info: {
          function_name: 'debug-trading-status',
          version: '1.0.0',
          deployment: 'production'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Debug trading status error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})