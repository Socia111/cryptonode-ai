import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertTriangle, RefreshCw, Activity, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSystemTrigger } from '@/hooks/useSystemTrigger';

interface SystemStatus {
  database: boolean;
  signals: boolean;
  trading: boolean;
  marketData: boolean;
  lastCheck: string;
  signalCount: number;
  marketDataCount: number;
}

export const SystemStatusSummary: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const autoRefresh = useAutoRefresh(2); // Auto-refresh every 2 minutes
  const { 
    isRunning: isSystemRunning, 
    triggerSignalGeneration, 
    triggerMarketDataRefresh,
    runFullSystemRefresh 
  } = useSystemTrigger();

  const checkSystemStatus = async () => {
    setIsChecking(true);
    try {
      // Check database connectivity
      const { data: dbTest, error: dbError } = await supabase
        .from('signals')
        .select('id', { count: 'exact', head: true });

      // Check recent signals
      const { data: signals, error: signalsError } = await supabase
        .from('signals')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Check market data
      const { data: marketData, error: marketError } = await supabase
        .from('live_market_data')
        .select('id', { count: 'exact' })
        .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      // Test trading system
      const { data: tradingTest, error: tradingError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });

      const newStatus: SystemStatus = {
        database: !dbError,
        signals: !signalsError && (signals || []).length > 0,
        trading: !tradingError && tradingTest?.success !== false,
        marketData: !marketError && (marketData || []).length > 0,
        lastCheck: new Date().toISOString(),
        signalCount: signals?.length || 0,
        marketDataCount: marketData?.length || 0
      };

      setStatus(newStatus);

      const healthyCount = [newStatus.database, newStatus.signals, newStatus.trading, newStatus.marketData]
        .filter(Boolean).length;

      if (healthyCount === 4) {
        toast({
          title: "System Healthy",
          description: "All components operational",
          variant: "default"
        });
      } else {
        toast({
          title: "System Issues Detected",
          description: `${healthyCount}/4 components operational`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('[System Status] Check failed:', error);
      toast({
        title: "Status Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const getStatusBadge = (isHealthy: boolean, label: string) => (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Badge variant={isHealthy ? "default" : "destructive"}>
        {isHealthy ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
        {isHealthy ? "OK" : "Error"}
      </Badge>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Status Overview
        </CardTitle>
        <CardDescription>
          Real-time system health monitoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? (
          <div className="space-y-3">
            {getStatusBadge(status.database, "Database Connection")}
            {getStatusBadge(status.signals, `Signals (${status.signalCount})`)}
            {getStatusBadge(status.trading, "Trading System")}
            {getStatusBadge(status.marketData, `Market Data (${status.marketDataCount})`)}
            
            <div className="text-xs text-muted-foreground mt-2">
              Last check: {new Date(status.lastCheck).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Loading system status...
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            onClick={runFullSystemRefresh}
            disabled={isSystemRunning}
            variant="default"
            size="sm"
          >
            {isSystemRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Full Refresh
              </>
            )}
          </Button>

          <Button
            onClick={triggerMarketDataRefresh}
            disabled={isSystemRunning}
            variant="outline"
            size="sm"
          >
            <Activity className="mr-2 h-4 w-4" />
            Market Data
          </Button>
          
          <Button
            onClick={triggerSignalGeneration}
            disabled={isSystemRunning}
            variant="outline"
            size="sm"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Signals
          </Button>

          <Button
            onClick={checkSystemStatus}
            disabled={isChecking || isSystemRunning}
            variant="outline"
            size="sm"
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status
              </>
            )}
          </Button>
        </div>

        {/* Auto-refresh status */}
        {autoRefresh.lastRefresh && (
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
            <div className="flex justify-between items-center">
              <span>Last auto-refresh: {autoRefresh.lastRefresh.toLocaleTimeString()}</span>
              <div className={`w-2 h-2 rounded-full ${autoRefresh.isRefreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            </div>
            {autoRefresh.nextRefreshIn > 0 && (
              <div className="mt-1">
                Next refresh in: {Math.floor(autoRefresh.nextRefreshIn / 60)}:{(autoRefresh.nextRefreshIn % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        )}

        {/* Show errors if any */}
        {autoRefresh.errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
            <p className="text-xs font-medium text-destructive">Auto-refresh Errors:</p>
            <ul className="text-xs text-destructive/80 mt-1 space-y-1">
              {autoRefresh.errors.slice(0, 3).map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};