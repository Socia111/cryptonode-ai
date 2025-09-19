import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign, 
  Target, Shield, Zap, BarChart3, Clock, Users,
  Play, Pause, Settings, RefreshCw, AlertTriangle,
  CheckCircle, ExternalLink, Wifi, WifiOff
} from 'lucide-react';
import { useRealTimeSignals } from '@/hooks/useRealTimeSignals';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveSignal {
  id?: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  score: number;
  price: number;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  timeframe: string;
  created_at?: string;
  source?: string;
  confidence?: number;
}

export function ProfessionalTradingDashboard() {
  const { signals, loading, error, stats, lastUpdate } = useRealTimeSignals({
    minScore: 70,
    includeExpired: false
  });
  const { executeTrade, executing, lastTrade } = useTradingExecutor();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<LiveSignal | null>(null);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [liveFeedStatus, setLiveFeedStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [realTimeData, setRealTimeData] = useState({
    marketDataPoints: 0,
    signalsGenerated: 0,
    lastSignalTime: null as Date | null
  });

  // Initialize live feeds on component mount
  useEffect(() => {
    initializeLiveFeeds();
    const interval = setInterval(triggerLiveDataRefresh, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const initializeLiveFeeds = async () => {
    try {
      setLiveFeedStatus('connecting');
      toast({
        title: "🚀 Starting Live Feeds",
        description: "Initializing real-time market data and signal generation..."
      });

      // Trigger enhanced signal generation
      await supabase.functions.invoke('enhanced-signal-generation', {
        body: {
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'BNBUSDT', 'DOTUSDT', 'LINKUSDT'],
          trigger: 'dashboard_init'
        }
      });

      // Trigger enhanced signal generation
      await supabase.functions.invoke('enhanced-signal-generation', {
        body: { trigger: 'live_dashboard' }
      });

      // Trigger comprehensive pipeline
      await supabase.functions.invoke('comprehensive-trading-pipeline', {
        body: { mode: 'live_production' }
      });

      setLiveFeedStatus('connected');
      toast({
        title: "✅ Live Feeds Active",
        description: "Real-time market data and signal generation are now running"
      });

    } catch (error) {
      console.error('Failed to initialize live feeds:', error);
      setLiveFeedStatus('disconnected');
      toast({
        title: "❌ Feed Error",
        description: "Failed to start live feeds. Using existing data.",
        variant: "destructive"
      });
    }
  };

  const triggerLiveDataRefresh = async () => {
    try {
      // Trigger live scanner
      const scannerResult = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
        body: { trigger: 'auto_refresh' }
      });

      if (scannerResult.data?.signals_generated) {
        setRealTimeData(prev => ({
          ...prev,
          signalsGenerated: prev.signalsGenerated + scannerResult.data.signals_generated,
          lastSignalTime: new Date()
        }));
      }
    } catch (error) {
      console.error('Live data refresh failed:', error);
    }
  };

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center gap-2 justify-center">
              <Shield className="h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Please sign in to access the live trading platform
            </p>
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExecuteTrade = async (signal: LiveSignal | any) => {
    try {
      await executeTrade({
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'buy' : 'sell',
        amount: tradeAmount,
        orderType: 'market',
        stopLoss: signal.stop_loss,
        takeProfit: signal.take_profit
      });
      
      toast({
        title: "📊 Trade Executed",
        description: `${signal.direction} ${signal.symbol} for $${tradeAmount}`
      });
    } catch (error) {
      console.error('Trade execution failed:', error);
      toast({
        title: "❌ Trade Failed",
        description: "Failed to execute trade. Check your account connection.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Live Trading Platform
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <span>Real-time signals • Automated execution • Professional grade</span>
              {liveFeedStatus === 'connected' ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : liveFeedStatus === 'connecting' ? (
                <RefreshCw className="h-4 w-4 animate-spin text-warning" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={initializeLiveFeeds}
              disabled={liveFeedStatus === 'connecting'}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${liveFeedStatus === 'connecting' ? 'animate-spin' : ''}`} />
              Refresh Feeds
            </Button>
            <Button 
              variant={autoTradingEnabled ? "destructive" : "default"}
              onClick={() => setAutoTradingEnabled(!autoTradingEnabled)}
              className="gap-2"
            >
              {autoTradingEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoTradingEnabled ? 'Stop Auto' : 'Start Auto'}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Live Status</p>
                  <p className="text-lg font-bold flex items-center gap-2">
                    {liveFeedStatus === 'connected' ? (
                      <>
                        <span className="text-success">LIVE</span>
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      </>
                    ) : liveFeedStatus === 'connecting' ? (
                      <span className="text-warning">CONNECTING</span>
                    ) : (
                      <span className="text-destructive">OFFLINE</span>
                    )}
                  </p>
                </div>
                {liveFeedStatus === 'connected' ? (
                  <Wifi className="h-8 w-8 text-success" />
                ) : (
                  <WifiOff className="h-8 w-8 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Signals</p>
                  <p className="text-2xl font-bold">{stats.activeSignals}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                  <p className="text-2xl font-bold">{stats.avgScore}%</p>
                </div>
                <Target className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Generated Today</p>
                  <p className="text-2xl font-bold">{realTimeData.signalsGenerated}</p>
                </div>
                <Zap className="h-8 w-8 text-info" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last Update</p>
                  <p className="text-sm font-medium">
                    {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="signals" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="signals">Live Signals</TabsTrigger>
            <TabsTrigger value="execution">Quick Trade</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="signals">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Trading Signals
                  </CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    {signals.length} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    {loading && (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-muted-foreground">Loading live signals...</p>
                      </div>
                    )}

                    {error && (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                        <p className="text-destructive">{error}</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={initializeLiveFeeds}
                        >
                          Restart Live Feeds
                        </Button>
                      </div>
                    )}

                    {!loading && !error && signals.length === 0 && (
                      <div className="text-center py-8">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground mb-2">No live signals available</p>
                        <Button 
                          onClick={initializeLiveFeeds}
                          disabled={liveFeedStatus === 'connecting'}
                        >
                          Start Live Feeds
                        </Button>
                      </div>
                    )}

                    {!loading && signals.length > 0 && signals.map((signal, index) => (
                      <div key={signal.id || index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${signal.direction === 'LONG' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                            {signal.direction === 'LONG' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{signal.symbol}</span>
                              <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                                {signal.direction}
                              </Badge>
                              <Badge variant="outline">{signal.timeframe}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Score: {signal.score}% • Price: ${signal.price?.toFixed(4) || 'N/A'}
                              {signal.source && ` • ${signal.source}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Progress value={signal.score} className="w-16" />
                          <span className="text-sm font-medium w-12 text-right">{signal.score}%</span>
                          <Button 
                            size="sm" 
                            onClick={() => handleExecuteTrade(signal as LiveSignal)}
                            disabled={executing}
                            className="ml-2"
                          >
                            {executing ? 'Trading...' : 'Trade'}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="execution">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Trade Execution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input placeholder="BTCUSDT" />
                  </div>
                  <div className="space-y-2">
                    <Label>Side</Label>
                    <select className="w-full p-2 border rounded">
                      <option>BUY</option>
                      <option>SELL</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (USD)</Label>
                    <Input 
                      type="number" 
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(Number(e.target.value))}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <select className="w-full p-2 border rounded">
                      <option>Market</option>
                      <option>Limit</option>
                    </select>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={executing}
                >
                  {executing ? 'Executing...' : 'Execute Trade'}
                </Button>
                
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Active Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No active positions</p>
                  <p className="text-sm text-muted-foreground mt-1">Execute trades to see positions here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Signals</span>
                      <span className="font-bold">{stats.totalSignals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Score</span>
                      <span className="font-bold">{stats.avgScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-bold">{stats.successRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Live Feed Status</span>
                      <Badge variant={liveFeedStatus === 'connected' ? 'default' : 'destructive'}>
                        {liveFeedStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Auto Trading</span>
                      <Badge variant={autoTradingEnabled ? 'default' : 'secondary'}>
                        {autoTradingEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Paper Mode</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Trading Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Trade Amount</Label>
                    <Input 
                      type="number" 
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auto Trading</Label>
                    <Button 
                      variant={autoTradingEnabled ? "destructive" : "outline"}
                      onClick={() => setAutoTradingEnabled(!autoTradingEnabled)}
                      className="w-full"
                    >
                      {autoTradingEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
                
                <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
                  Manage Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}