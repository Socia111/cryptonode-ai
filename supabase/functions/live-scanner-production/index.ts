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
    console.log('🔍 Live Scanner Production started')
    
    let requestData = {}
    try {
      const text = await req.text()
      if (text) {
        requestData = JSON.parse(text)
      }
    } catch (e) {
      console.log('No body or invalid JSON, using defaults')
    }
    
    const { mode = 'scan', force = false } = requestData as any
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (mode === 'activation') {
      console.log('🔧 Running scanner activation mode')
      
      // Test scanner functionality
      const testSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
      const scanResults = []
      
      for (const symbol of testSymbols) {
        try {
          const bybitUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`
          const response = await fetch(bybitUrl)
          
          if (response.ok) {
            const data = await response.json()
            if (data.result?.list?.[0]) {
              const ticker = data.result.list[0]
              scanResults.push({
                symbol,
                price: parseFloat(ticker.lastPrice),
                volume: parseFloat(ticker.volume24h),
                change_24h: parseFloat(ticker.price24hPcnt) * 100,
                status: 'active',
                timestamp: new Date().toISOString()
              })
            }
          }
        } catch (error) {
          console.error(`Error scanning ${symbol}:`, error)
        }
      }
      
      console.log(`✅ Scanned ${scanResults.length} symbols`)
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'activation',
          scanner_status: 'active',
          symbols_scanned: scanResults.length,
          results: scanResults,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Regular scanning mode
    console.log('🔍 Starting production market scan...')
    
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT']
    const scanResults = []
    
    // Get market data for all symbols
    for (const symbol of symbols) {
      try {
        const [tickerResponse, klineResponse] = await Promise.all([
          fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`),
          fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=1h&limit=24`)
        ])
        
        if (!tickerResponse.ok || !klineResponse.ok) continue
        
        const [tickerData, klineData] = await Promise.all([
          tickerResponse.json(),
          klineResponse.json()
        ])
        
        if (!tickerData.result?.list?.[0] || !klineData.result?.list?.length) continue
        
        const ticker = tickerData.result.list[0]
        const klines = klineData.result.list.map((k: any) => ({
          timestamp: parseInt(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        })).reverse()
        
        const currentPrice = parseFloat(ticker.lastPrice)
        const volume24h = parseFloat(ticker.volume24h)
        const change24h = parseFloat(ticker.price24hPcnt) * 100
        
        // Calculate technical indicators
        const closes = klines.map(k => k.close)
        const volumes = klines.map(k => k.volume)
        
        const sma20 = closes.slice(-20).reduce((a, b) => a + b) / Math.min(20, closes.length)
        const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length
        const volumeRatio = volume24h / avgVolume
        
        // Volatility
        const volatility = Math.abs(change24h)
        
        // Market conditions
        let marketCondition = 'neutral'
        if (change24h > 3) marketCondition = 'bullish'
        else if (change24h < -3) marketCondition = 'bearish'
        
        const result = {
          symbol,
          price: currentPrice,
          volume_24h: volume24h,
          change_24h: change24h,
          sma20,
          volume_ratio: volumeRatio,
          volatility,
          market_condition: marketCondition,
          alert_level: volatility > 5 ? 'high' : volatility > 2 ? 'medium' : 'low',
          timestamp: new Date().toISOString(),
          data_source: 'bybit_live'
        }
        
        scanResults.push(result)
        
        // Store in live_market_data table
        await supabaseClient
          .from('live_market_data')
          .upsert({
            symbol,
            exchange: 'bybit',
            price: currentPrice,
            volume: volume24h,
            change_24h_percent: change24h,
            updated_at: new Date().toISOString()
          }, { onConflict: 'symbol,exchange' })
        
      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error)
      }
    }
    
    console.log(`✅ Scanner completed: ${scanResults.length} symbols processed`)
    
    return new Response(
      JSON.stringify({
        success: true,
        scanner_mode: 'production',
        symbols_scanned: scanResults.length,
        results: scanResults,
        summary: {
          bullish_symbols: scanResults.filter(r => r.market_condition === 'bullish').length,
          bearish_symbols: scanResults.filter(r => r.market_condition === 'bearish').length,
          high_volatility: scanResults.filter(r => r.alert_level === 'high').length,
          avg_change: scanResults.reduce((sum, r) => sum + r.change_24h, 0) / scanResults.length
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Live Scanner error:', error)
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