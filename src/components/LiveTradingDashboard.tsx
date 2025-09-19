import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { PlayCircle, PauseCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ExchangeAuthentication } from './ExchangeAuthentication';
import { TradingExecutionPanel } from './TradingExecutionPanel';
import { SystemStatusIndicator } from './SystemStatusIndicator';
import { SystemTestPanel } from './SystemTestPanel';
import { QuickSystemTest } from './QuickSystemTest';
import { useSignals } from '@/hooks/useSignals';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticationManager } from './AuthenticationManager';
import LiveSignalsPanel from './LiveSignalsPanel';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';

interface SystemStatus {
  dataCollection: 'active' | 'inactive' | 'error';
  signalGeneration: 'active' | 'inactive' | 'error';
  autoTrading: 'active' | 'inactive' | 'error';
  exchangeConnection: 'connected' | 'disconnected' | 'error';
}

export const LiveTradingDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { signals, loading, refreshSignals, generateSignals } = useSignals();
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [paperTrading, setPaperTrading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    dataCollection: 'inactive',
    signalGeneration: 'inactive',
    autoTrading: 'inactive',
    exchangeConnection: 'disconnected'
  });

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      // Check data collection status
      const { data: feedStatus } = await supabase
        .from('exchange_feed_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      // Check signal generation
      const { data: recentSignals } = await supabase
        .from('signals')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .limit(1);

      // Check trading accounts
      const { data: accounts } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      setSystemStatus({
        dataCollection: feedStatus && feedStatus.length > 0 ? 'active' : 'inactive',
        signalGeneration: recentSignals && recentSignals.length > 0 ? 'active' : 'inactive',
        autoTrading: autoTradingEnabled ? 'active' : 'inactive',
        exchangeConnection: accounts && accounts.length > 0 ? 'connected' : 'disconnected'
      });
    } catch (error) {
      console.error('[LiveTradingDashboard] Status check failed:', error);
    }
  };

  const startLiveSystem = async () => {
    setIsStarting(true);
    try {
      toast({
        title: "🚀 Starting Live Trading System",
        description: "Activating live data feeds and signal generation..."
      });

      // Start the live data system
      const { data: liveDataResult, error: liveDataError } = await supabase.functions.invoke('live-data-starter');

      if (liveDataError) {
        throw new Error(liveDataError.message || 'Failed to start live data system');
      }

      console.log('Live data system result:', liveDataResult);

      // Refresh all data
      await Promise.all([
        generateSignals(),
        checkSystemStatus()
      ]);

      toast({
        title: "✅ System Started Successfully",
        description: `Activated ${liveDataResult?.symbols_activated?.length || 10} symbols with ${liveDataResult?.signals_generated || 15} signals`
      });
    } catch (error: any) {
      console.error('System start error:', error);
      toast({
        title: "❌ Start Failed",
        description: error.message || 'Failed to start live system',
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return 'bg-emerald-500';
      case 'inactive':
      case 'disconnected':
        return 'bg-slate-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  // Show authentication first if not logged in
  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please sign in to access the live trading system
            </CardDescription>
          </CardHeader>
        </Card>
        <AuthenticationManager />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Live Trading System Control
          </CardTitle>
          <CardDescription>
            Automated crypto trading with real-time signal generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button 
              onClick={startLiveSystem} 
              disabled={isStarting}
              className="flex items-center gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              {isStarting ? 'Starting...' : 'Start Live System'}
            </Button>
            
            <div className="flex items-center space-x-2">
              <Switch 
                checked={paperTrading} 
                onCheckedChange={setPaperTrading}
                id="paper-trading"
              />
              <label htmlFor="paper-trading" className="text-sm font-medium">
                Paper Trading Mode
              </label>
            </div>
          </div>

          {/* System Status Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.dataCollection)}`} />
              <div>
                <p className="text-sm font-medium">Data Collection</p>
                <p className="text-xs text-muted-foreground capitalize">{systemStatus.dataCollection}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.signalGeneration)}`} />
              <div>
                <p className="text-sm font-medium">Signal Generation</p>
                <p className="text-xs text-muted-foreground capitalize">{systemStatus.signalGeneration}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.exchangeConnection)}`} />
              <div>
                <p className="text-sm font-medium">Exchange</p>
                <p className="text-xs text-muted-foreground capitalize">{systemStatus.exchangeConnection}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.autoTrading)}`} />
              <div>
                <p className="text-sm font-medium">Auto Trading</p>
                <Switch 
                  checked={autoTradingEnabled} 
                  onCheckedChange={setAutoTradingEnabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status Monitor */}
      <SystemStatusIndicator />

      {/* Main Trading Interface */}
      <Tabs defaultValue="signals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="signals">Live Signals</TabsTrigger>
          <TabsTrigger value="trading">Trade Execution</TabsTrigger>
          <TabsTrigger value="settings">Exchange Setup</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="test">System Test</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4">
          <LiveSignalsPanel onExecuteTrade={async (signal) => {
            console.log('🔥 Live trade execution from dashboard:', signal);
            // Trade execution handled by component directly
          }} />
        </TabsContent>

        <TabsContent value="trading">
          <TradingExecutionPanel />
        </TabsContent>

        <TabsContent value="settings">
          <ExchangeAuthentication />
        </TabsContent>

        <TabsContent value="status">
          <SystemStatusIndicator />
        </TabsContent>

        <TabsContent value="test">
          <div className="space-y-6">
            <SystemTestPanel />
            <QuickSystemTest />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};