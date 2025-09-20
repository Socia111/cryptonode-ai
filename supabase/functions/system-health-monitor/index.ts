import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class SystemHealthMonitor {
  private supabase: any

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  async runHealthCheck(): Promise<any> {
    console.log('🔍 Running comprehensive system health check...')

    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy',
      components: {},
      metrics: {},
      alerts: []
    }

    try {
      // Check signal generation
      await this.checkSignalGeneration(results)
      
      // Check API connections
      await this.checkAPIConnections(results)
      
      // Check trading execution
      await this.checkTradingExecution(results)
      
      // Check data feeds
      await this.checkDataFeeds(results)
      
      // Check automated trading
      await this.checkAutomatedTrading(results)

      // Update system status
      await this.updateSystemStatus(results)

    } catch (error: any) {
      results.overall_status = 'error'
      results.alerts.push({
        level: 'critical',
        message: `Health check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    }

    return results
  }

  private async checkSignalGeneration(results: any): Promise<void> {
    try {
      // Check recent signal activity
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: recentSignals, error } = await this.supabase
        .from('signals')
        .select('id, created_at, score, symbol')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })

      if (error) throw error

      const signalCount = recentSignals?.length || 0
      const avgScore = recentSignals?.reduce((sum, s) => sum + s.score, 0) / signalCount || 0

      results.components.signal_generation = {
        status: signalCount > 0 ? 'healthy' : 'warning',
        signals_last_hour: signalCount,
        average_score: Math.round(avgScore),
        last_signal: recentSignals?.[0]?.created_at || null
      }

      results.metrics.signals_per_hour = signalCount

      if (signalCount === 0) {
        results.alerts.push({
          level: 'warning',
          message: 'No signals generated in the last hour',
          component: 'signal_generation',
          timestamp: new Date().toISOString()
        })
      }

    } catch (error: any) {
      results.components.signal_generation = {
        status: 'error',
        error: error.message
      }
    }
  }

  private async checkAPIConnections(results: any): Promise<void> {
    try {
      // Test Bybit API connection
      const { data, error } = await this.supabase.functions.invoke('debug-trading-status', {
        body: { action: 'env_check' }
      })

      if (error) throw error

      results.components.bybit_api = {
        status: data?.bybit?.connected ? 'healthy' : 'error',
        connected: data?.bybit?.connected || false,
        environment: data?.environment?.isTestnet ? 'testnet' : 'mainnet',
        configuration: data?.environment?.configurationStatus || 'unknown'
      }

      if (!data?.bybit?.connected) {
        results.alerts.push({
          level: 'critical',
          message: 'Bybit API connection failed',
          component: 'bybit_api',
          timestamp: new Date().toISOString()
        })
        results.overall_status = 'degraded'
      }

    } catch (error: any) {
      results.components.bybit_api = {
        status: 'error',
        error: error.message
      }
      results.overall_status = 'degraded'
    }
  }

  private async checkTradingExecution(results: any): Promise<void> {
    try {
      // Check recent trade executions
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: recentTrades, error } = await this.supabase
        .from('execution_orders')
        .select('id, status, symbol, created_at')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })

      if (error) throw error

      const totalTrades = recentTrades?.length || 0
      const successfulTrades = recentTrades?.filter(t => t.status === 'filled').length || 0
      const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0

      results.components.trading_execution = {
        status: successRate >= 80 ? 'healthy' : successRate >= 50 ? 'warning' : 'error',
        trades_last_hour: totalTrades,
        success_rate: Math.round(successRate),
        successful_trades: successfulTrades
      }

      results.metrics.trade_success_rate = successRate

      if (successRate < 50 && totalTrades > 0) {
        results.alerts.push({
          level: 'critical',
          message: `Low trade success rate: ${Math.round(successRate)}%`,
          component: 'trading_execution',
          timestamp: new Date().toISOString()
        })
        results.overall_status = 'degraded'
      }

    } catch (error: any) {
      results.components.trading_execution = {
        status: 'error',
        error: error.message
      }
    }
  }

  private async checkDataFeeds(results: any): Promise<void> {
    try {
      // Check live market data freshness
      const { data: marketData, error } = await this.supabase
        .from('live_market_data')
        .select('symbol, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const now = Date.now()
      const recentData = marketData?.filter(d => {
        const dataAge = now - new Date(d.updated_at).getTime()
        return dataAge < 5 * 60 * 1000 // 5 minutes
      }) || []

      results.components.data_feeds = {
        status: recentData.length > 5 ? 'healthy' : recentData.length > 0 ? 'warning' : 'error',
        symbols_tracked: marketData?.length || 0,
        recent_updates: recentData.length,
        last_update: marketData?.[0]?.updated_at || null
      }

      if (recentData.length === 0) {
        results.alerts.push({
          level: 'warning',
          message: 'No recent market data updates',
          component: 'data_feeds',
          timestamp: new Date().toISOString()
        })
      }

    } catch (error: any) {
      results.components.data_feeds = {
        status: 'error',
        error: error.message
      }
    }
  }

  private async checkAutomatedTrading(results: any): Promise<void> {
    try {
      // Check automated trading configs
      const { data: configs, error } = await this.supabase
        .from('automated_trading_config')
        .select('id, enabled, user_id')
        .eq('enabled', true)

      if (error) throw error

      const activeConfigs = configs?.length || 0

      results.components.automated_trading = {
        status: 'healthy',
        active_configs: activeConfigs,
        total_enabled_users: activeConfigs
      }

      results.metrics.active_auto_traders = activeConfigs

    } catch (error: any) {
      results.components.automated_trading = {
        status: 'error',
        error: error.message
      }
    }
  }

  private async updateSystemStatus(results: any): Promise<void> {
    try {
      // Update overall system status in database
      await this.supabase
        .from('system_status')
        .upsert({
          service_name: 'comprehensive_trading_system',
          status: results.overall_status,
          last_update: results.timestamp,
          details: {
            components: results.components,
            metrics: results.metrics,
            alert_count: results.alerts.length
          }
        }, { onConflict: 'service_name' })

    } catch (error: any) {
      console.error('Failed to update system status:', error)
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const monitor = new SystemHealthMonitor()
    const healthCheck = await monitor.runHealthCheck()

    return Response.json(healthCheck, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Health monitor error:', error)
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: corsHeaders 
    })
  }
})