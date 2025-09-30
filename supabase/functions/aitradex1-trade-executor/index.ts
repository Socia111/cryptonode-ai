import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  amount_usd: number;
  leverage?: number;
  signal_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symbol, side, amount_usd, leverage = 1, signal_id } = await req.json() as TradeRequest;

    console.log(`[Trade Executor] Processing trade: ${symbol} ${side} $${amount_usd} @ ${leverage}x`);

    // Validate inputs
    if (!symbol || !side || !amount_usd) {
      throw new Error('Missing required parameters: symbol, side, amount_usd');
    }

    // Get Bybit credentials
    const bybitKey = Deno.env.get('BYBIT_API_KEY');
    const bybitSecret = Deno.env.get('BYBIT_API_SECRET');
    const bybitTestnet = Deno.env.get('BYBIT_TESTNET') === 'true';

    if (!bybitKey || !bybitSecret) {
      throw new Error('Bybit API credentials not configured');
    }

    // Calculate quantity based on current price
    const baseUrl = bybitTestnet 
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';

    // Get current price
    const tickerUrl = `${baseUrl}/v5/market/tickers?category=linear&symbol=${symbol}`;
    const tickerResp = await fetch(tickerUrl);
    const tickerData = await tickerResp.json();
    
    if (tickerData.retCode !== 0) {
      throw new Error(`Failed to get ticker: ${tickerData.retMsg}`);
    }

    const currentPrice = parseFloat(tickerData.result.list[0].lastPrice);
    const qty = (amount_usd / currentPrice).toFixed(3);

    console.log(`[Trade Executor] Price: ${currentPrice}, Qty: ${qty}`);

    // Create Bybit order
    const timestamp = Date.now().toString();
    const orderParams = {
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty,
      positionIdx: 0,
      timeInForce: 'GTC',
      leverage: leverage.toString(),
    };

    const paramStr = timestamp + bybitKey + '5000' + JSON.stringify(orderParams);
    const encoder = new TextEncoder();
    const keyData = encoder.encode(bybitSecret);
    const msgData = encoder.encode(paramStr);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const orderResp = await fetch(`${baseUrl}/v5/order/create`, {
      method: 'POST',
      headers: {
        'X-BAPI-API-KEY': bybitKey,
        'X-BAPI-SIGN': signHex,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderParams),
    });

    const orderData = await orderResp.json();

    // Log execution
    const { error: logError } = await supabase.from('execution_orders').insert({
      symbol,
      side,
      amount_usd,
      leverage,
      qty: parseFloat(qty),
      executed_price: currentPrice,
      status: orderData.retCode === 0 ? 'completed' : 'failed',
      exchange_order_id: orderData.result?.orderId,
      ret_code: orderData.retCode,
      ret_msg: orderData.retMsg,
      raw_response: orderData,
      signal_id,
    });

    if (logError) {
      console.error('[Trade Executor] Failed to log execution:', logError);
    }

    if (orderData.retCode !== 0) {
      throw new Error(`Order failed: ${orderData.retMsg}`);
    }

    console.log(`[Trade Executor] ✅ Order executed: ${orderData.result.orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderData.result.orderId,
        symbol,
        side,
        qty,
        price: currentPrice,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Trade Executor] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
