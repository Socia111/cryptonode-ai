import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TradeRequest {
  symbol: string
  side: 'Buy' | 'Sell'
  mode: 'usd' | 'riskPct' | 'qty'
  amountUSD?: number
  riskPct?: number
  qty?: number
  leverage: number
  stopLossPrice?: number
  takeProfitPrice?: number
  dryRun?: boolean
  userId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const request: TradeRequest = await req.json()
    console.log('[Trade Executor V2] Processing request:', JSON.stringify(request, null, 2))

    // Validate parameters
    const validation = validateRequest(request)
    if (!validation.valid) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'validation_error',
        message: validation.error,
        hint: validation.hint
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get instrument info
    const instrumentInfo = await getInstrumentInfo(request.symbol)
    if (!instrumentInfo.ok) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'instrument_error',
        message: 'Failed to get instrument information',
        hint: 'Symbol may not be available for trading'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get current price with fallbacks
    const currentPrice = await getCurrentPrice(request.symbol, instrumentInfo)
    if (!currentPrice) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'price_error',
        message: 'No recent price available',
        hint: `Unable to get current price for ${request.symbol}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate quantity based on mode
    const qtyResult = calculateQuantity(request, currentPrice, instrumentInfo)
    if (!qtyResult.valid) {
      return new Response(JSON.stringify({
        ok: false,
        reason: qtyResult.reason,
        message: qtyResult.message,
        hint: qtyResult.hint
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const finalQty = qtyResult.quantity!

    // Validate $5 minimum order value
    const orderValue = finalQty * currentPrice
    if (orderValue < 5) {
      const minQty = Math.ceil((5 / currentPrice) / instrumentInfo.qtyStep) * instrumentInfo.qtyStep
      return new Response(JSON.stringify({
        ok: false,
        reason: 'min_order_value',
        message: 'Order value below $5 minimum',
        hint: `Increase quantity to ≥ ${minQty.toFixed(8)} or amount to ≥ $${(minQty * currentPrice).toFixed(2)}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate minNotional
    if (instrumentInfo.minNotional > 0) {
      const notional = (finalQty * currentPrice) / request.leverage
      if (notional < instrumentInfo.minNotional) {
        const needUSD = (instrumentInfo.minNotional * request.leverage)
        return new Response(JSON.stringify({
          ok: false,
          reason: 'min_notional',
          message: 'Below minimum notional requirement',
          hint: `Increase amount to ≥ $${needUSD.toFixed(2)} for ${request.symbol}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Validate leverage
    if (request.leverage > instrumentInfo.maxLeverage) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'max_leverage',
        message: 'Leverage exceeds maximum allowed',
        hint: `Reduce leverage to ≤ ${instrumentInfo.maxLeverage}x for ${request.symbol}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If dry run, return validation results
    if (request.dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        dryRun: true,
        validations: [
          { name: 'min_qty', passed: true, value: finalQty },
          { name: 'min_order_value', passed: true, value: orderValue },
          { name: 'min_notional', passed: true, value: (finalQty * currentPrice) / request.leverage },
          { name: 'max_leverage', passed: true, value: request.leverage }
        ],
        calculatedQty: finalQty,
        estimatedValue: orderValue,
        estimatedMargin: orderValue / request.leverage,
        estimatedFees: orderValue * 0.0006,
        currentPrice: currentPrice
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Execute the trade
    const tradeResult = await executeTrade(request, finalQty, currentPrice, instrumentInfo)
    
    return new Response(JSON.stringify(tradeResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Trade Executor V2] Error:', error)
    return new Response(JSON.stringify({
      ok: false,
      reason: 'system_error',
      message: 'Internal system error',
      hint: 'Please try again later'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function validateRequest(request: TradeRequest) {
  if (!request.symbol) {
    return { valid: false, error: 'Symbol required', hint: 'Provide a valid symbol' }
  }
  
  if (!['Buy', 'Sell'].includes(request.side)) {
    return { valid: false, error: 'Invalid side', hint: 'Side must be Buy or Sell' }
  }
  
  if (!['usd', 'riskPct', 'qty'].includes(request.mode)) {
    return { valid: false, error: 'Invalid mode', hint: 'Mode must be usd, riskPct, or qty' }
  }
  
  if (!request.leverage || request.leverage < 1 || request.leverage > 100) {
    return { valid: false, error: 'Invalid leverage', hint: 'Leverage must be between 1 and 100' }
  }
  
  if (request.mode === 'usd' && (!request.amountUSD || request.amountUSD < 5)) {
    return { valid: false, error: 'Invalid USD amount', hint: 'Amount must be ≥ $5' }
  }
  
  if (request.mode === 'riskPct') {
    if (!request.riskPct || request.riskPct <= 0 || request.riskPct > 0.1) {
      return { valid: false, error: 'Invalid risk percentage', hint: 'Risk must be between 0.1% and 10%' }
    }
    if (!request.stopLossPrice) {
      return { valid: false, error: 'Stop loss required', hint: 'Stop loss price required for risk% mode' }
    }
  }
  
  if (request.mode === 'qty' && (!request.qty || request.qty <= 0)) {
    return { valid: false, error: 'Invalid quantity', hint: 'Quantity must be > 0' }
  }
  
  return { valid: true }
}

async function getInstrumentInfo(symbol: string) {
  try {
    const response = await supabase.functions.invoke('instrument-info', {
      body: { symbol }
    })
    
    if (response.error) {
      throw new Error(response.error.message)
    }
    
    return response.data
  } catch (error) {
    console.error('Failed to get instrument info:', error)
    return { ok: false, error: error.message }
  }
}

async function getCurrentPrice(symbol: string, instrumentInfo: any): Promise<number | null> {
  try {
    // Try instrument info first
    if (instrumentInfo.lastPrice && instrumentInfo.lastPrice > 0) {
      return instrumentInfo.lastPrice
    }
    
    // Fallback to direct API call
    const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`)
    const data = await response.json()
    
    if (data.retCode === 0 && data.result?.list?.[0]) {
      return parseFloat(data.result.list[0].lastPrice)
    }
    
    return null
  } catch (error) {
    console.error('Failed to get current price:', error)
    return null
  }
}

function calculateQuantity(request: TradeRequest, price: number, instrumentInfo: any) {
  let rawQty = 0
  
  switch (request.mode) {
    case 'usd':
      rawQty = (request.amountUSD! * request.leverage) / price
      break
    case 'riskPct':
      const riskAmount = 10000 * request.riskPct! // Assume $10k account
      const stopDistance = Math.abs(price - request.stopLossPrice!) / price
      rawQty = (riskAmount * request.leverage) / (price * stopDistance)
      break
    case 'qty':
      rawQty = request.qty!
      break
  }
  
  // Round to qtyStep
  const finalQty = Math.floor(rawQty / instrumentInfo.qtyStep) * instrumentInfo.qtyStep
  
  // Check minimum quantity
  if (finalQty < instrumentInfo.minQty) {
    return {
      valid: false,
      reason: 'min_qty',
      message: 'Quantity below minimum',
      hint: `Increase to ≥ ${instrumentInfo.minQty} ${instrumentInfo.symbol}`
    }
  }
  
  return { valid: true, quantity: finalQty }
}

async function executeTrade(request: TradeRequest, qty: number, price: number, instrumentInfo: any) {
  try {
    // Get Bybit credentials
    const credentials = await getBybitCredentials()
    if (!credentials) {
      return {
        ok: false,
        reason: 'credentials_error',
        message: 'Trading credentials not configured',
        hint: 'Configure Bybit API credentials'
      }
    }

    // Place market order
    const orderResult = await placeBybitOrder({
      symbol: request.symbol,
      side: request.side,
      qty: qty,
      leverage: request.leverage,
      credentials: credentials
    })

    if (!orderResult.success) {
      return {
        ok: false,
        reason: 'order_failed',
        message: orderResult.message || 'Order placement failed',
        hint: 'Check your account balance and try again'
      }
    }

    // Add TP/SL if provided
    if (request.takeProfitPrice || request.stopLossPrice) {
      await addStopLossAndTakeProfit({
        symbol: request.symbol,
        side: request.side,
        qty: qty,
        stopLoss: request.stopLossPrice,
        takeProfit: request.takeProfitPrice,
        credentials: credentials
      })
    }

    // Log the trade
    await logTrade({
      symbol: request.symbol,
      side: request.side,
      qty: qty,
      price: price,
      leverage: request.leverage,
      orderId: orderResult.orderId,
      userId: request.userId
    })

    return {
      ok: true,
      orderId: orderResult.orderId,
      executedQty: qty,
      executedPrice: price,
      message: 'Order placed successfully'
    }

  } catch (error) {
    console.error('Trade execution error:', error)
    return {
      ok: false,
      reason: 'execution_error',
      message: error.message,
      hint: 'Please try again'
    }
  }
}

async function getBybitCredentials() {
  const apiKey = Deno.env.get('BYBIT_API_KEY')
  const apiSecret = Deno.env.get('BYBIT_API_SECRET')
  const testnet = Deno.env.get('BYBIT_TESTNET') === 'true'
  
  if (!apiKey || !apiSecret) {
    console.error('Bybit credentials not configured')
    return null
  }
  
  return { apiKey, apiSecret, testnet }
}

async function placeBybitOrder(params: any) {
  try {
    const { symbol, side, qty, leverage, credentials } = params
    
    // Set leverage first
    const leverageResponse = await callBybitAPI('/v5/position/set-leverage', {
      category: 'linear',
      symbol: symbol,
      buyLeverage: leverage.toString(),
      sellLeverage: leverage.toString()
    }, credentials)

    // Place market order
    const orderResponse = await callBybitAPI('/v5/order/create', {
      category: 'linear',
      symbol: symbol,
      side: side,
      orderType: 'Market',
      qty: qty.toString(),
      timeInForce: 'IOC'
    }, credentials)

    if (orderResponse.retCode === 0) {
      return {
        success: true,
        orderId: orderResponse.result.orderId,
        orderLinkId: orderResponse.result.orderLinkId
      }
    } else {
      return {
        success: false,
        message: orderResponse.retMsg || 'Order failed'
      }
    }
  } catch (error) {
    console.error('Bybit order error:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

async function addStopLossAndTakeProfit(params: any) {
  try {
    const { symbol, side, qty, stopLoss, takeProfit, credentials } = params
    
    if (stopLoss) {
      await callBybitAPI('/v5/order/create', {
        category: 'linear',
        symbol: symbol,
        side: side === 'Buy' ? 'Sell' : 'Buy',
        orderType: 'Market',
        qty: qty.toString(),
        triggerDirection: side === 'Buy' ? 2 : 1,
        triggerPrice: stopLoss.toString(),
        triggerBy: 'LastPrice'
      }, credentials)
    }
    
    if (takeProfit) {
      await callBybitAPI('/v5/order/create', {
        category: 'linear',
        symbol: symbol,
        side: side === 'Buy' ? 'Sell' : 'Buy',
        orderType: 'Market',
        qty: qty.toString(),
        triggerDirection: side === 'Buy' ? 1 : 2,
        triggerPrice: takeProfit.toString(),
        triggerBy: 'LastPrice'
      }, credentials)
    }
  } catch (error) {
    console.error('TP/SL setup error:', error)
  }
}

async function callBybitAPI(endpoint: string, params: any, credentials: any) {
  const timestamp = Date.now().toString()
  const baseUrl = credentials.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com'
  
  // Create signature
  const queryString = new URLSearchParams(params).toString()
  const signString = timestamp + credentials.apiKey + '5000' + queryString
  
  const signature = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(credentials.apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key => 
    crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signString))
  ).then(signature => 
    Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  )
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': credentials.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000'
    },
    body: JSON.stringify(params)
  })
  
  return await response.json()
}

async function logTrade(params: any) {
  try {
    await supabase.from('execution_orders').insert({
      symbol: params.symbol,
      side: params.side,
      qty: params.qty,
      executed_price: params.price,
      leverage: params.leverage,
      exchange_order_id: params.orderId,
      user_id: params.userId,
      status: 'completed',
      amount_usd: params.qty * params.price / params.leverage,
      real_trade: true
    })
  } catch (error) {
    console.error('Failed to log trade:', error)
  }
}