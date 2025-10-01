import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const relaxedFilters = url.searchParams.get('relaxed_filters') === 'true';

    const config = {
      config: {
        version: '2.1.0',
        mode: relaxedFilters ? 'relaxed' : 'canonical',
        inputs: {
          // Scanner configuration
          scanner: {
            min_score: relaxedFilters ? 65 : 75,
            min_confidence: relaxedFilters ? 0.65 : 0.75,
            timeframes: ['5m', '15m', '1h', '4h'],
            exchanges: ['bybit'],
            symbols: [
              'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
              'ADAUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT'
            ]
          },
          
          // Indicator thresholds
          indicators: {
            rsi: {
              oversold: 30,
              overbought: 70,
              period: 14
            },
            sma: {
              short: 20,
              long: 50
            },
            volume: {
              min_ratio: relaxedFilters ? 1.2 : 1.5
            }
          },
          
          // Risk management
          risk: {
            max_leverage: 10,
            default_leverage: 1,
            stop_loss_percent: 2,
            take_profit_percent: 5,
            max_position_size_usd: 10000
          },
          
          // Trading settings
          trading: {
            min_order_size_usd: 5,
            auto_trading_enabled: false,
            paper_trading: true,
            max_concurrent_positions: 3
          },
          
          // Data sources
          data: {
            primary_exchange: 'bybit',
            data_source: 'real_ohlcv',
            realtime_enabled: true,
            historical_bars_limit: 100
          }
        },
        
        // System metadata
        metadata: {
          last_updated: new Date().toISOString(),
          environment: 'production',
          data_source: 'bybit_api_v5',
          features_enabled: [
            'real_time_scanning',
            'signal_generation',
            'backtesting',
            'quantum_analysis',
            'telegram_alerts',
            'aira_rankings',
            'spynx_scores'
          ]
        }
      }
    };

    return new Response(
      JSON.stringify(config),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AItradeX1 Config] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
