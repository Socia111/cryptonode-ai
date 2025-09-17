import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CoinAPIRequest {
  endpoint: string
  symbol?: string
  period?: string
  limit?: number
  filter_symbol_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const coinApiKey = Deno.env.get('COINAPI_KEY')
    if (!coinApiKey) {
      throw new Error('CoinAPI key not configured')
    }

    const { endpoint, symbol, period, limit, filter_symbol_id } = await req.json() as CoinAPIRequest

    let url: string
    const baseUrl = 'https://rest.coinapi.io/v1'

    // Route to appropriate CoinAPI endpoint
    switch (endpoint) {
      case 'ohlcv':
        if (!symbol || !period) {
          throw new Error('Symbol and period required for OHLCV endpoint')
        }
        url = `${baseUrl}/ohlcv/${symbol}/latest?period_id=${period}&limit=${limit || 100}`
        break
      
      case 'quotes':
        if (!filter_symbol_id) {
          throw new Error('filter_symbol_id required for quotes endpoint')
        }
        url = `${baseUrl}/quotes/latest?filter_symbol_id=${filter_symbol_id}`
        break
      
      case 'exchanges':
        url = `${baseUrl}/exchanges`
        break
      
      case 'symbols':
        url = `${baseUrl}/symbols`
        break
      
      case 'exchangerate':
        if (!symbol) {
          throw new Error('Symbol required for exchange rate endpoint')
        }
        url = `${baseUrl}/exchangerate/${symbol}`
        break
      
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`)
    }

    console.log(`🔄 Fetching CoinAPI: ${url}`)

    // Make request to CoinAPI with retry logic
    let response: Response
    let retries = 3
    
    while (retries > 0) {
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-CoinAPI-Key': coinApiKey,
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          break
        } else if (response.status === 429) {
          // Rate limited - wait and retry
          console.log(`⚠️ Rate limited, retrying in ${4 - retries} seconds...`)
          await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000))
          retries--
        } else {
          throw new Error(`CoinAPI error: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        console.error(`❌ Request failed:`, error)
        retries--
        if (retries === 0) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!response!.ok) {
      throw new Error(`Failed after all retries: ${response!.status}`)
    }

    const data = await response!.json()
    
    // Log usage for monitoring
    console.log(`✅ CoinAPI ${endpoint} success: ${JSON.stringify(data).length} bytes`)

    return new Response(
      JSON.stringify({
        success: true,
        data,
        endpoint,
        timestamp: new Date().toISOString(),
        cached: false
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // Cache for 1 minute
        } 
      }
    )

  } catch (error) {
    console.error('❌ CoinAPI Proxy Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})