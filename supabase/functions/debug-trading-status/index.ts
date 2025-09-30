import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    // Standardized environment variables with fallbacks
    const bybitApiKey = Deno.env.get('BYBIT_API_KEY') ?? Deno.env.get('BYBIT_KEY');
    const bybitApiSecret = Deno.env.get('BYBIT_API_SECRET') ?? Deno.env.get('BYBIT_SECRET');
    const baseUrl = Deno.env.get('BYBIT_BASE') ?? 'https://api-testnet.bybit.com';
    const liveTrading = Deno.env.get('LIVE_TRADING_ENABLED') === 'true';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('🔧 Environment Debug:');
    console.log('  - BYBIT_API_KEY value:', bybitApiKey);
    console.log('  - BYBIT_API_SECRET value:', bybitApiSecret);
    console.log('  - BYBIT_API_KEY length:', bybitApiKey?.length);
    console.log('  - BYBIT_API_SECRET length:', bybitApiSecret?.length);

    // Enhanced environment status
    const envStatus = {
      hasApiKey: !!bybitApiKey && bybitApiKey.length > 0,
      apiKeyLength: bybitApiKey?.length || 0,
      apiKeyPreview: bybitApiKey && bybitApiKey.length > 0 ? `${bybitApiKey.substring(0, 6)}...${bybitApiKey.substring(bybitApiKey.length - 4)}` : 'None',
      hasApiSecret: !!bybitApiSecret && bybitApiSecret.length > 0,
      apiSecretLength: bybitApiSecret?.length || 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey,
      baseUrl: baseUrl,
      liveTrading: liveTrading,
      isTestnet: baseUrl.includes('testnet'),
      configurationStatus: (!bybitApiKey || !bybitApiSecret) ? 'MISSING_CREDENTIALS' : 'CONFIGURED'
    };

    // Test Bybit API connectivity using configured base URL
    let bybitStatus = { connected: false, error: null, baseUrl: baseUrl };
    try {
      const response = await fetch(`${baseUrl}/v5/market/time`);
      if (response.ok) {
        const data = await response.json();
        bybitStatus = { 
          connected: true, 
          serverTime: data.result?.timeSecond,
          baseUrl: baseUrl,
          environment: baseUrl.includes('testnet') ? 'testnet' : 'mainnet'
        };
      } else {
        bybitStatus = { 
          connected: false, 
          error: `HTTP ${response.status}`,
          baseUrl: baseUrl 
        };
      }
    } catch (error) {
      bybitStatus = { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        baseUrl: baseUrl
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