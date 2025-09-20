import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Testnet balance information',
        instructions: [
          '1. Go to https://testnet.bybit.com/',
          '2. Create a testnet account or log in',
          '3. Get free testnet USDT from the testnet faucet',
          '4. Generate testnet API keys in account settings',
          '5. Use those testnet credentials in your trading configuration',
        ],
        testnet_features: [
          'Free USDT balance for testing',
          'All trading features available',
          'No real money at risk',
          'Perfect for testing trading strategies'
        ],
        current_setup: 'System is now configured to use testnet by default'
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})