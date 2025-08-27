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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`📡 Signals API called: ${req.method} ${path}`);

    // Handle POST requests with path routing
    if (req.method === 'POST') {
      const body = await req.json();
      const requestPath = body.path;
      
      // GET /signals/live - Live signals endpoint
      if (requestPath === '/signals/live') {
        const { data: signals, error } = await supabase
          .from('signals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('❌ Live signals query error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }

        return new Response(JSON.stringify({
          success: true,
          items: signals || [],
          count: signals?.length || 0,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET /signals - List signals with filtering
    if (req.method === 'GET' && path.includes('/signals')) {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
      const symbol = url.searchParams.get('symbol');
      const timeframe = url.searchParams.get('timeframe');
      const direction = url.searchParams.get('direction');
      const minScore = parseFloat(url.searchParams.get('min_score') || '0');

      let query = supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (symbol) query = query.eq('symbol', symbol);
      if (timeframe) query = query.eq('timeframe', timeframe);
      if (direction) query = query.eq('direction', direction);
      if (minScore > 0) query = query.gte('score', minScore);

      const { data: signals, error } = await query;

      if (error) {
        console.error('❌ Signals query error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }

      return new Response(JSON.stringify({
        success: true,
        items: signals || [],
        count: signals?.length || 0,
        filters: { symbol, timeframe, direction, min_score: minScore }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET /recent - Recent active signals
    if (req.method === 'GET' && path.includes('/recent')) {
      const { data: signals, error } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Recent signals error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }

      return new Response(JSON.stringify({
        success: true,
        signals: signals || [],
        count: signals?.length || 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /scan - Trigger live scan
    if (req.method === 'POST' && path.includes('/scan')) {
      const body = await req.json();
      
      console.log('🔄 Triggering live scan with params:', body);
      
      const { data, error } = await supabase.functions.invoke('live-scanner', {
        body: {
          relaxed_filters: body.relaxed_filters || false,
          timeframes: body.timeframes || ['1h'],
          symbols: body.symbols || null
        }
      });

      if (error) {
        console.error('❌ Live scanner invoke error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }

      return new Response(JSON.stringify({
        success: true,
        scan_result: data
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET /health - System health check
    if (req.method === 'GET' && path.includes('/health')) {
      try {
        // Check latest scan
        const { data: latestScan } = await supabase
          .from('scans')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        // Check latest signal
        const { data: latestSignal } = await supabase
          .from('signals')
          .select('created_at, symbol, direction, score')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Count signals in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentSignals } = await supabase
          .from('signals')
          .select('id')
          .gte('created_at', oneHourAgo);

        // Check for errors in last hour
        const { data: recentErrors } = await supabase
          .from('errors_log')
          .select('id')
          .gte('created_at', oneHourAgo);

        const healthStatus = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          scanner: {
            last_scan_at: latestScan?.started_at,
            last_scan_duration_ms: latestScan?.finished_at 
              ? new Date(latestScan.finished_at).getTime() - new Date(latestScan.started_at).getTime()
              : null,
            symbols_scanned: latestScan?.symbols_count || 0,
            signals_generated: latestScan?.signals_count || 0
          },
          signals: {
            last_signal_at: latestSignal?.created_at,
            last_signal: latestSignal ? {
              symbol: latestSignal.symbol,
              direction: latestSignal.direction,
              score: latestSignal.score
            } : null,
            signals_last_hour: recentSignals?.length || 0
          },
          errors: {
            errors_last_hour: recentErrors?.length || 0
          }
        };

        // Determine overall status
        if (recentErrors && recentErrors.length > 10) {
          healthStatus.status = 'degraded';
        } else if (!latestScan || !latestSignal) {
          healthStatus.status = 'warning';
        }

        return new Response(JSON.stringify(healthStatus), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (healthError) {
        console.error('❌ Health check error:', healthError);
        return new Response(JSON.stringify({
          status: 'error',
          error: healthError.message,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // GET /stats - Signal statistics
    if (req.method === 'GET' && path.includes('/stats')) {
      try {
        const hoursBack = parseInt(url.searchParams.get('hours') || '24');
        const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

        // Get signal counts by direction
        const { data: signalStats } = await supabase
          .from('signals')
          .select('direction, score, symbol')
          .gte('created_at', startTime);

        if (!signalStats) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch signal statistics'
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          });
        }

        const stats = {
          total_signals: signalStats.length,
          long_signals: signalStats.filter(s => s.direction === 'LONG').length,
          short_signals: signalStats.filter(s => s.direction === 'SHORT').length,
          high_confidence: signalStats.filter(s => s.score >= 80).length,
          avg_score: signalStats.length > 0 
            ? (signalStats.reduce((sum, s) => sum + s.score, 0) / signalStats.length).toFixed(2)
            : 0,
          unique_symbols: [...new Set(signalStats.map(s => s.symbol))].length,
          time_range_hours: hoursBack
        };

        return new Response(JSON.stringify({
          success: true,
          stats
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } catch (statsError) {
        console.error('❌ Stats error:', statsError);
        return new Response(JSON.stringify({
          success: false,
          error: statsError.message
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }
    }

    // Default 404
    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      available_endpoints: [
        'GET /signals?limit=100&symbol=BTCUSDT&timeframe=1h&direction=LONG&min_score=75',
        'GET /recent',
        'POST /scan',
        'GET /health',
        'GET /stats?hours=24'
      ]
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404 
    });

  } catch (error) {
    console.error('❌ Signals API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});