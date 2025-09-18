import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CCXT Implementation based on https://github.com/Socia111/ccxt/tree/master
const CCXT_EXCHANGES = {
  binance: {
    apiUrl: 'https://api.binance.com',
    testnetUrl: 'https://testnet.binance.vision',
    rateLimits: { requests: 1200, interval: 60000 }
  },
  bybit: {
    apiUrl: 'https://api.bybit.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    rateLimits: { requests: 120, interval: 60000 }
  },
  okx: {
    apiUrl: 'https://www.okx.com',
    testnetUrl: 'https://www.okx.com',
    rateLimits: { requests: 300, interval: 60000 }
  },
  coinbase: {
    apiUrl: 'https://api.exchange.coinbase.com',
    testnetUrl: 'https://api-public.sandbox.exchange.coinbase.com',
    rateLimits: { requests: 200, interval: 60000 }
  },
  kraken: {
    apiUrl: 'https://api.kraken.com',
    testnetUrl: 'https://api.kraken.com',
    rateLimits: { requests: 180, interval: 60000 }
  },
  kucoin: {
    apiUrl: 'https://api.kucoin.com',
    testnetUrl: 'https://openapi-sandbox.kucoin.com',
    rateLimits: { requests: 300, interval: 60000 }
  }
};

const CRYPTO_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
  'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'AVAXUSDT', 'UNIUSDT', 'ATOMUSDT',
  'FTMUSDT', 'MANAUSDT', 'SANDUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT',
  'FILUSDT', 'TRXUSDT', 'EOSUSDT', 'XLMUSDT', 'AAVEUSDT', 'GRTUSDT',
  'ENJUSDT', 'CHZUSDT', 'BATUSDT', 'ZECUSDT', 'DASHUSDT', 'COMPUSDT'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Enhanced CCXT Feed] Starting enhanced multi-exchange data collection...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action = 'scan', exchanges = ['binance', 'bybit', 'okx'], symbols = CRYPTO_SYMBOLS } = await req.json().catch(() => ({}));

    const results = {
      timestamp: new Date().toISOString(),
      action,
      exchanges_processed: [],
      market_data_collected: 0,
      signals_generated: 0,
      errors: []
    };

    // Whitelist all crypto trading pairs
    const whitelistedPairs = [
      ...CRYPTO_SYMBOLS,
      ...CRYPTO_SYMBOLS.map(s => s.replace('USDT', 'USD')),
      ...CRYPTO_SYMBOLS.map(s => s.replace('USDT', 'BTC')),
      ...CRYPTO_SYMBOLS.map(s => s.replace('USDT', 'ETH'))
    ];

    console.log(`[Enhanced CCXT Feed] Processing ${exchanges.length} exchanges for ${whitelistedPairs.length} symbols...`);

    for (const exchangeName of exchanges) {
      try {
        console.log(`[Enhanced CCXT Feed] Processing ${exchangeName}...`);
        
        const exchangeConfig = CCXT_EXCHANGES[exchangeName];
        if (!exchangeConfig) {
          console.warn(`[Enhanced CCXT Feed] Unknown exchange: ${exchangeName}`);
          continue;
        }

        const marketDataBatch = [];

        // Fetch ticker data for all symbols
        for (const symbol of whitelistedPairs.slice(0, 15)) { // Limit to prevent rate limits
          try {
            let tickerData;
            
            // Exchange-specific API calls based on CCXT standards
            switch (exchangeName) {
              case 'binance':
                const binanceResponse = await fetch(`${exchangeConfig.apiUrl}/api/v3/ticker/24hr?symbol=${symbol}`);
                if (binanceResponse.ok) {
                  tickerData = await binanceResponse.json();
                }
                break;
                
              case 'bybit':
                const bybitResponse = await fetch(`${exchangeConfig.apiUrl}/v5/market/tickers?category=spot&symbol=${symbol}`);
                if (bybitResponse.ok) {
                  const data = await bybitResponse.json();
                  tickerData = data.result?.list?.[0];
                }
                break;
                
              case 'okx':
                const okxResponse = await fetch(`${exchangeConfig.apiUrl}/api/v5/market/ticker?instId=${symbol}`);
                if (okxResponse.ok) {
                  const data = await okxResponse.json();
                  tickerData = data.data?.[0];
                }
                break;
                
              default:
                // Generic fallback
                console.log(`[Enhanced CCXT Feed] Using generic API for ${exchangeName}`);
                break;
            }

            if (tickerData) {
              // Normalize data format across exchanges
              const normalizedData = {
                symbol: symbol,
                exchange: exchangeName,
                price: parseFloat(tickerData.lastPrice || tickerData.last || tickerData.close || 0),
                volume: parseFloat(tickerData.volume || tickerData.baseVolume || 0),
                change_24h: parseFloat(tickerData.priceChange || tickerData.change || 0),
                change_24h_percent: parseFloat(tickerData.priceChangePercent || tickerData.percentage || 0),
                high_24h: parseFloat(tickerData.highPrice || tickerData.high || 0),
                low_24h: parseFloat(tickerData.lowPrice || tickerData.low || 0),
                bid: parseFloat(tickerData.bidPrice || tickerData.bid || 0),
                ask: parseFloat(tickerData.askPrice || tickerData.ask || 0),
                base_asset: symbol.replace('USDT', '').replace('USD', '').replace('BTC', '').replace('ETH', ''),
                quote_asset: 'USDT',
                raw_data: tickerData,
                created_at: new Date().toISOString()
              };

              marketDataBatch.push(normalizedData);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (symbolError) {
            console.warn(`[Enhanced CCXT Feed] Error fetching ${symbol} from ${exchangeName}:`, symbolError.message);
          }
        }

        // Store market data in database
        if (marketDataBatch.length > 0) {
          console.log(`[Enhanced CCXT Feed] Storing ${marketDataBatch.length} market data points from ${exchangeName}...`);
          
          const { error: insertError } = await supabase
            .from('live_market_data')
            .upsert(marketDataBatch, {
              onConflict: 'symbol,exchange',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error(`[Enhanced CCXT Feed] Error storing ${exchangeName} data:`, insertError);
            results.errors.push(`${exchangeName}: ${insertError.message}`);
          } else {
            results.market_data_collected += marketDataBatch.length;
            results.exchanges_processed.push({
              exchange: exchangeName,
              symbols_collected: marketDataBatch.length,
              status: 'success'
            });
          }
        }

        // Update exchange feed status
        await supabase
          .from('exchange_feed_status')
          .upsert({
            exchange: exchangeName,
            status: 'active_enhanced_ccxt',
            last_update: new Date().toISOString(),
            symbols_tracked: marketDataBatch.length,
            error_count: 0
          }, {
            onConflict: 'exchange'
          });

      } catch (exchangeError) {
        console.error(`[Enhanced CCXT Feed] Error processing ${exchangeName}:`, exchangeError);
        results.errors.push(`${exchangeName}: ${exchangeError.message}`);
        
        results.exchanges_processed.push({
          exchange: exchangeName,
          symbols_collected: 0,
          status: 'error',
          error: exchangeError.message
        });
      }
    }

    // Generate trading signals if data was collected
    if (results.market_data_collected > 0) {
      try {
        console.log('[Enhanced CCXT Feed] Triggering signal generation...');
        
        const { data: signalData, error: signalError } = await supabase.functions.invoke('enhanced-signal-generation', {
          body: { 
            source: 'enhanced_ccxt_feed',
            trigger: 'auto',
            exchanges: exchanges 
          }
        });

        if (!signalError && signalData) {
          results.signals_generated = signalData.signals_generated || 0;
        }
      } catch (signalError) {
        console.warn('[Enhanced CCXT Feed] Signal generation error:', signalError);
      }
    }

    // Update system status
    await supabase
      .from('app_settings')
      .upsert({
        key: 'enhanced_ccxt_status',
        value: {
          last_run: new Date().toISOString(),
          exchanges_active: results.exchanges_processed.length,
          market_data_points: results.market_data_collected,
          signals_generated: results.signals_generated,
          status: results.errors.length === 0 ? 'operational' : 'partial_errors',
          whitelist_enabled: true,
          all_crypto_enabled: true
        }
      }, {
        onConflict: 'key'
      });

    console.log(`[Enhanced CCXT Feed] Completed: ${results.market_data_collected} data points, ${results.signals_generated} signals`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Enhanced CCXT Feed] Critical error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'CRITICAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});