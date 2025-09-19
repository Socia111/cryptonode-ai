import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { symbol } = body

    console.log('🔍 Instrument Info Request:', { symbol })

    if (!symbol) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Symbol is required'
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Mock instrument data for development - in production this would call Bybit API
    const instrumentData = {
      ok: true,
      symbol,
      lastPrice: getSymbolPrice(symbol),
      qtyStep: getQtyStep(symbol),
      minQty: getMinQty(symbol),
      maxLeverage: getMaxLeverage(symbol),
      minNotional: 5, // Minimum $5 order value
      priceScale: getPriceScale(symbol),
      status: 'Trading'
    };

    console.log('✅ Instrument Info Response:', instrumentData)

    return new Response(JSON.stringify(instrumentData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Instrument Info Error:', error);
    
    return new Response(JSON.stringify({
      ok: false,
      error: error.message || 'Internal server error'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// Helper functions for instrument data
function getSymbolPrice(symbol: string): number {
  const prices: Record<string, number> = {
    'BTCUSDT': 115446,
    'ETHUSDT': 4457.64,
    'BNBUSDT': 981,
    'XRPUSDT': 3.0037,
    'ADAUSDT': 0.8946,
    'SOLUSDT': 237.52,
    'DOTUSDT': 4.398,
    'LINKUSDT': 23.44,
    'AVAXUSDT': 58.23,
    'MATICUSDT': 0.5432,
    'ATOMUSDT': 12.34,
    'LTCUSDT': 234.56
  };
  return prices[symbol] || 50; // Default price
}

function getQtyStep(symbol: string): number {
  // Most crypto pairs have different quantity steps
  if (symbol.includes('BTC')) return 0.001;
  if (symbol.includes('ETH')) return 0.01;
  if (symbol.includes('ADA') || symbol.includes('XRP') || symbol.includes('DOT')) return 1;
  return 0.1; // Default
}

function getMinQty(symbol: string): number {
  if (symbol.includes('BTC')) return 0.001;
  if (symbol.includes('ETH')) return 0.01;
  if (symbol.includes('ADA') || symbol.includes('XRP') || symbol.includes('DOT')) return 1;
  return 0.1; // Default
}

function getMaxLeverage(symbol: string): number {
  // Conservative leverage limits for safety
  if (symbol.includes('BTC') || symbol.includes('ETH')) return 10;
  return 5; // Default conservative leverage
}

function getPriceScale(symbol: string): number {
  if (symbol.includes('BTC')) return 2;
  if (symbol.includes('ETH')) return 2;
  if (symbol.includes('ADA') || symbol.includes('XRP')) return 4;
  return 3; // Default
}