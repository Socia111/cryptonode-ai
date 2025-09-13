import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if API credentials are available
    const apiKey = Deno.env.get('BYBIT_API_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET')

    console.log('🔧 API Credentials Check:')
    console.log('  - BYBIT_API_KEY present:', !!apiKey)
    console.log('  - BYBIT_API_SECRET present:', !!apiSecret)
    
    if (apiKey) {
      console.log('  - API Key preview:', apiKey.substring(0, 8) + '...')
    }

    // Test basic Bybit API connection (get server time)
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    
    let serverTimeResponse = null
    try {
      const timeUrl = 'https://api.bybit.com/v5/market/time'
      const timeResp = await fetch(timeUrl)
      serverTimeResponse = await timeResp.json()
      console.log('🌐 Bybit server time test:', timeResp.status, serverTimeResponse)
    } catch (timeError) {
      console.error('❌ Bybit connectivity test failed:', timeError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        credentials_available: {
          api_key: !!apiKey,
          api_secret: !!apiSecret,
          api_key_preview: apiKey ? apiKey.substring(0, 8) + '...' : null
        },
        bybit_connectivity: serverTimeResponse,
        timestamp: timestamp,
        message: 'Debug information retrieved'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Debug API error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: Date.now()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})