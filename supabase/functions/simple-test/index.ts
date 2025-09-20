import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    
    console.log(`🧪 [simple-test] Action: ${action}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    switch (action) {
      case 'status':
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Simple test function is working',
            timestamp: new Date().toISOString(),
            environment: {
              hasSupabaseUrl: !!supabaseUrl,
              hasSupabaseKey: !!supabaseKey,
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      case 'db_test':
        // Test database connection
        const { data: markets, error: dbError } = await supabase
          .from('markets')
          .select('symbol, status')
          .limit(3);

        if (dbError) {
          console.error('❌ Database test error:', dbError);
          return new Response(
            JSON.stringify({
              success: false,
              error: dbError.message,
              timestamp: new Date().toISOString()
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Database connection successful',
            data: { markets_found: markets?.length || 0 },
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      case 'mock_trade':
        // Mock trade execution test
        const mockTrade = {
          symbol: 'BTCUSDT',
          side: 'BUY',
          amount: 100,
          price: 45000,
          timestamp: new Date().toISOString()
        };

        // Log the mock trade
        const { error: logError } = await supabase
          .from('trade_logs')
          .insert({
            symbol: mockTrade.symbol,
            side: mockTrade.side,
            amount: mockTrade.amount,
            price: mockTrade.price,
            status: 'MOCK_SUCCESS',
            exchange: 'mock',
            category: 'test'
          });

        if (logError) {
          console.error('❌ Mock trade log error:', logError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Mock trade executed successfully',
            trade: mockTrade,
            logged: !logError,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid action',
            available_actions: ['status', 'db_test', 'mock_trade'],
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
    }

  } catch (error: any) {
    console.error('❌ [simple-test] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});