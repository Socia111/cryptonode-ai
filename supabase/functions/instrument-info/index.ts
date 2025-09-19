const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { symbol } = body;

    if (!symbol) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Symbol is required'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📊 Getting instrument info for:', symbol);

    // Fetch from Bybit API
    const bybitResponse = await fetch(`https://api.bybit.com/v5/market/instruments-info?category=linear&symbol=${symbol}`);
    const bybitData = await bybitResponse.json();

    if (bybitData.retCode !== 0 || !bybitData.result?.list?.[0]) {
      return new Response(JSON.stringify({
        ok: false,
        error: `Instrument ${symbol} not found or not available`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const instrument = bybitData.result.list[0];

    // Get current price
    const tickerResponse = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
    const tickerData = await tickerResponse.json();
    
    const currentPrice = tickerData.result?.list?.[0]?.lastPrice || 0;

    const result = {
      ok: true,
      symbol: instrument.symbol,
      status: instrument.status,
      baseCoin: instrument.baseCoin,
      quoteCoin: instrument.quoteCoin,
      contractType: instrument.contractType,
      
      // Trading limits
      minQty: parseFloat(instrument.lotSizeFilter.minOrderQty),
      maxQty: parseFloat(instrument.lotSizeFilter.maxOrderQty),
      qtyStep: parseFloat(instrument.lotSizeFilter.qtyStep),
      
      // Price filters
      minPrice: parseFloat(instrument.priceFilter.minPrice),
      maxPrice: parseFloat(instrument.priceFilter.maxPrice),
      tickSize: parseFloat(instrument.priceFilter.tickSize),
      
      // Leverage and margin
      maxLeverage: parseFloat(instrument.leverageFilter.maxLeverage),
      minLeverage: parseFloat(instrument.leverageFilter.minLeverage),
      leverageStep: parseFloat(instrument.leverageFilter.leverageStep),
      
      // Notional value
      minNotional: parseFloat(instrument.lotSizeFilter.minNotionalValue || '0'),
      
      // Current market data
      lastPrice: parseFloat(currentPrice),
      
      // Trading status
      launchTime: instrument.launchTime,
      deliveryTime: instrument.deliveryTime,
      isTrading: instrument.status === 'Trading'
    };

    console.log('✅ Instrument info retrieved:', result.symbol);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Instrument info error:', error);
    
    return new Response(JSON.stringify({
      ok: false,
      error: error.message || 'Failed to fetch instrument info'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});