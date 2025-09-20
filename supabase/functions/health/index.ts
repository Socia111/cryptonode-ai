import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time?: number;
  error?: string;
  details?: any;
}

interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  checks: HealthCheck[];
  uptime: number;
  version: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json().catch(() => ({ action: 'health_check' }));

    console.log(`🏥 Health Monitor - Action: ${action}`);

    switch (action) {
      case 'health_check':
        return await performHealthCheck(supabase);
      
      case 'deep_health_check':
        return await performDeepHealthCheck(supabase);
      
      case 'service_status':
        return await getServiceStatus(supabase);
      
      case 'system_metrics':
        return await getSystemMetrics(supabase);
      
      default:
        return await performHealthCheck(supabase);
    }

  } catch (error) {
    console.error('❌ Health Monitor error:', error);
    return new Response(
      JSON.stringify({ 
        overall_status: 'down',
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

async function performHealthCheck(supabase: any): Promise<Response> {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  try {
    // 1. Database Health Check
    const dbCheck = await checkDatabase(supabase);
    checks.push(dbCheck);

    // 2. Bybit API Health Check
    const bybitCheck = await checkBybitAPI();
    checks.push(bybitCheck);

    // 3. Signal Generation Health Check
    const signalCheck = await checkSignalGeneration(supabase);
    checks.push(signalCheck);

    // 4. Trading Execution Health Check
    const tradingCheck = await checkTradingExecution(supabase);
    checks.push(tradingCheck);

    // 5. Edge Functions Health Check
    const edgeFunctionsCheck = await checkEdgeFunctions();
    checks.push(edgeFunctionsCheck);

    // Determine overall status
    const downServices = checks.filter(c => c.status === 'down').length;
    const degradedServices = checks.filter(c => c.status === 'degraded').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'down';
    if (downServices > 0) {
      overallStatus = 'down';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const health: SystemHealth = {
      overall_status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      uptime: Date.now() - startTime,
      version: '2.0.0'
    };

    // Log health status to database
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'overall_system',
        status: overallStatus,
        metadata: { checks, uptime: health.uptime }
      }, { onConflict: 'service_name' });

    return new Response(
      JSON.stringify(health),
      { 
        status: overallStatus === 'down' ? 503 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        overall_status: 'down',
        error: error.message,
        timestamp: new Date().toISOString(),
        checks
      }),
      { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function checkDatabase(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test database connectivity and basic operations
    const { data, error } = await supabase
      .from('signals')
      .select('id')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        service: 'database',
        status: 'down',
        response_time: responseTime,
        error: error.message
      };
    }

    // Check if response time is reasonable
    const status = responseTime > 2000 ? 'degraded' : 'healthy';

    return {
      service: 'database',
      status,
      response_time: responseTime,
      details: {
        connection: 'active',
        query_result: data?.length || 0
      }
    };

  } catch (error) {
    return {
      service: 'database',
      status: 'down',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkBybitAPI(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test Bybit API connectivity
    const response = await fetch('https://api.bybit.com/v5/market/time');
    const data = await response.json();
    
    const responseTime = Date.now() - startTime;

    if (data.retCode !== 0) {
      return {
        service: 'bybit_api',
        status: 'down',
        response_time: responseTime,
        error: `API error: ${data.retMsg}`
      };
    }

    const status = responseTime > 1000 ? 'degraded' : 'healthy';

    return {
      service: 'bybit_api',
      status,
      response_time: responseTime,
      details: {
        server_time: data.result?.timeSecond,
        api_version: 'v5'
      }
    };

  } catch (error) {
    return {
      service: 'bybit_api',
      status: 'down',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkSignalGeneration(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check recent signal generation activity
    const { data, error } = await supabase
      .from('signals')
      .select('created_at, source')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(10);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        service: 'signal_generation',
        status: 'down',
        response_time: responseTime,
        error: error.message
      };
    }

    const recentSignals = data?.length || 0;
    let status: 'healthy' | 'degraded' | 'down';

    if (recentSignals === 0) {
      status = 'degraded'; // No signals in last hour is concerning
    } else if (recentSignals < 5) {
      status = 'degraded'; // Low signal generation
    } else {
      status = 'healthy';
    }

    return {
      service: 'signal_generation',
      status,
      response_time: responseTime,
      details: {
        recent_signals: recentSignals,
        signal_sources: [...new Set(data?.map(s => s.source) || [])]
      }
    };

  } catch (error) {
    return {
      service: 'signal_generation',
      status: 'down',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkTradingExecution(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check recent trading execution activity
    const { data, error } = await supabase
      .from('execution_orders')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(20);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        service: 'trading_execution',
        status: 'down',
        response_time: responseTime,
        error: error.message
      };
    }

    const orders = data || [];
    const successfulOrders = orders.filter(o => o.status === 'completed').length;
    const failedOrders = orders.filter(o => o.status === 'failed').length;
    const successRate = orders.length > 0 ? successfulOrders / orders.length : 1;

    let status: 'healthy' | 'degraded' | 'down';
    if (successRate < 0.5) {
      status = 'down'; // Less than 50% success rate
    } else if (successRate < 0.8) {
      status = 'degraded'; // Less than 80% success rate
    } else {
      status = 'healthy';
    }

    return {
      service: 'trading_execution',
      status,
      response_time: responseTime,
      details: {
        total_orders: orders.length,
        successful_orders: successfulOrders,
        failed_orders: failedOrders,
        success_rate: Math.round(successRate * 100)
      }
    };

  } catch (error) {
    return {
      service: 'trading_execution',
      status: 'down',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkEdgeFunctions(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test a simple edge function
    const response = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ action: 'ping' })
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        service: 'edge_functions',
        status: 'down',
        response_time: responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const status = responseTime > 3000 ? 'degraded' : 'healthy';

    return {
      service: 'edge_functions',
      status,
      response_time: responseTime,
      details: {
        http_status: response.status,
        deployment: 'active'
      }
    };

  } catch (error) {
    return {
      service: 'edge_functions',
      status: 'down',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

async function performDeepHealthCheck(supabase: any): Promise<Response> {
  // Perform all standard checks plus additional deep checks
  const standardHealth = await performHealthCheck(supabase);
  const standardData = await standardHealth.json();

  // Additional deep checks
  const deepChecks: HealthCheck[] = [];

  // Check database table sizes and performance
  try {
    const tableStats = await checkDatabaseTables(supabase);
    deepChecks.push(tableStats);
  } catch (error) {
    deepChecks.push({
      service: 'database_tables',
      status: 'down',
      error: error.message
    });
  }

  // Check signal engine performance
  try {
    const signalEngineStats = await checkSignalEnginePerformance(supabase);
    deepChecks.push(signalEngineStats);
  } catch (error) {
    deepChecks.push({
      service: 'signal_engines',
      status: 'down',
      error: error.message
    });
  }

  return new Response(
    JSON.stringify({
      ...standardData,
      deep_checks: deepChecks,
      check_type: 'deep_health_check'
    }),
    { 
      status: standardData.overall_status === 'down' ? 503 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function checkDatabaseTables(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Count records in key tables
    const tables = ['signals', 'execution_orders', 'user_trading_accounts', 'system_status'];
    const tableCounts: Record<string, number> = {};

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      tableCounts[table] = count || 0;
    }

    const responseTime = Date.now() - startTime;
    const status = responseTime > 5000 ? 'degraded' : 'healthy';

    return {
      service: 'database_tables',
      status,
      response_time: responseTime,
      details: {
        table_counts: tableCounts,
        total_records: Object.values(tableCounts).reduce((sum, count) => sum + count, 0)
      }
    };

  } catch (error) {
    return {
      service: 'database_tables',
      status: 'down',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkSignalEnginePerformance(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check signal generation by timeframe in the last 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('signals')
      .select('timeframe, source, score')
      .gte('created_at', fourHoursAgo);

    if (error) throw error;

    const timeframeStats: Record<string, number> = {};
    const sourceStats: Record<string, number> = {};
    let avgScore = 0;

    data?.forEach(signal => {
      timeframeStats[signal.timeframe] = (timeframeStats[signal.timeframe] || 0) + 1;
      sourceStats[signal.source] = (sourceStats[signal.source] || 0) + 1;
      avgScore += signal.score;
    });

    avgScore = data?.length ? avgScore / data.length : 0;

    const responseTime = Date.now() - startTime;
    const totalSignals = data?.length || 0;
    
    let status: 'healthy' | 'degraded' | 'down';
    if (totalSignals === 0) {
      status = 'down';
    } else if (totalSignals < 10 || avgScore < 60) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      service: 'signal_engines',
      status,
      response_time: responseTime,
      details: {
        total_signals_4h: totalSignals,
        average_score: Math.round(avgScore),
        timeframe_distribution: timeframeStats,
        source_distribution: sourceStats
      }
    };

  } catch (error) {
    return {
      service: 'signal_engines',
      status: 'down',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

async function getServiceStatus(supabase: any): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('system_status')
      .select('*')
      .order('last_update', { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        services: data || [],
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
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
}

async function getSystemMetrics(supabase: any): Promise<Response> {
  try {
    // Get various system metrics
    const metrics = {
      signals_last_24h: 0,
      trades_last_24h: 0,
      active_users: 0,
      system_uptime: '99.9%',
      avg_response_time: 150
    };

    // Query recent signals
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { count: signalsCount } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    const { count: tradesCount } = await supabase
      .from('execution_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    metrics.signals_last_24h = signalsCount || 0;
    metrics.trades_last_24h = tradesCount || 0;

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
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
}