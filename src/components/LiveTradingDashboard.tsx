import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Signal, TradeExecution, TradingDashboardData, RealTimeUpdate } from '@/types/trading';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock, 
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export function LiveTradingDashboard() {
  const [dashboardData, setDashboardData] = useState<TradingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions
    const signalsChannel = supabase
      .channel('signals-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload: RealTimeUpdate<Signal>) => {
          console.log('📡 New signal received:', payload.new);
          handleSignalUpdate(payload);
        }
      )
      .subscribe();

    const tradesChannel = supabase
      .channel('trades-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_orders'
        },
        (payload: RealTimeUpdate<TradeExecution>) => {
          console.log('📡 New trade executed:', payload.new);
          handleTradeUpdate(payload);
        }
      )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(tradesChannel);
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch signals data
      const { data: signalsData } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      // Fetch trades data  
      const { data: tradesData } = await supabase
        .from('execution_orders')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      // Get system health
      const { data: healthData } = await supabase.functions.invoke('diagnostics');

      if (signalsData && tradesData) {
        const processedData = processDashboardData(signalsData, tradesData, healthData?.diagnostics);
        setDashboardData(processedData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = (
    signals: Signal[], 
    trades: TradeExecution[], 
    health: any
  ): TradingDashboardData => {
    const activeSignals = signals.filter(s => s.is_active && (!s.expires_at || new Date(s.expires_at) > new Date()));
    const successfulTrades = trades.filter(t => t.status === 'executed');
    const failedTrades = trades.filter(t => t.status === 'failed');
    
    // Calculate timeframe distribution
    const timeframeDistribution = signals.reduce((acc, signal) => {
      acc[signal.timeframe] = (acc[signal.timeframe] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average score
    const avgScore = signals.length > 0 
      ? signals.reduce((sum, s) => sum + s.score, 0) / signals.length 
      : 0;

    // Calculate performance metrics
    const totalVolume = trades.reduce((sum, t) => sum + (t.amount_usd || 0), 0);
    const avgExecutionTime = trades.length > 0
      ? trades.reduce((sum, t) => sum + (t.execution_time_ms || 0), 0) / trades.length
      : 0;

    return {
      signals: {
        total_24h: signals.length,
        active_signals: activeSignals.slice(0, 10),
        top_performers: signals.filter(s => s.score >= 85).slice(0, 5),
        by_timeframe: timeframeDistribution,
        avg_score: Math.round(avgScore)
      },
      trades: {
        total_24h: trades.length,
        successful_24h: successfulTrades.length,
        failed_24h: failedTrades.length,
        paper_trades: trades.filter(t => t.paper_mode).length,
        live_trades: trades.filter(t => !t.paper_mode).length,
        total_volume_usd: totalVolume,
        avg_execution_time_ms: Math.round(avgExecutionTime)
      },
      performance: {
        pnl_24h: 0, // Would need P&L calculation
        pnl_7d: 0,
        pnl_30d: 0,
        win_rate: trades.length > 0 ? (successfulTrades.length / trades.length) * 100 : 0,
        sharpe_ratio: 0, // Would need historical data
        max_drawdown: 0
      },
      system: health || {
        database: { connected: false },
        edge_functions: {},
        bybit: { connected: false },
        credentials: { user_credentials_count: 0, system_credentials_available: false },
        data: { signals_24h: signals.length, trades_24h: trades.length, markets_enabled: 0 },
        timestamp: new Date().toISOString()
      }
    };
  };

  const handleSignalUpdate = (payload: RealTimeUpdate<Signal>) => {
    if (payload.new) {
      setDashboardData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          signals: {
            ...prev.signals,
            total_24h: prev.signals.total_24h + 1,
            active_signals: [payload.new as Signal, ...prev.signals.active_signals].slice(0, 10)
          }
        };
      });
      setLastUpdate(new Date());
    }
  };

  const handleTradeUpdate = (payload: RealTimeUpdate<TradeExecution>) => {
    if (payload.new) {
      setDashboardData(prev => {
        if (!prev) return prev;
        
        const isSuccessful = payload.new?.status === 'executed';
        
        return {
          ...prev,
          trades: {
            ...prev.trades,
            total_24h: prev.trades.total_24h + 1,
            successful_24h: isSuccessful ? prev.trades.successful_24h + 1 : prev.trades.successful_24h,
            failed_24h: !isSuccessful ? prev.trades.failed_24h + 1 : prev.trades.failed_24h,
            total_volume_usd: prev.trades.total_volume_usd + (payload.new?.amount_usd || 0)
          }
        };
      });
      setLastUpdate(new Date());
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Live Trading Dashboard</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Signals (24h)</p>
                <p className="text-2xl font-bold">{dashboardData.signals.total_24h}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Avg Score: {dashboardData.signals.avg_score}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trades (24h)</p>
                <p className="text-2xl font-bold">{dashboardData.trades.total_24h}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline" className="text-xs">
                ✅ {dashboardData.trades.successful_24h}
              </Badge>
              <Badge variant="destructive" className="text-xs">
                ❌ {dashboardData.trades.failed_24h}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{dashboardData.performance.win_rate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <Progress value={dashboardData.performance.win_rate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Volume (24h)</p>
                <p className="text-2xl font-bold">${dashboardData.trades.total_volume_usd.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Avg: {dashboardData.trades.avg_execution_time_ms}ms
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Active Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData.signals.active_signals.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.signals.active_signals.map((signal, index) => (
                <div key={signal.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                      {signal.direction === 'LONG' ? '📈' : '📉'} {signal.direction}
                    </Badge>
                    <span className="font-medium">{signal.symbol}</span>
                    <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Score: {signal.score}</Badge>
                    <span className="text-sm font-mono">${signal.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active signals
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                {dashboardData.system.database.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bybit API</span>
                {dashboardData.system.bybit.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Edge Functions</span>
                {Object.values(dashboardData.system.edge_functions).some((f: any) => f.available) ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeframe Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dashboardData.signals.by_timeframe).map(([timeframe, count]) => (
                <div key={timeframe} className="flex items-center justify-between">
                  <span className="text-sm">{timeframe}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}