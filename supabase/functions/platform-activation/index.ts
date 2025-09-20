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
    console.log('🚀 [platform-activation] Starting platform activation sequence...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 1: Initialize system status for live mode
    const systemServices = [
      'signal_generation',
      'market_data_feed',
      'trade_execution',
      'automated_trading',
      'signals_engine',
      'live_scanner',
      'bybit_connector',
      'risk_management'
    ];

    // Update system status for all services
    for (const service of systemServices) {
      await supabase
        .from('system_status')
        .upsert({
          service_name: service,
          status: 'active',
          last_update: new Date().toISOString(),
          metadata: {
            mode: 'live',
            platform_status: 'operational',
            activated_at: new Date().toISOString()
          }
        }, {
          onConflict: 'service_name'
        });
    }

    // Step 2: Enable exchange feed status
    await supabase
      .from('exchange_feed_status')
      .upsert({
        exchange: 'bybit',
        status: 'active',
        last_update: new Date().toISOString(),
        symbols_tracked: 50,
        error_count: 0
      }, {
        onConflict: 'exchange'
      });

    // Step 3: Initialize live market data for key symbols
    const keySymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
      'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT'
    ];

    // Fetch real market data from Bybit
    const marketDataUpdates = [];
    for (const symbol of keySymbols) {
      try {
        const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
        const data = await response.json();
        
        if (data.result && data.result.list && data.result.list.length > 0) {
          const ticker = data.result.list[0];
          marketDataUpdates.push({
            symbol: symbol,
            base_asset: symbol.replace('USDT', ''),
            quote_asset: 'USDT',
            exchange: 'bybit',
            price: parseFloat(ticker.lastPrice),
            volume: parseFloat(ticker.volume24h),
            change_24h_percent: parseFloat(ticker.price24hPcnt) * 100,
            high_24h: parseFloat(ticker.highPrice24h),
            low_24h: parseFloat(ticker.lowPrice24h),
            raw_data: ticker
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch data for ${symbol}:`, error);
      }
    }

    // Bulk insert/update live market data
    if (marketDataUpdates.length > 0) {
      await supabase
        .from('live_market_data')
        .upsert(marketDataUpdates, {
          onConflict: 'symbol,exchange'
        });
    }

    // Step 4: Trigger real-time signal generation
    console.log('🔄 Triggering real-time signal generation...');
    
    // Start live scanner
    const scannerResponse = await supabase.functions.invoke('live-scanner-production', {
      body: { 
        mode: 'live_activation',
        force_refresh: true,
        symbols: keySymbols
      }
    });

    // Start enhanced signal generation
    const signalResponse = await supabase.functions.invoke('enhanced-signal-generation', {
      body: { 
        mode: 'live_activation',
        force: true,
        symbols: keySymbols
      }
    });

    // Step 5: Update application settings
    await supabase
      .from('app_settings')
      .upsert([
        { key: 'platform_mode', value: '"live"' },
        { key: 'live_trading_enabled', value: 'true' },
        { key: 'data_source', value: '"real_time"' },
        { key: 'platform_activated_at', value: `"${new Date().toISOString()}"` }
      ], {
        onConflict: 'key'
      });

    // Step 6: Log activation event
    await supabase
      .from('edge_event_log')
      .insert({
        fn: 'platform_activation',
        stage: 'completed',
        payload: {
          timestamp: new Date().toISOString(),
          mode: 'live',
          services_activated: systemServices.length,
          market_data_symbols: marketDataUpdates.length,
          scanner_response: scannerResponse.data,
          signal_response: signalResponse.data
        }
      });

    console.log('✅ Platform activation completed successfully');

    const response = {
      success: true,
      message: 'Platform activated successfully',
      data: {
        mode: 'live',
        services_activated: systemServices,
        market_data_updated: marketDataUpdates.length,
        live_feeds: {
          scanner: scannerResponse.data?.success || false,
          signals: signalResponse.data?.success || false
        },
        activation_time: new Date().toISOString()
      },
      status: 'PLATFORM_LIVE'
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ [platform-activation] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Platform activation failed',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});