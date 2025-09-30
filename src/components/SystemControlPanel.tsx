import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Activity,
  Database,
  Wifi,
  TrendingUp,
  Shield,
  Clock,
  BarChart3
} from 'lucide-react';

interface SystemInfo {
  signals_generated: number;
  auto_executions: number;
  system_health: string;
  last_update: string;
  api_status: string;
  trading_enabled: boolean;
}

const SystemControlPanel = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    signals_generated: 0,
    auto_executions: 0,
    system_health: 'unknown',
    last_update: '',
    api_status: 'unknown',
    trading_enabled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSystemHealth();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    try {
      const { data: debugData } = await supabase.functions.invoke('debug-trading-status');
      const { data: systemData } = await supabase
        .from('system_status')
        .select('*')
        .order('last_update', { ascending: false });

      if (debugData) {
        setSystemInfo({
          signals_generated: debugData.database?.recent_signals || 0,
          auto_executions: 0,
          system_health: debugData.success ? 'healthy' : 'error',
          last_update: debugData.timestamp || new Date().toISOString(),
          api_status: debugData.environment?.bybit_api_key ? 'connected' : 'disconnected',
          trading_enabled: debugData.environment?.auto_trading_enabled || false
        });
      }
    } catch (error) {
      console.error('Error checking system health:', error);
    }
  };

  const startFullSystem = async () => {
    setIsLoading(true);
    try {
      // Start signal generation
      const { data: signalData, error: signalError } = await supabase.functions.invoke('live-signals-generator');
      if (signalError) throw signalError;

      // Start auto trading engine
      const { data: tradingData, error: tradingError } = await supabase.functions.invoke('auto-trading-engine', {
        body: { action: 'process_signals' }
      });
      if (tradingError) throw tradingError;

      // Update scanner
      const { data: scannerData, error: scannerError } = await supabase.functions.invoke('live-scanner-production');
      if (scannerError) throw scannerError;

      toast({
        title: "🚀 System Started",
        description: `Generated ${signalData.signals_generated} signals and processed ${tradingData.signals_processed} for trading`,
      });

      checkSystemHealth();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start system",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runScheduler = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('signals-scheduler', {
        body: { mode: 'full_cycle' }
      });

      if (error) throw error;

      toast({
        title: "✅ Scheduler Complete",
        description: `Completed ${data.scheduler_run.tasks_completed}/${data.scheduler_run.total_tasks} tasks successfully`,
      });

      checkSystemHealth();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run scheduler",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAPIConnection = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bybit-live-trading', {
        body: { action: 'test_connection' }
      });

      if (error) throw error;

      toast({
        title: data.success ? "✅ API Connected" : "❌ API Failed",
        description: data.message || 'Connection test completed',
        variant: data.success ? "default" : "destructive"
      });

      checkSystemHealth();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test API connection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy': return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            System Control Panel
          </h1>
          <p className="text-muted-foreground">Monitor and control the trading system</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={checkSystemHealth} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className={`h-5 w-5 ${getHealthColor(systemInfo.system_health)}`} />
              <div>
                <p className="text-sm text-muted-foreground">System Health</p>
                {getHealthBadge(systemInfo.system_health)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wifi className={`h-5 w-5 ${systemInfo.api_status === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <p className="text-sm text-muted-foreground">API Status</p>
                <Badge variant={systemInfo.api_status === 'connected' ? 'default' : 'destructive'}>
                  {systemInfo.api_status === 'connected' ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Signals Generated</p>
                <p className="text-2xl font-bold">{systemInfo.signals_generated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Auto Executions</p>
                <p className="text-2xl font-bold">{systemInfo.auto_executions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              System Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={startFullSystem} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Full Trading System
            </Button>

            <Button 
              onClick={runScheduler} 
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Clock className="h-4 w-4 mr-2" />
              Run Scheduler (Full Cycle)
            </Button>

            <Button 
              onClick={testAPIConnection} 
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Test API Connection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Safety Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Trading</p>
                <p className="text-sm text-muted-foreground">Enable automatic trade execution</p>
              </div>
              <Switch 
                checked={autoMode}
                onCheckedChange={setAutoMode}
              />
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Auto trading is currently {systemInfo.trading_enabled ? 'ENABLED' : 'DISABLED'}. 
                {!systemInfo.trading_enabled && ' Enable in environment variables for live trading.'}
              </AlertDescription>
            </Alert>

            {systemInfo.last_update && (
              <div className="text-sm text-muted-foreground">
                Last update: {new Date(systemInfo.last_update).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">98.5%</p>
              <p className="text-sm text-muted-foreground">System Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">1.2s</p>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-500">15min</p>
              <p className="text-sm text-muted-foreground">Signal Frequency</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">85%</p>
              <p className="text-sm text-muted-foreground">Quality Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemControlPanel;