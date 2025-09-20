// Enhanced production monitoring with real-time metrics and alerting
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoringMetrics {
  signalsGenerated: number
  tradesExecuted: number
  errorRate: number
  avgResponseTime: number
  systemHealth: 'healthy' | 'degraded' | 'critical'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'comprehensive' } = await req.json().catch(() => ({}));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;

    switch (action) {
      case 'comprehensive':
        result = await runComprehensiveMonitoring(supabase);
        break;
      case 'health':
        result = await getSystemHealth(supabase);
        break;
      case 'signals_stats':
        result = await getSignalsStats(supabase);
        break;
      case 'alert_rates':
        result = await getAlertRates(supabase);
        break;
      case 'filter_analysis':
        result = await getFilterAnalysis(supabase);
        break;
      default:
        result = await runComprehensiveMonitoring(supabase);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Production Monitor Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Enhanced comprehensive monitoring
async function runComprehensiveMonitoring(supabase: any) {
  const metrics = await collectSystemMetrics(supabase);
  const healthStatus = await checkSystemHealth(supabase);
  
  // Update system status
  await updateSystemStatus(supabase, metrics, healthStatus);
  
  // Check and send alerts if necessary
  await checkAndSendAlerts(supabase, metrics, healthStatus);

  return {
    metrics,
    healthStatus,
    overall: determineOverallStatus(metrics, healthStatus),
    recommendations: generateRecommendations(metrics, healthStatus)
  };
}

async function collectSystemMetrics(supabase: any): Promise<MonitoringMetrics> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Count signals generated in last hour
  const { count: signalsCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo.toISOString());

  // Count trades executed in last hour
  const { count: tradesCount } = await supabase
    .from('execution_orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo.toISOString());

  // Calculate error rate from logs
  const { data: errorLogs } = await supabase
    .from('edge_event_log')
    .select('*')
    .gte('created_at', oneHourAgo.toISOString())
    .ilike('stage', '%error%');

  const { data: totalLogs } = await supabase
    .from('edge_event_log')
    .select('*')
    .gte('created_at', oneHourAgo.toISOString());

  const errorRate = totalLogs?.length ? (errorLogs?.length || 0) / totalLogs.length : 0;

  // Check system components
  const signalsHealthy = (signalsCount || 0) > 0;
  const tradesHealthy = errorRate < 0.1;
  const systemHealth = signalsHealthy && tradesHealthy ? 'healthy' : 
                      signalsHealthy || tradesHealthy ? 'degraded' : 'critical';

  return {
    signalsGenerated: signalsCount || 0,
    tradesExecuted: tradesCount || 0,
    errorRate: Math.round(errorRate * 100) / 100,
    avgResponseTime: 150, // Mock value
    systemHealth
  };
}

async function checkSystemHealth(supabase: any) {
  const checks = {
    database: false,
    signalEngines: false,
    tradingExecution: false,
    externalAPIs: false
  };

  try {
    // Database check
    const { data } = await supabase.from('signals').select('id').limit(1);
    checks.database = !!data;

    // Signal engines check - recent signals
    const { count } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
    
    checks.signalEngines = (count || 0) > 0;

    // Trading execution check
    const { data: recentTrades } = await supabase
      .from('execution_orders')
      .select('status')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(10);

    checks.tradingExecution = !recentTrades?.some(trade => trade.status === 'error');

    // External APIs check (Bybit connectivity)
    try {
      const response = await fetch('https://api.bybit.com/v5/market/time');
      checks.externalAPIs = response.ok;
    } catch {
      checks.externalAPIs = false;
    }

  } catch (error) {
    console.error('Health check error:', error);
  }

  return checks;
}

async function updateSystemStatus(supabase: any, metrics: MonitoringMetrics, health: any) {
  await supabase
    .from('system_status')
    .upsert({
      service_name: 'production_monitor',
      status: metrics.systemHealth,
      success_count: metrics.signalsGenerated + metrics.tradesExecuted,
      error_count: Math.round(metrics.errorRate * 100),
      metadata: {
        metrics,
        health,
        last_check: new Date().toISOString()
      }
    }, { onConflict: 'service_name' });
}

async function checkAndSendAlerts(supabase: any, metrics: MonitoringMetrics, health: any) {
  const alerts = [];

  // Critical system health
  if (metrics.systemHealth === 'critical') {
    alerts.push({
      level: 'critical',
      message: 'System health is critical - multiple components failing',
      metrics
    });
  }

  // High error rate
  if (metrics.errorRate > 0.15) {
    alerts.push({
      level: 'warning',
      message: `High error rate detected: ${(metrics.errorRate * 100).toFixed(1)}%`,
      errorRate: metrics.errorRate
    });
  }

  // No signals generated
  if (metrics.signalsGenerated === 0) {
    alerts.push({
      level: 'warning',
      message: 'No signals generated in the last hour',
      signalsCount: metrics.signalsGenerated
    });
  }

  // Log alerts
  for (const alert of alerts) {
    await supabase
      .from('edge_event_log')
      .insert({
        fn: 'production_monitor',
        stage: `alert_${alert.level}`,
        payload: alert
      });
  }
}

function determineOverallStatus(metrics: MonitoringMetrics, health: any): string {
  if (metrics.systemHealth === 'critical') return 'critical';
  if (!health.database || !health.externalAPIs) return 'critical';
  if (metrics.systemHealth === 'degraded' || !health.signalEngines) return 'degraded';
  return 'healthy';
}

function generateRecommendations(metrics: MonitoringMetrics, health: any): string[] {
  const recommendations = [];
  
  if (!health.database) {
    recommendations.push('Check database connectivity and performance');
  }
  
  if (!health.signalEngines) {
    recommendations.push('Signal engines not generating data - check scanner functions');
  }
  
  if (!health.tradingExecution) {
    recommendations.push('Trading execution has errors - check API credentials and connectivity');
  }
  
  if (!health.externalAPIs) {
    recommendations.push('External API connectivity issues - check Bybit API status');
  }
  
  if (metrics.errorRate > 0.1) {
    recommendations.push('High error rate detected - investigate recent logs');
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems operating normally');
  }

  return recommendations;
}

// System health check
async function getSystemHealth(supabase: any) {
  // Latest signal time per exchange
  const { data: latestSignals } = await supabase
    .from('signals')
    .select('exchange, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  // Recent scan activity
  const { data: recentScans } = await supabase
    .from('scans')
    .select('exchange, timeframe, started_at, signals_count')
    .gte('started_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Last 4 hours
    .order('started_at', { ascending: false });

  // Error count last 24h
  const { data: errors, count: errorCount } = await supabase
    .from('errors_log')
    .select('*', { count: 'exact' })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    latest_signals: latestSignals,
    recent_scans: recentScans,
    error_count_24h: errorCount,
    system_status: errorCount < 10 ? 'healthy' : 'degraded'
  };
}

// Signals statistics
async function getSignalsStats(supabase: any) {
  const { data } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        exchange,
        timeframe,
        direction,
        COUNT(*) as count,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score
      FROM signals 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY exchange, timeframe, direction
      ORDER BY count DESC
    `
  });

  return data || [];
}

// Alert success rates
async function getAlertRates(supabase: any) {
  const { data } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        channel,
        COUNT(*) as sent,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as ok,
        ROUND(100.0 * AVG(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 2) as ok_rate
      FROM alerts_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY channel
      ORDER BY sent DESC
    `
  });

  return data || [];
}

// Filter analysis for debugging "no signals"
async function getFilterAnalysis(supabase: any) {
  const { data } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        (filters->>'trend')::bool as trend,
        (filters->>'adx')::bool as adx,
        (filters->>'dmi')::bool as dmi,
        (filters->>'stoch')::bool as stoch,
        (filters->>'volume')::bool as volume,
        (filters->>'obv')::bool as obv,
        (filters->>'hvp')::bool as hvp,
        (filters->>'spread')::bool as spread,
        (filters->>'breakout')::bool as breakout,
        COUNT(*) as cnt
      FROM signals
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY 1,2,3,4,5,6,7,8,9
      ORDER BY cnt DESC
      LIMIT 20
    `
  });

  return data || [];
}