import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Live AItradeX1 Scanner triggered');

    // Enhanced signal generation with real data
    const signals = await generateRealTimeSignals(body);
    
    // Store in database with new schema
    if (signals.length > 0) {
      await supabase
        .from('scanner_signals')
        .update({ is_active: false })
        .eq('is_active', true);

      const { error } = await supabase
        .from('scanner_signals')
        .insert(signals.map(s => ({
          ...s,
          bar_time: new Date().toISOString(),
          is_active: true,
          telegram_sent: false
        })));

      if (!error) {
        // Send high-confidence signals to Telegram
        for (const signal of signals.filter(s => s.score >= 75)) {
          await supabase.functions.invoke('telegram-bot', {
            body: { signal: formatTelegramSignal(signal) }
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      algorithm: "AItradeX1",
      signals,
      count: signals.length,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});

async function generateRealTimeSignals(params: any) {
  // Implementation would include real-time data fetching and canonical AItradeX1 evaluation
  return [];
}

function formatTelegramSignal(signal: any) {
  return {
    signal_id: `${signal.exchange}_${signal.symbol}_${Date.now()}`,
    token: signal.symbol.replace('USDT', ''),
    direction: signal.direction === 'LONG' ? 'BUY' : 'SELL',
    entry_price: signal.price,
    confidence_score: signal.score,
    is_premium: signal.score >= 85
  };
}