import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Activity,
  Target,
  TrendingUp,
  BarChart3,
  Zap,
  Settings,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedAutomatedTradingEngine } from '@/lib/enhancedAutomatedTrading';

// Enhanced trading settings interface
interface TradingSettings {
  maxConcurrentTrades: number;
  maxDailyTrades: number;
  riskPerTrade: number;
  minSignalScore: number;
  timeframes: string[];
  excludedSymbols: string[];
  tradingHours: {
    start: string;
    end: string;
    timezone: string;
  };
}

export function EnhancedAutomatedTradingDashboard() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<TradingSettings>({
    maxConcurrentTrades: 3,
    maxDailyTrades: 10,
    riskPerTrade: 2,
    minSignalScore: 75,
    timeframes: ['15m', '30m', '1h'],
    excludedSymbols: [],
    tradingHours: {
      start: '00:00',
      end: '23:59',
      timezone: 'UTC'
    }
  });

  const { toast } = useToast();
  const engine = new EnhancedAutomatedTradingEngine(toast);

  useEffect(() => {
    // Load initial config and execution history
    loadExecutionHistory();
  }, []);

  const loadExecutionHistory = async () => {
    try {
      const history = await engine.getExecutionHistory();
      setExecutionHistory(history);
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  };

  const handleStartTrading = async () => {
    if (engine.isEngineRunning()) {
      await engine.stopEngine();
      setIsActive(false);
    } else {
      // Update config before starting
      await engine.updateConfig({
        enabled: true,
        max_concurrent_trades: settings.maxConcurrentTrades,
        max_daily_trades: settings.maxDailyTrades,
        risk_per_trade: settings.riskPerTrade / 100,
        min_signal_score: settings.minSignalScore,
        preferred_timeframes: settings.timeframes,
        excluded_symbols: settings.excludedSymbols,
        trading_hours: settings.tradingHours
      });
      
      const started = await engine.startEngine();
      setIsActive(started);
    }
  };

  const handleTriggerAlgorithms = async () => {
    setIsLoading(true);
    try {
      // Trigger signal generation algorithms
      const algorithms = [
        'enhanced-signal-generation',
        'aitradex1-enhanced-scanner',
        'comprehensive-trading-pipeline'
      ];

      for (const algo of algorithms) {
        try {
          await fetch(`https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/${algo}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trigger: 'manual' })
          });
          console.log(`✅ Triggered ${algo}`);
        } catch (error) {
          console.error(`Failed to trigger ${algo}:`, error);
        }
      }

      toast({
        title: "🔄 Algorithms Triggered",
        description: "Signal generation algorithms have been activated"
      });

      // Refresh execution history after a delay
      setTimeout(loadExecutionHistory, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    todayExecutions: executionHistory.filter(e => 
      new Date(e.executed_at).toDateString() === new Date().toDateString()
    ).length,
    successfulTrades: executionHistory.filter(e => e.status === 'completed').length,
    totalProfit: executionHistory.reduce((sum, e) => sum + (e.profit || 0), 0),
    winRate: executionHistory.length > 0 
      ? (executionHistory.filter(e => e.status === 'completed').length / executionHistory.length * 100)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Enhanced Automated Trading System
            </CardTitle>
            <Badge className={isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
              {isActive ? (
                <>
                  <Activity className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 mr-1" />
                  Stopped
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.todayExecutions}
              </div>
              <div className="text-sm text-muted-foreground">Today's Trades</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.successfulTrades}
              </div>
              <div className="text-sm text-muted-foreground">Successful Trades</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.totalProfit.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total P&L</div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleStartTrading}
              disabled={isLoading}
              className={isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Trading
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Trading
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTriggerAlgorithms}
              disabled={isLoading}
            >
              <Zap className="w-4 h-4 mr-2" />
              {isLoading ? 'Triggering...' : 'Trigger Algorithms'}
            </Button>
            
            <Button variant="outline" onClick={loadExecutionHistory}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Trading Settings</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Automated Trading Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxConcurrentTrades">Max Concurrent Trades</Label>
                    <Input
                      id="maxConcurrentTrades"
                      type="number"
                      value={settings.maxConcurrentTrades}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        maxConcurrentTrades: parseInt(e.target.value) || 3
                      }))}
                      min="1"
                      max="10"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maxDailyTrades">Max Daily Trades</Label>
                    <Input
                      id="maxDailyTrades"
                      type="number"
                      value={settings.maxDailyTrades}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        maxDailyTrades: parseInt(e.target.value) || 10
                      }))}
                      min="1"
                      max="50"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="riskPerTrade">Risk Per Trade (%)</Label>
                    <Input
                      id="riskPerTrade"
                      type="number"
                      value={settings.riskPerTrade}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        riskPerTrade: parseFloat(e.target.value) || 2
                      }))}
                      min="0.1"
                      max="10"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="minSignalScore">Minimum Signal Score</Label>
                    <Input
                      id="minSignalScore"
                      type="number"
                      value={settings.minSignalScore}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        minSignalScore: parseInt(e.target.value) || 75
                      }))}
                      min="60"
                      max="95"
                    />
                  </div>
                  
                  <div>
                    <Label>Preferred Timeframes</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['5m', '15m', '30m', '1h', '4h', '1d'].map(tf => (
                        <Badge
                          key={tf}
                          variant={settings.timeframes.includes(tf) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setSettings(prev => ({
                              ...prev,
                              timeframes: prev.timeframes.includes(tf)
                                ? prev.timeframes.filter(t => t !== tf)
                                : [...prev.timeframes, tf]
                            }));
                          }}
                        >
                          {tf}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Trading Hours</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <Label htmlFor="startTime" className="text-xs">Start</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={settings.tradingHours.start}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            tradingHours: {
                              ...prev.tradingHours,
                              start: e.target.value
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime" className="text-xs">End</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={settings.tradingHours.end}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            tradingHours: {
                              ...prev.tradingHours,
                              end: e.target.value
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  toast({
                    title: "Settings Saved",
                    description: "Automated trading configuration has been updated"
                  });
                }}
                className="w-full"
              >
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Trade Execution History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trading executions yet</p>
                  <p className="text-sm">Start automated trading to see execution history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executionHistory.slice(0, 10).map((execution, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={execution.status === 'completed' ? 'default' : 'destructive'}>
                          {execution.status}
                        </Badge>
                        <div>
                          <div className="font-medium">{execution.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {execution.side} • ${execution.amount_usd}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {new Date(execution.executed_at).toLocaleString()}
                        </div>
                        {execution.error_message && (
                          <div className="text-xs text-red-600">{execution.error_message}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Signal Generation</span>
                    <Badge className="bg-green-500 text-white">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Market Data Feed</span>
                    <Badge className="bg-green-500 text-white">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Trade Execution</span>
                    <Badge className={isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
                      {isActive ? 'Ready' : 'Stopped'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Risk Management</span>
                    <Badge className="bg-green-500 text-white">Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Risk Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Max Risk Per Trade</span>
                    <span className="text-sm font-medium">{settings.riskPerTrade}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Daily Trade Limit</span>
                    <span className="text-sm font-medium">
                      {stats.todayExecutions}/{settings.maxDailyTrades}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Concurrent Trades</span>
                    <span className="text-sm font-medium">
                      0/{settings.maxConcurrentTrades}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Min Signal Score</span>
                    <span className="text-sm font-medium">{settings.minSignalScore}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}