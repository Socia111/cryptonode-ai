import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  BarChart3,
  Users,
  Zap,
  DollarSign,
  Signal,
  Target,
  Shield,
  Clock,
  Database,
  Cpu,
  Wifi,
  Bot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/layouts/MainLayout';
import RealtimeSignalsFeed from '@/components/RealtimeSignalsFeed';

interface SystemMetrics {
  totalSignals: number;
  activeSignals: number;
  avgScore: number;
  signalsToday: number;
  totalTrades: number;
  successRate: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastUpdate: string;
}

interface LiveSignal {
  id: string;
  symbol: string;
  direction: string;
  score: number;
  price: number;
  timeframe: string;
  created_at: string;
}

interface SystemStatus {
  service_name: string;
  status: string;
  last_update: string;
  success_count: number;
  error_count: number;
}

const Dashboard = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch system metrics
  const fetchMetrics = async () => {
    try {
      // Get signal metrics
      const { data: signalStats } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get system status
      const { data: statusData } = await supabase
        .from('system_status')
        .select('*')
        .order('last_update', { ascending: false });

      // Get recent trades
      const { data: tradesData } = await supabase
        .from('execution_orders')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const totalSignals = signalStats?.length || 0;
      const activeSignals = signalStats?.filter(s => s.is_active).length || 0;
      const avgScore = signalStats?.length ? 
        signalStats.reduce((sum, s) => sum + s.score, 0) / signalStats.length : 0;

      const successfulTrades = tradesData?.filter(t => t.status === 'filled').length || 0;
      const totalTrades = tradesData?.length || 0;
      const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

      setMetrics({
        totalSignals,
        activeSignals,
        avgScore,
        signalsToday: totalSignals,
        totalTrades,
        successRate,
        systemHealth: avgScore > 70 ? 'healthy' : avgScore > 50 ? 'warning' : 'error',
        lastUpdate: new Date().toISOString()
      });

      setSystemStatus(statusData || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system metrics",
        variant: "destructive"
      });
    }
  };

  // Fetch live signals
  const fetchLiveSignals = async () => {
    try {
      const { data } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .gte('score', 60)
        .order('created_at', { ascending: false })
        .limit(10);

      setLiveSignals(data || []);
    } catch (error) {
      console.error('Error fetching live signals:', error);
    }
  };

  // Trigger system functions
  const triggerFunction = async (functionName: string) => {
    try {
      toast({
        title: "Triggering Function",
        description: `Starting ${functionName}...`
      });

      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `${functionName} completed successfully`
      });

      // Refresh metrics after triggering function
      setTimeout(() => {
        fetchMetrics();
        fetchLiveSignals();
      }, 2000);

    } catch (error) {
      console.error(`Error triggering ${functionName}:`, error);
      toast({
        title: "Error",
        description: `Failed to trigger ${functionName}`,
        variant: "destructive"
      });
    }
  };

  // Set up real-time updates
  useEffect(() => {
    fetchMetrics();
    fetchLiveSignals();
    setIsLoading(false);

    // Set up real-time subscription for new signals
    const signalsChannel = supabase
      .channel('dashboard-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        () => {
          fetchLiveSignals();
          fetchMetrics();
        }
      )
      .subscribe();

    // Refresh metrics every 30 seconds
    const metricsInterval = setInterval(() => {
      fetchMetrics();
    }, 30000);

    return () => {
      supabase.removeChannel(signalsChannel);
      clearInterval(metricsInterval);
    };
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AITRADEX1 Dashboard</h1>
            <p className="text-muted-foreground">Real-time system monitoring and control</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="animate-pulse">
              <Wifi className="h-3 w-3 mr-1" />
              Live Data
            </Badge>
            {metrics && (
              <Badge variant={metrics.systemHealth === 'healthy' ? 'default' : 'destructive'}>
                <Activity className={`h-3 w-3 mr-1 ${getHealthColor(metrics.systemHealth)}`} />
                {metrics.systemHealth.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Key Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Signals</CardTitle>
                <Signal className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeSignals}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalSignals} total today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.avgScore.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Signal quality rating
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trades</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalTrades}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.successRate.toFixed(1)}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth)}`}>
                  {metrics.systemHealth.toUpperCase()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="signals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="signals">Live Signals</TabsTrigger>
            <TabsTrigger value="system">System Status</TabsTrigger>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Live Signals Tab */}
          <TabsContent value="signals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Active Trading Signals</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {liveSignals.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No active signals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveSignals.map((signal) => (
                      <div key={signal.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {signal.direction === 'LONG' ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">{signal.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {signal.timeframe} • Score: {signal.score}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${signal.price?.toFixed(4)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(signal.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Status Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>System Services</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemStatus.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                        <div>
                          <p className="font-medium">{service.service_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Success: {service.success_count} • Errors: {service.error_count}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={service.status === 'active' ? 'default' : 'destructive'}>
                          {service.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(service.last_update).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Functions Tab */}
          <TabsContent value="functions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Scanner Functions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <span>Scanner Functions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('live-scanner-production')}
                    className="w-full"
                  >
                    Live Scanner
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('aitradex1-enhanced-scanner')}
                    className="w-full"
                  >
                    Enhanced Scanner
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('aitradex1-comprehensive-engine')}
                    className="w-full"
                  >
                    Comprehensive Engine
                  </Button>
                </CardContent>
              </Card>

              {/* Analysis Functions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Analysis Functions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('quantum-analysis')}
                    className="w-full"
                  >
                    Quantum Analysis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('sentiment-analysis')}
                    className="w-full"
                  >
                    Sentiment Analysis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('portfolio-optimization')}
                    className="w-full"
                  >
                    Portfolio Optimization
                  </Button>
                </CardContent>
              </Card>

              {/* Trading Functions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Trading Functions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('aitradex1-trade-executor')}
                    className="w-full"
                  >
                    Trade Executor
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('backtest-engine')}
                    className="w-full"
                  >
                    Backtest Engine
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerFunction('crypto-scheduler')}
                    className="w-full"
                  >
                    Crypto Scheduler
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Advanced analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Real-time Signals Feed */}
      <RealtimeSignalsFeed />
    </MainLayout>
  );
};

export default Dashboard;