import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TradingViewAlert {
  ticker: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  price?: number;
  quantity?: number;
  stop_loss?: number;
  take_profit?: number;
  message?: string;
  strategy?: string;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const alert: TradingViewAlert = await req.json();
    
    console.log('📊 TradingView Alert Received:', alert);
    
    // Validate required fields
    if (!alert.ticker || !alert.action) {
      throw new Error('Missing required fields: ticker, action');
    }

    // Transform TradingView alert to Bybit signal format
    const bybitSignal = {
      symbol: alert.ticker.replace(':', 'USDT'), // Convert BTCUSD to BTCUSDT
      side: alert.action === 'BUY' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: (alert.quantity || 0.001).toString(), // Default small quantity
      ...(alert.price && { price: alert.price.toString() }),
      ...(alert.stop_loss && { stopLoss: alert.stop_loss.toString() }),
      ...(alert.take_profit && { takeProfit: alert.take_profit.toString() })
    };

    // Execute trade via Bybit function
    const functionsUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co');
    
    let bybitResponse;
    
    if (alert.action === 'CLOSE') {
      // Close position
      bybitResponse = await fetch(`${functionsUrl}/bybit-live-trading`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'close_position',
          signal: { symbol: bybitSignal.symbol }
        })
      });
    } else {
      // Place new order
      bybitResponse = await fetch(`${functionsUrl}/bybit-live-trading`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'place_order',
          signal: bybitSignal
        })
      });
    }

    const bybitResult = await bybitResponse.json();
    
    // Log trade execution to database (optional)
    console.log('✅ Trade executed via TradingView webhook:', {
      alert,
      bybitResult,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'TradingView alert processed successfully',
        alert,
        execution: bybitResult,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ TradingView Webhook Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});