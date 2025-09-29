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

    const { action = 'enable_all', symbols } = await req.json()

    if (action === 'enable_all') {
      // Enable all major USDT pairs by default
      const majorSymbols = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
        'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT',
        'BCHUSDT', 'EOSUSDT', 'TRXUSDT', 'XLMUSDT', 'VETUSDT', 'NEOUSDT'
      ]

      // Update whitelist settings to enable all symbols
      const { error } = await supabaseClient
        .from('whitelist_settings')
        .upsert({
          whitelist_enabled: false, // Disable whitelist to allow all symbols
          whitelist_pairs: majorSymbols,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to update whitelist settings:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to enable symbols' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'enable_all',
          symbols_enabled: majorSymbols.length,
          whitelist_disabled: true,
          message: 'All major symbols enabled for trading',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'enable_custom' && symbols) {
      // Enable specific symbols
      const { error } = await supabaseClient
        .from('whitelist_settings')
        .upsert({
          whitelist_enabled: true,
          whitelist_pairs: symbols,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to update custom whitelist:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to enable custom symbols' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'enable_custom',
          symbols_enabled: symbols.length,
          enabled_symbols: symbols,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error) {
    console.error('Enable all symbols error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})