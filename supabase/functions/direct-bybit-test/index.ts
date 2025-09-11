import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function createBybitSignature(timestamp: string, apiKey: string, recvWindow: string, queryString: string, apiSecret: string) {
  const message = timestamp + apiKey + recvWindow + queryString
  const encoder = new TextEncoder()
  const keyData = encoder.encode(apiSecret)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('BYBIT_API_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET')
    
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing API credentials',
        details: {
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('🔧 Direct API Test Starting...')
    console.log(`API Key: ${apiKey.substring(0, 8)}...`)
    console.log(`API Secret: ${apiSecret.substring(0, 8)}...`)

    // Test 1: Server time
    console.log('Testing server time...')
    const timeResponse = await fetch('https://api.bybit.com/v5/market/time')
    const timeData = await timeResponse.json()
    console.log('Server time response:', timeData)

    // Test 2: Authenticated endpoint (account balance)
    console.log('Testing authenticated endpoint...')
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    const queryString = 'accountType=UNIFIED'
    
    const signature = await createBybitSignature(timestamp, apiKey, recvWindow, queryString, apiSecret)
    console.log('Generated signature:', signature.substring(0, 16) + '...')

    const balanceResponse = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      }
    })

    const balanceData = await balanceResponse.json()
    console.log('Balance response status:', balanceResponse.status)
    console.log('Balance response:', balanceData)

    // Test 3: Position info
    console.log('Testing position info...')
    const positionTimestamp = Date.now().toString()
    const positionQuery = 'category=linear'
    const positionSignature = await createBybitSignature(positionTimestamp, apiKey, recvWindow, positionQuery, apiSecret)

    const positionResponse = await fetch(`https://api.bybit.com/v5/position/list?${positionQuery}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': positionSignature,
        'X-BAPI-TIMESTAMP': positionTimestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      }
    })

    const positionData = await positionResponse.json()
    console.log('Position response:', positionData)

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        serverTime: {
          success: timeResponse.ok,
          status: timeResponse.status,
          data: timeData
        },
        accountBalance: {
          success: balanceResponse.ok,
          status: balanceResponse.status,
          data: balanceData
        },
        positions: {
          success: positionResponse.ok,
          status: positionResponse.status,
          data: positionData
        }
      },
      credentials: {
        apiKeyLength: apiKey.length,
        apiSecretLength: apiSecret.length,
        apiKeyPrefix: apiKey.substring(0, 8)
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Direct test error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})