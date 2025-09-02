import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const bybitApiKey = Deno.env.get('BYBIT_API_KEY');
    const bybitApiSecret = Deno.env.get('BYBIT_API_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Check environment variables
    const envStatus = {
      hasApiKey: !!bybitApiKey,
      apiKeyLength: bybitApiKey?.length || 0,
      apiKeyPreview: bybitApiKey ? `${bybitApiKey.substring(0, 6)}...${bybitApiKey.substring(bybitApiKey.length - 4)}` : 'None',
      hasApiSecret: !!bybitApiSecret,
      apiSecretLength: bybitApiSecret?.length || 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey
    };

    // Test Bybit API connectivity (simple server time check)
    let bybitStatus = { connected: false, error: null };
    try {
      const response = await fetch('https://api.bybit.com/v5/market/time');
      if (response.ok) {
        const data = await response.json();
        bybitStatus = { connected: true, serverTime: data.result?.timeSecond };
      } else {
        bybitStatus = { connected: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      bybitStatus = { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envStatus,
      bybit: bybitStatus,
      message: 'Debug information collected successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});