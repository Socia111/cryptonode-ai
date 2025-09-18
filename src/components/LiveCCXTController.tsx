import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Activity, Database, TrendingUp, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { liveCCXTFeed, type CCXTFeedStatus } from '@/lib/liveCCXTFeed';
import { supabase } from '@/lib/supabaseClient';

export function LiveCCXTController() {
  const [isRunning, setIsRunning] = useState(false);
  const [feedStatus, setFeedStatus] = useState<CCXTFeedStatus | null>(null);
  const [marketStats, setMarketStats] = useState<any>(null);
  const [signalStats, setSignalStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial status
    checkFeedStatus();
    loadStats();

    // Refresh stats every 10 seconds
    const interval = setInterval(() => {
      loadStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkFeedStatus = async () => {
    try {
      const status = await liveCCXTFeed.getStatus();
      setFeedStatus(status);
      setIsRunning(status.isRunning);
    } catch (error) {
      console.error('Failed to check feed status:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Load market data stats
      const { data: marketData } = await supabase
        .from('live_market_data')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

      // Load signal stats  
      const { data: signalData } = await supabase
        .from('signals')
        .select('*')
        .eq('algo', 'AITRADEX1')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      setMarketStats({
        totalSymbols: marketData?.length || 0,
        avgVolume: marketData?.reduce((sum, item) => sum + (item.volume || 0), 0) / (marketData?.length || 1),
        avgSpread: marketData?.reduce((sum, item) => sum + (item.spread_bps || 0), 0) / (marketData?.length || 1),
        lastUpdate: marketData?.[0]?.updated_at
      });

      setSignalStats({
        totalSignals: signalData?.length || 0,
        longSignals: signalData?.filter(s => s.direction === 'LONG').length || 0,
        shortSignals: signalData?.filter(s => s.direction === 'SHORT').length || 0,
        avgScore: signalData?.reduce((sum, item) => sum + (item.score || 0), 0) / (signalData?.length || 1),
        highConfidence: signalData?.filter(s => s.score >= 80).length || 0
      });

    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleToggleFeed = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await liveCCXTFeed.stop();
        toast({
          title: "🔴 CCXT Feed Stopped",
          description: "Live market data feed has been stopped"
        });
      } else {
        await liveCCXTFeed.start();
        toast({
          title: "🟢 CCXT Feed Started",
          description: "Live market data streaming with AITRADEX1 signal generation"
        });
      }
      
      await checkFeedStatus();
      await loadStats();
    } catch (error) {
      console.error('Failed to toggle feed:', error);
      toast({
        title: "❌ Feed Control Failed",
        description: "Failed to control CCXT feed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualScan = async () => {
    setLoading(true);
    try {
      // Force a manual data collection cycle
      await liveCCXTFeed.triggerManualScan();
      await loadStats();
      
      toast({
        title: "🔍 Manual Scan Complete",
        description: "Forced market data collection and signal generation"
      });
    } catch (error) {
      console.error('Manual scan failed:', error);
      toast({
        title: "❌ Manual Scan Failed",
        description: "Failed to trigger manual scan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live CCXT Feed Controller
              </CardTitle>
              <CardDescription>
                Real-time market data streaming with AITRADEX1 signal generation
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={isRunning ? "default" : "secondary"}>
                {isRunning ? "ACTIVE" : "STOPPED"}
              </Badge>
              <Switch
                checked={isRunning}
                onCheckedChange={handleToggleFeed}
                disabled={loading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Update Interval</div>
              <div className="text-lg font-semibold">30 seconds</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Exchanges</div>
              <div className="text-lg font-semibold">
                {feedStatus?.exchanges?.length || 0} active
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Symbols Tracked</div>
              <div className="text-lg font-semibold">15 pairs</div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={triggerManualScan} disabled={loading} variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Manual Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="market">Market Data</TabsTrigger>
          <TabsTrigger value="signals">AITRADEX1 Signals</TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Symbols</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{feedStatus?.marketDataPoints || 0}</div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Volume</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(marketStats?.avgVolume || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Per symbol</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Spread</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(marketStats?.avgSpread || 0).toFixed(1)} bps
                </div>
                <p className="text-xs text-muted-foreground">Bid-ask spread</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">AITRADEX1</div>
                <p className="text-xs text-muted-foreground">Algorithm active</p>
              </CardContent>
            </Card>
          </div>

          {feedStatus?.lastUpdate && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">
                  Last AITRADEX1 scan: {new Date(feedStatus.lastUpdate).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{feedStatus?.signalsGenerated || 0}</div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">LONG Signals</CardTitle>
                <div className="h-4 w-4 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {signalStats?.longSignals || 0}
                </div>
                <p className="text-xs text-muted-foreground">Buy opportunities</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SHORT Signals</CardTitle>
                <div className="h-4 w-4 rounded-full bg-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {signalStats?.shortSignals || 0}
                </div>
                <p className="text-xs text-muted-foreground">Sell opportunities</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {signalStats?.highConfidence || 0}
                </div>
                <p className="text-xs text-muted-foreground">Score ≥ 80%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signal Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Signal Score</span>
                    <span>{(signalStats?.avgScore || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={signalStats?.avgScore || 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>High Confidence Rate</span>
                    <span>
                      {signalStats?.totalSignals > 0 
                        ? ((signalStats.highConfidence / signalStats.totalSignals) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={
                      signalStats?.totalSignals > 0 
                        ? (signalStats.highConfidence / signalStats.totalSignals) * 100
                        : 0
                    } 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium mb-2">Exchanges Connected:</div>
              <ul className="space-y-1">
                {feedStatus?.exchanges?.map((exchange: string) => (
                  <li key={exchange} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    {exchange.toUpperCase()}
                  </li>
                )) || <li className="text-muted-foreground">No exchanges connected</li>}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">AITRADEX1 Algorithm (v2.0) Features:</div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• EMA21/SMA200 Golden/Death Cross detection</li>
                <li>• Volume surge confirmation (1.5x average)</li>
                <li>• Historical Volatility Percentile filtering</li>
                <li>• Stochastic momentum confirmation</li>
                <li>• DMI/ADX trend strength validation</li>
                <li>• ATR-based dynamic risk management</li>
                <li>• Confidence scoring and signal grading</li>
                <li>• Predictive crossover analysis</li>
                <li>• Multi-timeframe signal generation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}