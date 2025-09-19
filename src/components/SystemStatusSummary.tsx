import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertTriangle, RefreshCw, Activity, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSystemTrigger } from '@/hooks/useSystemTrigger';
import { useSystemTests } from '@/hooks/useSystemTests';
import { SystemTester } from '@/components/SystemTester';
import { QuickSystemTest } from '@/components/QuickSystemTest';
import { FakeTradeTest } from '@/components/FakeTradeTest';
import { SystemErrorDiagnostics } from '@/components/SystemErrorDiagnostics';

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
  const { isRunning, lastRun, actions } = useSystemTrigger();
  const { isRunning: testsRunning, results: testResults, runComprehensiveTests, runQuickDiagnostic } = useSystemTests();

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={actions.runFullSystemRefresh}
            disabled={isRunning || testsRunning}
            variant="default"
            className="w-full"
          >
            {isRunning ? '🔄 Running...' : '🔄 Full Refresh'}
          </Button>
          
          <Button
            onClick={runComprehensiveTests}
            disabled={isRunning || testsRunning}
            variant="outline"
            className="w-full"
          >
            {testsRunning ? '🧪 Testing...' : '🧪 Run Tests'}
          </Button>
          
          <Button
            onClick={actions.triggerMarketDataRefresh}
            disabled={isRunning || testsRunning}
            variant="outline"
            className="w-full"
          >
            📊 Market Data
          </Button>
          
          <Button
            onClick={actions.triggerSignalGeneration}
            disabled={isRunning || testsRunning}
            variant="outline"
            className="w-full"
          >
            🎯 Generate Signals
          </Button>
        </div>

        {testResults && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">🧪 System Test Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(testResults).map(([testName, result]) => (
                <div key={testName} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1')}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      result.status === 'pass' ? 'bg-green-100 text-green-800' :
                      result.status === 'fail' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{result.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Quick System Test */}
        <div className="mt-4">
          <QuickSystemTest />
        </div>

        {/* System Tester Component */}
        <div className="mt-6">
          <SystemTester />
        </div>
        
        {/* System Error Diagnostics */}
        <div className="mt-6">
          <SystemErrorDiagnostics />
        </div>
        
        {/* Fake Trade Test Component */}
        <div className="mt-6">
          <FakeTradeTest />
        </div>
      </CardContent>
    </Card>
  );
};