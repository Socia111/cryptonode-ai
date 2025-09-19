import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Fetching all Bybit USDT symbols...')

    // Fetch all linear USDT symbols from Bybit
    const bybitResponse = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear')
    const bybitData = await bybitResponse.json()
    
    if (bybitData.retCode !== 0) {
      throw new Error(`Bybit API error: ${bybitData.retMsg}`)
    }

    // Filter for active USDT pairs with good volume
    const activeSymbols = bybitData.result.list
      .filter((instrument: any) => 
        instrument.quoteCoin === 'USDT' && 
        instrument.status === 'Trading' &&
        instrument.baseCoin !== 'USDC' && // Exclude stablecoins
        instrument.baseCoin !== 'USDT'
      )
      .map((instrument: any) => ({
        symbol: instrument.symbol,
        baseCoin: instrument.baseCoin,
        quoteCoin: instrument.quoteCoin,
        status: instrument.status,
        minOrderQty: parseFloat(instrument.lotSizeFilter.minOrderQty),
        maxOrderQty: parseFloat(instrument.lotSizeFilter.maxOrderQty),
        qtyStep: parseFloat(instrument.lotSizeFilter.qtyStep),
        minPrice: parseFloat(instrument.priceFilter.minPrice),
        maxPrice: parseFloat(instrument.priceFilter.maxPrice),
        tickSize: parseFloat(instrument.priceFilter.tickSize)
      }))
      .slice(0, 200) // Limit to top 200 symbols for performance

    console.log(`📊 Found ${activeSymbols.length} active USDT symbols`)

    // Update markets table with all symbols
    for (const symbolData of activeSymbols) {
      await supabase
        .from('markets')
        .upsert({
          symbol: symbolData.symbol,
          exchange: 'bybit',
          base_asset: symbolData.baseCoin,
          quote_asset: symbolData.quoteCoin,
          status: 'active',
          category: 'linear',
          min_order_size: symbolData.minOrderQty,
          max_order_size: symbolData.maxOrderQty,
          qty_step: symbolData.qtyStep,
          min_qty: symbolData.minOrderQty,
          tick_size: symbolData.tickSize,
          price_precision: 4,
          quantity_precision: 6,
          enabled: true
        }, { 
          onConflict: 'symbol,exchange',
          ignoreDuplicates: false 
        })
    }

    // Update exchange feed status
    await supabase
      .from('exchange_feed_status')
      .upsert({
        exchange: 'bybit',
        status: 'active',
        last_update: new Date().toISOString(),
        symbols_tracked: activeSymbols.length,
        error_count: 0
      }, { onConflict: 'exchange' })

    return new Response(
      JSON.stringify({
        success: true,
        symbols_count: activeSymbols.length,
        symbols: activeSymbols.map(s => s.symbol),
        message: `Successfully updated ${activeSymbols.length} symbols`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Symbol scanner error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to scan symbols'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})