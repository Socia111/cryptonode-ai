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
    const url = new URL(req.url);
    const path = url.pathname;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Route: GET /signals/recent
    if (req.method === 'GET' && path.includes('/recent')) {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const exchange = url.searchParams.get('exchange');
      const timeframe = url.searchParams.get('timeframe');
      const direction = url.searchParams.get('direction');
      
      let query = supabase
        .from('scanner_signals')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(limit);
      
      if (exchange) query = query.eq('exchange', exchange);
      if (timeframe) query = query.eq('timeframe', timeframe);
      if (direction) query = query.eq('direction', direction);
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          signals: data || [],
          count: data?.length || 0,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /signals/live
    if (req.method === 'GET' && path.includes('/live')) {
      const { data, error } = await supabase
        .from('scanner_signals')
        .select('*')
        .eq('is_active', true)
        .gte('generated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('confidence_score', { ascending: false })
        .limit(20);
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          live_signals: data || [],
          count: data?.length || 0,
          last_update: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /signals/stats
    if (req.method === 'GET' && path.includes('/stats')) {
      const since = url.searchParams.get('since') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: signals, error: signalsError } = await supabase
        .from('scanner_signals')
        .select('direction, confidence_score, exchange, timeframe, generated_at')
        .gte('generated_at', since);
      
      if (signalsError) {
        throw new Error(`Database error: ${signalsError.message}`);
      }
      
      const stats = {
        total_signals: signals?.length || 0,
        long_signals: signals?.filter(s => s.direction === 'LONG').length || 0,
        short_signals: signals?.filter(s => s.direction === 'SHORT').length || 0,
        avg_confidence: signals?.length ? 
          signals.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / signals.length : 0,
        high_confidence: signals?.filter(s => (s.confidence_score || 0) >= 80).length || 0,
        by_exchange: signals?.reduce((acc, s) => {
          acc[s.exchange] = (acc[s.exchange] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
        by_timeframe: signals?.reduce((acc, s) => {
          acc[s.timeframe] = (acc[s.timeframe] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {}
      };
      
      return new Response(
        JSON.stringify({
          success: true,
          stats,
          period: since,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /signals/webhook
    if (req.method === 'POST' && path.includes('/webhook')) {
      const body = await req.json();
      const { target_url, signal_data } = body;
      
      if (!target_url || !signal_data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing target_url or signal_data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        // Forward signal to external webhook
        const response = await fetch(target_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            algorithm: 'AItradeX1',
            signal: signal_data,
            timestamp: new Date().toISOString()
          })
        });
        
        const success = response.ok;
        
        return new Response(
          JSON.stringify({
            success,
            webhook_status: response.status,
            webhook_response: success ? 'delivered' : 'failed',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Webhook delivery failed: ${(error as Error).message}`,
            timestamp: new Date().toISOString()
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route: GET /signals/diagnostics
    if (req.method === 'GET' && path.includes('/diagnostics')) {
      const since = url.searchParams.get('since') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: evalLogs, error: evalError } = await supabase
        .from('eval_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (evalError) {
        throw new Error(`Database error: ${evalError.message}`);
      }
      
      const diagnostics = {
        evaluation_count: evalLogs?.length || 0,
        symbols_evaluated: new Set(evalLogs?.map(e => e.symbol) || []).size,
        avg_score: evalLogs?.length ? 
          evalLogs.reduce((sum, e) => sum + (e.score || 0), 0) / evalLogs.length : 0,
        filter_analysis: evalLogs?.reduce((acc, e) => {
          const filters = e.filters || {};
          Object.entries(filters).forEach(([key, value]) => {
            if (!acc[key]) acc[key] = { passed: 0, total: 0 };
            acc[key].total++;
            if (value) acc[key].passed++;
          });
          return acc;
        }, {} as Record<string, { passed: number; total: number }>) || {},
        recent_evaluations: evalLogs?.slice(0, 20) || []
      };
      
      return new Response(
        JSON.stringify({
          success: true,
          diagnostics,
          period: since,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /signals/subscribe
    if (req.method === 'POST' && path.includes('/subscribe')) {
      const body = await req.json();
      const { channel, target, min_score, only_direction } = body;
      
      if (!channel || !target) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing channel or target' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data, error } = await supabase
        .from('subscribers')
        .insert({
          channel,
          target,
          min_score: min_score || 0,
          only_direction,
          active: true
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Subscription error: ${error.message}`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          subscription: data,
          message: 'Subscription created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: API info
    return new Response(
      JSON.stringify({
        success: true,
        api: 'AItradeX1 Signals API',
        version: '1.0.0',
        endpoints: {
          'GET /signals/recent': 'Get recent signals with optional filters',
          'GET /signals/live': 'Get currently active signals',
          'GET /signals/stats': 'Get signal statistics',
          'GET /signals/diagnostics': 'Get evaluation diagnostics',
          'POST /signals/webhook': 'Forward signals to external webhook',
          'POST /signals/subscribe': 'Subscribe to signal notifications'
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Signals API Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});