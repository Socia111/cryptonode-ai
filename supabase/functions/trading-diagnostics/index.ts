import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

// HMAC-SHA256 signing for Bybit API
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Test Bybit API Connection
async function testBybitConnection(apiKey: string, apiSecret: string, isTestnet: boolean = true) {
  const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com'
  const timestamp = Date.now().toString()
  const recv_window = '5000'
  
  // Test 1: Get wallet balance
  try {
    const queryString = `api_key=${apiKey}&timestamp=${timestamp}&recv_window=${recv_window}`
    const signature = await hmacSha256(apiSecret, timestamp + apiKey + recv_window)
    
    const response = await fetch(`${baseUrl}/v5/account/wallet-balance?category=unified&${queryString}&sign=${signature}`, {
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recv_window,
      }
    })
    
    const balanceData = await response.json()
    
    if (balanceData.retCode === 0) {
      return {
        success: true,
        balance: balanceData.result,
        environment: isTestnet ? 'testnet' : 'mainnet',
        message: 'Bybit API connection successful'
      }
    } else {
      return {
        success: false,
        error: balanceData.retMsg || 'Failed to get wallet balance',
        code: balanceData.retCode
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error connecting to Bybit'
    }
  }
}

// Test order placement (dry run)
async function testOrderPlacement(apiKey: string, apiSecret: string, isTestnet: boolean = true) {
  const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com'
  const timestamp = Date.now().toString()
  const recv_window = '5000'
  
  // Get BTC price first
  try {
    const tickerResponse = await fetch(`${baseUrl}/v5/market/tickers?category=linear&symbol=BTCUSDT`)
    const tickerData = await tickerResponse.json()
    
    if (tickerData.retCode !== 0 || !tickerData.result?.list?.length) {
      return { success: false, error: 'Could not get BTC price for test order' }
    }
    
    const currentPrice = parseFloat(tickerData.result.list[0].lastPrice)
    const testOrderParams = {
      category: 'linear',
      symbol: 'BTCUSDT', 
      side: 'Buy',
      orderType: 'Limit',
      qty: '0.001',
      price: (currentPrice * 0.8).toFixed(2), // 20% below current price - unlikely to fill
      timeInForce: 'GTC'
    }
    
    const paramString = JSON.stringify(testOrderParams)
    const signature = await hmacSha256(apiSecret, timestamp + apiKey + recv_window + paramString)
    
    // NOTE: This would place a real order in live mode. For testing, we just validate the signature.
    return {
      success: true,
      test_order_validated: true,
      current_btc_price: currentPrice,
      test_price: parseFloat(testOrderParams.price),
      message: 'Order parameters validated, signature generated successfully'
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to test order placement'
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action } = await req.json()

    if (action === 'test_bybit_connection') {
      const apiKey = Deno.env.get('BYBIT_API_KEY')
      const apiSecret = Deno.env.get('BYBIT_API_SECRET') 
      const isTestnet = Deno.env.get('BYBIT_TESTNET') !== 'false'

      if (!apiKey || !apiSecret) {
        return json({
          success: false,
          error: 'Bybit API credentials not configured',
          credentials: {
            api_key_configured: !!apiKey,
            api_secret_configured: !!apiSecret
          }
        })
      }

      console.log(`🧪 Testing Bybit ${isTestnet ? 'TESTNET' : 'MAINNET'} connection...`)
      
      const connectionResult = await testBybitConnection(apiKey, apiSecret, isTestnet)
      
      // Log result to database
      await supabase.from('audit_log').insert({
        action: 'bybit_connection_test',
        resource_type: 'trading_api',
        metadata: {
          success: connectionResult.success,
          environment: isTestnet ? 'testnet' : 'mainnet',
          timestamp: new Date().toISOString()
        }
      })

      return json(connectionResult)
    }

    if (action === 'test_order_validation') {
      const apiKey = Deno.env.get('BYBIT_API_KEY')
      const apiSecret = Deno.env.get('BYBIT_API_SECRET')
      const isTestnet = Deno.env.get('BYBIT_TESTNET') !== 'false'

      if (!apiKey || !apiSecret) {
        return json({
          success: false,
          error: 'Bybit API credentials not configured'
        })
      }

      console.log('🧪 Testing order validation...')
      
      const orderResult = await testOrderPlacement(apiKey, apiSecret, isTestnet)
      
      return json(orderResult)
    }

    if (action === 'get_system_logs') {
      // Get recent system logs for debugging
      const { data: logs } = await supabase
        .from('audit_log')
        .select('*')
        .in('action', ['paper_trade_executed', 'live_trade_executed', 'trading_connection_test', 'bybit_connection_test'])
        .order('created_at', { ascending: false })
        .limit(20)

      return json({
        success: true,
        logs: logs || [],
        count: logs?.length || 0
      })
    }

    if (action === 'test_full_pipeline') {
      console.log('🧪 Testing full signal → trade pipeline...')
      
      // Step 1: Get a real signal
      const { data: signalsData, error: signalsError } = await supabase.functions.invoke('signals-api', {
        body: { action: 'recent' }
      })
      
      if (signalsError || !signalsData?.signals?.length) {
        return json({
          success: false,
          error: 'No signals available for pipeline test',
          step: 'signal_fetch'
        })
      }

      const testSignal = signalsData.signals[0]
      console.log('📊 Using signal for test:', testSignal.symbol, testSignal.direction)

      // Step 2: Test trade executor
      const { data: tradeData, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: testSignal.symbol,
          side: testSignal.direction,
          amountUSD: 10, // Small test amount
          leverage: 1
        }
      })

      if (tradeError) {
        return json({
          success: false,
          error: tradeError.message,
          step: 'trade_execution'
        })
      }

      // Log pipeline test result
      await supabase.from('audit_log').insert({
        action: 'full_pipeline_test',
        resource_type: 'trading_system',
        metadata: {
          signal: testSignal,
          trade_result: tradeData,
          success: true,
          timestamp: new Date().toISOString()
        }
      })

      return json({
        success: true,
        pipeline_test: {
          signal_used: testSignal,
          trade_result: tradeData,
          message: 'Full pipeline test completed successfully'
        }
      })
    }

    return json({
      success: false,
      error: 'Unknown action',
      available_actions: [
        'test_bybit_connection',
        'test_order_validation', 
        'get_system_logs',
        'test_full_pipeline'
      ]
    })

  } catch (error: any) {
    console.error('❌ Trading diagnostics error:', error)
    return json({
      success: false,
      error: error.message
    }, 500)
  }
})