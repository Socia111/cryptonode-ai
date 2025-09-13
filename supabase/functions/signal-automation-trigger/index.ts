import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record, old_record } = await req.json();
    
    console.log('🚨 Signal automation triggered for:', record);

    // Only process signals with 80%+ confidence
    if (!record || record.score < 80) {
      console.log('❌ Signal below 80% confidence, skipping automation');
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Signal below threshold' 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Check if automation is enabled
    const automationEnabled = Deno.env.get('AUTO_TRADING_ENABLED') === 'true';
    if (!automationEnabled) {
      console.log('⏸️ Auto-trading disabled, skipping execution');
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Auto-trading disabled' 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get trading parameters
    const defaultAmount = parseFloat(Deno.env.get('DEFAULT_TRADE_AMOUNT') || '25');
    const defaultLeverage = parseFloat(Deno.env.get('DEFAULT_LEVERAGE') || '25');

    // Prepare trade execution request
    const tradeRequest = {
      action: 'place_order',
      symbol: record.symbol,
      side: record.direction === 'LONG' ? 'Buy' : 'Sell',
      amountUSD: defaultAmount,
      leverage: defaultLeverage,
      scalpMode: false,
      orderType: 'market',
      source: 'automation',
      signalId: record.id,
      signalScore: record.score
    };

    console.log('🤖 Executing automated trade:', tradeRequest);

    // Call the trade executor
    const tradeResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || ''
      },
      body: JSON.stringify(tradeRequest)
    });

    const tradeResult = await tradeResponse.json();
    
    if (tradeResult.success) {
      console.log('✅ Automated trade executed successfully:', tradeResult.data);
      
      return new Response(JSON.stringify({
        success: true,
        automation: true,
        signal: {
          id: record.id,
          symbol: record.symbol,
          direction: record.direction,
          score: record.score
        },
        trade: tradeResult.data
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } else {
      console.error('❌ Automated trade failed:', tradeResult.error);
      
      return new Response(JSON.stringify({
        success: false,
        automation: true,
        signal: record,
        error: tradeResult.error
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

  } catch (error: any) {
    console.error('💥 Signal automation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Signal automation failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});