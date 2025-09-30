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
    const { action, symbol, side, amount, leverage = 1, price } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const apiKey = Deno.env.get('BYBIT_API_KEY') || Deno.env.get('BYBIT_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET') || Deno.env.get('BYBIT_SECRET')
    const isTestnet = Deno.env.get('BYBIT_TESTNET') === 'true'
    const isLiveTradingEnabled = Deno.env.get('LIVE_TRADING_ENABLED') === 'true'
    const defaultTradeAmount = parseFloat(Deno.env.get('DEFAULT_TRADE_AMOUNT') || '100')
    const defaultLeverage = parseInt(Deno.env.get('DEFAULT_LEVERAGE') || '1')
    
    const baseUrl = isTestnet 
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com'

    console.log(`🔄 Bybit Live Trading: ${action} - ${symbol} - ${side} - $${amount}`)

    if (action === 'execute_trade') {
      if (!symbol || !side || !amount) {
        throw new Error('Missing required parameters: symbol, side, amount')
      }

      // Validate trading is enabled
      if (!isLiveTradingEnabled) {
        console.log('⚠️ Live trading disabled, simulating trade')
        // Return simulated success for testing
        return new Response(
          JSON.stringify({
            success: true,
            simulated: true,
            message: 'Trade simulated (live trading disabled)',
            order_id: `sim_${Date.now()}`,
            symbol,
            side,
            amount
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const timestamp = Date.now().toString()
      const finalAmount = amount || defaultTradeAmount
      const finalLeverage = leverage || defaultLeverage
      
      const params = {
        category: 'linear',
        symbol,
        side,
        orderType: 'Market',
        qty: finalAmount.toString(),
        leverage: finalLeverage.toString(),
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
      
      // Log trade execution
      await supabaseClient
        .from('execution_orders')
        .insert({
          symbol,
          side,
          quantity: parseFloat(finalAmount),
          leverage: finalLeverage,
          status: data.retCode === 0 ? 'filled' : 'failed',
          external_order_id: data.result?.orderId,
          response_data: data,
          real_trade: true
        })

      console.log(`✅ Trade executed: ${symbol} ${side} $${finalAmount}`)

      return new Response(
        JSON.stringify({
          success: data.retCode === 0,
          data,
          trade_details: { symbol, side, amount: finalAmount, leverage: finalLeverage }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_positions') {
      const timestamp = Date.now().toString()
      const queryString = 'category=linear'
      const signature = hmac('sha256', apiSecret, timestamp + apiKey + '5000' + queryString, 'hex')

      const response = await fetch(`${baseUrl}/v5/position/list?${queryString}`, {
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
    console.error('❌ Bybit Live Trading error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})