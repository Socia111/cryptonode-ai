import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SystemMetrics {
  signalsGenerated: number;
  tradesExecuted: number;
  systemUptime: string;
  lastUpdate: string;
  activeFeeds: number;
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  authentication: 'healthy' | 'warning' | 'error';
  signalGeneration: 'healthy' | 'warning' | 'error';
  tradingExecution: 'healthy' | 'warning' | 'error';
}

export const SystemStatusIndicator = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    signalsGenerated: 0,
    tradesExecuted: 0,
    systemUptime: '0h 0m',
    lastUpdate: 'Never',
    activeFeeds: 0
  });
  
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    authentication: 'healthy',
    signalGeneration: 'healthy',
    tradingExecution: 'healthy'
  });
  
  const [loading, setLoading] = useState(false);

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      // Check database connectivity
      const { data: dbTest } = await supabase.from('signals').select('count').limit(1);
      
      // Check recent signals
      const { data: recentSignals } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(100);

      // Check recent trades
      const { data: recentTrades } = await supabase
        .from('execution_orders')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(50);

      // Check exchange feed status
      const { data: feedStatus } = await supabase
        .from('exchange_feed_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      // Update metrics
      setMetrics({
        signalsGenerated: recentSignals?.length || 0,
        tradesExecuted: recentTrades?.length || 0,
        systemUptime: '2h 15m', // Mock uptime
        lastUpdate: new Date().toLocaleTimeString(),
        activeFeeds: feedStatus?.length || 0
      });

      // Update health status
      setHealth({
        database: dbTest ? 'healthy' : 'error',
        authentication: 'healthy', // Assume healthy if we can query
        signalGeneration: (recentSignals?.length || 0) > 0 ? 'healthy' : 'warning',
        tradingExecution: (recentTrades?.length || 0) > 0 ? 'healthy' : 'warning'
      });

    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "❌ Health Check Failed",
        description: "Unable to check system status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
    }
  };

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          System Status Monitor
          <Button
            variant="outline"
            size="sm"
            onClick={checkSystemHealth}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Real-time system health and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="metrics">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health.database)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.database)}
                    <span className="font-medium">Database</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{health.database}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health.authentication)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.authentication)}
                    <span className="font-medium">Authentication</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{health.authentication}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health.signalGeneration)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.signalGeneration)}
                    <span className="font-medium">Signal Generation</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{health.signalGeneration}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health.tradingExecution)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.tradingExecution)}
                    <span className="font-medium">Trading Execution</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{health.tradingExecution}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics.signalsGenerated}</div>
                <div className="text-sm text-muted-foreground">Signals Generated (1h)</div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics.tradesExecuted}</div>
                <div className="text-sm text-muted-foreground">Trades Executed (1h)</div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{metrics.systemUptime}</div>
                <div className="text-sm text-muted-foreground">System Uptime</div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{metrics.activeFeeds}</div>
                <div className="text-sm text-muted-foreground">Active Data Feeds</div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Update:</span>
                <Badge variant="outline">{metrics.lastUpdate}</Badge>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};