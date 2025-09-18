import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role for inserts
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Signal {
  id?: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  timeframe: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  score: number;
  confidence?: number;
  source?: string;
  algo?: string;
  bar_time?: string;
  meta?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    switch (action) {
      case 'recent': {
        const { limit = 50, minScore = 70 } = payload;
        
        const { data: signals, error } = await supabase
          .from('signals')
          .select('*')
          .gte('score', minScore)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          signals: signals || [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'insert': {
        const { signals } = payload as { signals: Signal[] };
        
        if (!Array.isArray(signals) || signals.length === 0) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'No signals provided' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Transform signals to match database schema
        const transformedSignals = signals.map(signal => ({
          symbol: signal.symbol,
          direction: signal.direction,
          timeframe: signal.timeframe,
          price: signal.entry_price || 0,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          take_profit: signal.take_profit,
          score: signal.score,
          confidence: signal.confidence,
          source: signal.source || 'system',
          algo: signal.algo || 'unirail_core',
          bar_time: signal.bar_time ? new Date(signal.bar_time).toISOString() : new Date().toISOString(),
          metadata: signal.meta || {},
          exchange: 'bybit'
        }));

        const { data, error } = await supabase
          .from('signals')
          .insert(transformedSignals)
          .select();

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          inserted: data?.length || 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        // Get signal counts for last 1h and 24h
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [{ count: last1h }, { count: last24h }] = await Promise.all([
          supabase.from('signals').select('*', { count: 'exact', head: true }).gte('created_at', oneHourAgo),
          supabase.from('signals').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo)
        ]);

        return new Response(JSON.stringify({ 
          success: true, 
          counts: { last1h: last1h || 0, last24h: last24h || 0 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Unknown action' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in signals-api:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});