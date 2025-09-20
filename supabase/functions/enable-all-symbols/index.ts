import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Enabling all symbols for comprehensive trading...');

    // Step 1: Fetch all symbols
    const fetchResponse = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/fetch-all-symbols', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    const fetchResult = await fetchResponse.json();
    
    if (!fetchResult.success) {
      throw new Error(`Symbol fetch failed: ${fetchResult.error}`);
    }

    console.log(`✅ Fetched ${fetchResult.symbols_count} symbols`);

    // Step 2: Update system settings for comprehensive scanning
    await supabase
      .from('app_settings')
      .upsert({
        key: 'comprehensive_scanning_enabled',
        value: { 
          enabled: true, 
          symbols_count: fetchResult.symbols_count,
          enabled_at: new Date().toISOString()
        },
        description: 'Comprehensive scanning across all available symbols'
      });

    // Step 3: Trigger initial comprehensive scan
    const scanFunctions = [
      'live-signals-generator',
      'enhanced-signal-generation', 
      'live-scanner-production'
    ];

    const scanPromises = scanFunctions.map(async (functionName) => {
      try {
        const response = await fetch(`https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ comprehensive_scan: true })
        });
        
        const result = await response.json();
        return { function: functionName, success: response.ok, result };
      } catch (error) {
        return { function: functionName, success: false, error: error.message };
      }
    });

    const scanResults = await Promise.allSettled(scanPromises);
    
    let successfulScans = 0;
    scanResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successfulScans++;
        console.log(`✅ ${result.value.function} scan completed`);
      } else {
        console.log(`⚠️ ${result.status === 'fulfilled' ? result.value.function : 'unknown'} scan failed`);
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully enabled comprehensive trading across ${fetchResult.symbols_count} symbols`,
      details: {
        symbols_enabled: fetchResult.symbols_count,
        scan_functions_triggered: scanFunctions.length,
        successful_scans: successfulScans,
        comprehensive_mode: true
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error enabling all symbols:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});