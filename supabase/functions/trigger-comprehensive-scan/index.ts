import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Triggering comprehensive Bybit scan...')
    
    const body = await req.json().catch(() => ({}))
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get scan parameters
    const scanParams = {
      batch_size: body.batch_size || 20,
      timeframes: body.timeframes || ['5', '15'],
      force_scan: body.force_scan || false
    }
    
    console.log('📊 Scan parameters:', scanParams)
    
    // Trigger the comprehensive scanner
    const { data, error } = await supabase.functions.invoke('bybit-comprehensive-scanner', {
      body: scanParams
    })
    
    if (error) {
      console.error('❌ Error triggering scanner:', error)
      throw error
    }
    
    console.log('✅ Comprehensive scan triggered successfully')
    
    // Log scan initiation
    await supabase
      .from('signals_state')
      .upsert({
        exchange: 'bybit',
        symbol: 'COMPREHENSIVE_SCAN',
        timeframe: 'TRIGGER',
        direction: 'SCAN_STARTED',
        last_emitted: new Date().toISOString(),
        last_price: 0,
        last_score: 0
      }, {
        onConflict: 'exchange,symbol,timeframe,direction'
      })
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Comprehensive Bybit scan triggered successfully',
        scan_params: scanParams,
        scan_result: data,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )

  } catch (error) {
    console.error('❌ Trigger error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to trigger comprehensive scan', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }
})