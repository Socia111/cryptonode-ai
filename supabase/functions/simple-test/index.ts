import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json().catch(() => ({}))
    const { action } = body

    console.log('🧪 Simple test function called with action:', action)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Handle different test actions
    switch (action) {
      case 'status':
        return new Response(JSON.stringify({
          success: true,
          message: 'Simple test function is working',
          status: 'operational',
          timestamp: new Date().toISOString(),
          environment: {
            nodeEnv: Deno.env.get('NODE_ENV') || 'production',
            supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
            hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'db_test':
        // Test database connection
        const { data: testData, error: testError } = await supabase
          .from('system_status')
          .select('service_name, status')
          .limit(1)

        if (testError) {
          throw new Error(`Database test failed: ${testError.message}`)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Database connection test passed',
          data: testData,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'mock_trade':
        // Simulate a simple mock trade test
        console.log('🧪 Mock trade test initiated')
        
        // Insert a test log entry
        const { error: logError } = await supabase
          .from('edge_event_log')
          .insert({
            fn: 'simple-test',
            stage: 'mock_trade_test',
            payload: {
              action: 'mock_trade',
              symbol: 'BTCUSDT',
              side: 'Buy',
              amount: 5,
              test: true,
              timestamp: new Date().toISOString()
            }
          })

        if (logError) {
          console.error('Failed to log mock trade:', logError)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Mock trade test completed successfully',
          trade: {
            symbol: 'BTCUSDT',
            side: 'Buy',
            amount: 5,
            status: 'simulated',
            orderId: 'mock_' + Date.now(),
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      default:
        return new Response(JSON.stringify({
          success: true,
          message: 'Simple test function is working',
          availableActions: ['status', 'db_test', 'mock_trade'],
          usage: 'Send POST request with {"action": "status|db_test|mock_trade"}',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('Error in simple test function:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})