import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, symbol, side, quantity, orderType = 'Market' } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const apiKey = Deno.env.get('BYBIT_API_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET')
    const isTestnet = Deno.env.get('BYBIT_TESTNET') === 'true'
    
    const baseUrl = isTestnet 
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com'

    if (action === 'place_order') {
      if (!symbol || !side || !quantity) {
        throw new Error('Missing required parameters: symbol, side, quantity')
      }

      const timestamp = Date.now().toString()
      const params = {
        category: 'spot',
        symbol,
        side,
        orderType,
        qty: quantity.toString(),
        timeInForce: 'IOC'
      }

      const queryString = Object.entries(params)
        .sort()
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

      const signature = hmac('sha256', apiSecret, timestamp + apiKey + '5000' + queryString, 'hex')

      const response = await fetch(`${baseUrl}/v5/order/create`, {
        method: 'POST',
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      const data = await response.json()
      
      // Log order to database
      await supabaseClient
        .from('execution_orders')
        .insert({
          symbol,
          side,
          quantity: parseFloat(quantity),
          order_type: orderType,
          status: data.retCode === 0 ? 'filled' : 'failed',
          external_order_id: data.result?.orderId,
          response_data: data
        })

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_balance') {
      const timestamp = Date.now().toString()
      const queryString = 'accountType=UNIFIED'
      const signature = hmac('sha256', apiSecret, timestamp + apiKey + '5000' + queryString, 'hex')

      const response = await fetch(`${baseUrl}/v5/account/wallet-balance?${queryString}`, {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000'
        }
      })

      const data = await response.json()
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error) {
    console.error('Bybit broker error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})