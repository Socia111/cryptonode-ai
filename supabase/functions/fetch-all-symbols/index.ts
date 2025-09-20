import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BybitSymbol {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
  innovation: string;
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

    console.log('🔍 Fetching all Bybit symbols...');

    // Fetch all symbols from Bybit API
    const response = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
    const data = await response.json();

    if (!data.result || !data.result.list) {
      throw new Error('Failed to fetch symbols from Bybit API');
    }

    // Filter for USDT pairs only and active status
    const usdtSymbols = data.result.list
      .filter((item: BybitSymbol) => 
        item.quoteCoin === 'USDT' && 
        item.status === 'Trading' &&
        item.innovation !== '1' // Exclude innovation zone
      )
      .map((item: BybitSymbol) => item.symbol)
      .sort();

    console.log(`📊 Found ${usdtSymbols.length} active USDT trading pairs`);

    // Update whitelist settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('whitelist_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching current settings:', fetchError);
    }

    // Insert or update whitelist settings
    const { error: upsertError } = await supabase
      .from('whitelist_settings')
      .upsert({
        id: currentSettings?.id || undefined,
        whitelist_enabled: true,
        whitelist_pairs: usdtSymbols,
        max_symbols: Math.max(usdtSymbols.length + 100, 1000),
        auto_update: true,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      throw new Error(`Failed to update whitelist: ${upsertError.message}`);
    }

    // Update app settings for symbol count
    await supabase
      .from('app_settings')
      .upsert({
        key: 'total_symbols_available',
        value: { count: usdtSymbols.length, last_updated: new Date().toISOString() },
        description: 'Total number of symbols available for trading'
      });

    console.log(`✅ Updated whitelist with ${usdtSymbols.length} symbols`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully updated whitelist with ${usdtSymbols.length} symbols`,
      symbols_count: usdtSymbols.length,
      sample_symbols: usdtSymbols.slice(0, 10),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in fetch-all-symbols:', error);
    
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