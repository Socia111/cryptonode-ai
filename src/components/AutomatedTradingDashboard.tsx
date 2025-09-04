import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, Activity, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LiveSignalsPanel from './LiveSignalsPanel';
import LiveScannerControl from './LiveScannerControl';

interface TradingConfig {
  enabled: boolean;
  max_position_size: number;
  risk_per_trade: number;
  max_open_positions: number;
  min_confidence_score: number;
  timeframes: string[];
  symbols_whitelist?: string[];
  symbols_blacklist?: string[];
}

interface Position {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  pnl: number;
  created_at: string;
}

interface TradingStatus {
  isRunning: boolean;
  activePositions: number;
  config: TradingConfig;
  positions: Position[];
}

interface AccountBalance {
  totalWalletBalance?: string;
  totalAvailableBalance?: string;
  coin?: Array<{
    coin: string;
    walletBalance: string;
    availableBalance: string;
  }>;
  // Real Bybit response structure
  list?: Array<{
    totalWalletBalance: string;
    totalAvailableBalance: string;
    accountType: string;
    coin: Array<{
      coin: string;
      walletBalance: string;
      availableBalance: string;
    }>;
  }>;
}

const AutomatedTradingDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TradingStatus | null>(null);
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [config, setConfig] = useState<TradingConfig>({
    enabled: true,
    max_position_size: 10,
    risk_per_trade: 2,
    max_open_positions: 5,
    min_confidence_score: 77,
    timeframes: ['5m', '15m'],
    symbols_blacklist: ['USDCUSDT']
  });
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('automated-trading-engine', {
        body: { action: 'status', config }
      });

      if (error) throw error;

      if (data.success) {
        setStatus(data.status);
        // Extract real balance from Bybit account
        if (data.account?.balance?.list) {
          setBalance(data.account.balance);
        }
        setIsRunning(data.status?.isRunning || false);
        console.log('✅ Real Bybit account data loaded:', data.account);
      }
    } catch (error: any) {
      console.error('Error checking status:', error);
      
      // Check for different error types and show appropriate messages
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('non-2xx status code')) {
        toast({
          title: "🔧 Trading Engine Error",
          description: "Please check your API credentials and try the 'Test Connection' button below.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('IP restriction') || errorMessage.includes('Unmatched IP')) {
        toast({
          title: "🌐 IP Restriction Error",
          description: "Your Bybit API key has IP restrictions. Please disable IP restrictions in your Bybit API settings.",
          variant: "destructive",
          action: (
            <a 
              href="https://www.bybit.com/app/user/api-management" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Fix in Bybit
            </a>
          ),
        });
      } else if (errorMessage.includes('credentials not configured')) {
        toast({
          title: "🔑 API Keys Missing",
          description: "Please add your Bybit API keys using the secrets manager.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Connection Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const startTrading = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('automated-trading-engine', {
        body: { action: 'start', config }
      });

      if (error) throw error;

      if (data.success) {
        setIsRunning(true);
        toast({
          title: "Trading Started",
          description: "Automated trading engine is now active",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Failed to Start Trading",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopTrading = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('automated-trading-engine', {
        body: { action: 'stop' }
      });

      if (error) throw error;

      if (data.success) {
        setIsRunning(false);
        toast({
          title: "Trading Stopped",
          description: "Automated trading engine has been stopped",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Failed to Stop Trading",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('automated-trading-engine', {
        body: { action: 'test_connection' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "✅ Connection Successful",
          description: "Bybit API connection is working properly",
        });
        // Update balance from test connection
        setBalance(data.balance?.result?.list?.[0]);
        
        // Show balance notification
        const usdtBalance = data.balance?.result?.list?.[0]?.coin?.find((c: any) => c.coin === 'USDT');
        if (usdtBalance) {
          toast({
            title: "💰 Bybit Balance Loaded",
            description: `USDT: $${parseFloat(usdtBalance.walletBalance).toLocaleString()} (Available: $${parseFloat(usdtBalance.availableBalance).toLocaleString()})`,
          });
        }
      } else {
        toast({
          title: "❌ Connection Failed",
          description: data.error + (data.details ? ` ${data.details}` : ''),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Connection Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeManualTrade = async (signal: any) => {
    setLoading(true);
    try {
      // Calculate quantity based on risk settings
      const usdtBalance = parseFloat(getUSDTBalance().available);
      const riskAmount = usdtBalance * (config.risk_per_trade / 100);
      const quantity = riskAmount / signal.entry_price;

      const { data, error } = await supabase.functions.invoke('manual-trade-execution', {
        body: {
          symbol: signal.symbol,
          direction: signal.direction,
          entry_price: signal.entry_price,
          sl: signal.sl,
          tp: signal.tp,
          quantity: quantity
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Trade Executed",
          description: `${signal.direction} order placed for ${signal.symbol}`,
        });
        checkStatus(); // Refresh status
      } else {
        toast({
          title: "Trade Failed",
          description: data.error + (data.help ? ` - ${data.help}` : ''),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Trade Execution Failed",
        description: error.message || "Failed to execute trade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUSDTBalance = () => {
    // Handle the real Bybit balance structure
    if (!balance?.list?.[0]?.coin) return { wallet: '0', available: '0' };
    
    const usdtCoin = balance.list[0].coin.find((coin: any) => coin.coin === 'USDT');
    return {
      wallet: usdtCoin?.walletBalance || '0',
      available: usdtCoin?.availableBalance || '0'
    };
  };

  const getTotalPnL = () => {
    if (!status?.positions) return 0;
    return status.positions.reduce((total, pos) => total + pos.pnl, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Automated Trading Engine
              </CardTitle>
              <CardDescription>
                Fully automated trading based on AItradeX1 signals with Bybit integration
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isRunning ? "default" : "secondary"} className="flex items-center gap-1">
                {isRunning ? (
                  <>
                    <Play className="h-3 w-3" />
                    Running
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3" />
                    Stopped
                  </>
                )}
              </Badge>
              <Button 
                onClick={testConnection}
                variant="outline"
                disabled={loading}
                size="sm"
              >
                Test Connection
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { data, error } = await supabase.functions.invoke('debug-trading-status');
                    if (error) throw error;
                    console.log('🔍 Debug Info:', data);
                    toast({
                      title: "🔍 Debug Complete",
                      description: `API Key: ${data.environment.hasApiKey ? '✅' : '❌'} | Bybit: ${data.bybit.connected ? '✅' : '❌'}`,
                    });
                  } catch (error: any) {
                    toast({
                      title: "Debug Failed",
                      description: error.message,
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                variant="ghost"
                disabled={loading}
                size="sm"
              >
                Debug
              </Button>
              {isRunning ? (
                <Button 
                  onClick={stopTrading}
                  variant="destructive"
                  disabled={loading}
                  className="min-w-[100px]"
                >
                  {loading ? "Stopping..." : "Stop Trading"}
                </Button>
              ) : (
                <Button 
                  onClick={startTrading}
                  disabled={loading}
                  className="min-w-[100px]"
                >
                  {loading ? "Starting..." : "Start Trading"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="manual">Manual Trading</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Account Balance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">USDT Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    ${parseFloat(getUSDTBalance().wallet).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available: ${parseFloat(getUSDTBalance().available).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Positions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{status?.activePositions || 0}</div>
                  <div className="text-xs text-muted-foreground">
                    Max: {config.max_open_positions}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total PnL */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total PnL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className={`text-2xl font-bold ${getTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${getTotalPnL().toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getTotalPnL() >= 0 ? '↗️ Profit' : '↘️ Loss'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Risk Per Trade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{config.risk_per_trade}%</div>
                  <div className="text-xs text-muted-foreground">
                    Max Position: {config.max_position_size}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trading Strategy Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Strategy</CardTitle>
              <CardDescription>Automated execution based on AItradeX1 signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Signal Criteria</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Minimum confidence score: {config.min_confidence_score}</li>
                    <li>• Timeframes: {config.timeframes.join(', ')}</li>
                    <li>• Max open positions: {config.max_open_positions}</li>
                    <li>• Risk per trade: {config.risk_per_trade}%</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Execution Rules</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Market orders for instant execution</li>
                    <li>• Automatic stop loss and take profit</li>
                    <li>• Position sizing based on volatility</li>
                    <li>• Real-time monitoring and adjustments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Scanner Control */}
          <LiveScannerControl onSignalGenerated={(signal) => {
            // Refresh status when new signals are generated
            checkStatus();
          }} />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
              <CardDescription>Currently open trading positions</CardDescription>
            </CardHeader>
            <CardContent>
              {!status?.positions || status.positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active positions
                </div>
              ) : (
                <div className="space-y-3">
                  {status.positions.map((position, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{position.symbol}</h3>
                          <Badge variant={position.side === 'Buy' ? 'default' : 'destructive'}>
                            {position.side === 'Buy' ? (
                              <><TrendingUp className="h-3 w-3 mr-1" /> LONG</>
                            ) : (
                              <><TrendingDown className="h-3 w-3 mr-1" /> SHORT</>
                            )}
                          </Badge>
                        </div>
                        <div className={`font-medium ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Size</p>
                          <p className="font-medium">{position.size.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Entry Price</p>
                          <p className="font-medium">${position.entry_price.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Stop Loss</p>
                          <p className="font-medium">${position.stop_loss.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Take Profit</p>
                          <p className="font-medium">${position.take_profit.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Configuration</CardTitle>
              <CardDescription>Adjust automated trading parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="risk_per_trade">Risk Per Trade (%)</Label>
                    <Input
                      id="risk_per_trade"
                      type="number"
                      value={config.risk_per_trade}
                      onChange={(e) => setConfig(prev => ({ ...prev, risk_per_trade: parseFloat(e.target.value) }))}
                      min="0.1"
                      max="10"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max_position_size">Max Position Size (%)</Label>
                    <Input
                      id="max_position_size"
                      type="number"
                      value={config.max_position_size}
                      onChange={(e) => setConfig(prev => ({ ...prev, max_position_size: parseFloat(e.target.value) }))}
                      min="1"
                      max="50"
                      step="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_open_positions">Max Open Positions</Label>
                    <Input
                      id="max_open_positions"
                      type="number"
                      value={config.max_open_positions}
                      onChange={(e) => setConfig(prev => ({ ...prev, max_open_positions: parseInt(e.target.value) }))}
                      min="1"
                      max="20"
                      step="1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_confidence_score">Min Confidence Score</Label>
                    <Input
                      id="min_confidence_score"
                      type="number"
                      value={config.min_confidence_score}
                      onChange={(e) => setConfig(prev => ({ ...prev, min_confidence_score: parseFloat(e.target.value) }))}
                      min="50"
                      max="95"
                      step="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeframes">Timeframes (comma-separated)</Label>
                    <Input
                      id="timeframes"
                      value={config.timeframes.join(', ')}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        timeframes: e.target.value.split(',').map(tf => tf.trim()) 
                      }))}
                      placeholder="5m, 15m, 30m"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbols_blacklist">Symbols Blacklist (comma-separated)</Label>
                    <Input
                      id="symbols_blacklist"
                      value={config.symbols_blacklist?.join(', ') || ''}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        symbols_blacklist: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [] 
                      }))}
                      placeholder="USDCUSDT, TUSDUSDT"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Enable Automated Trading</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow the system to automatically execute trades
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Trade Execution</CardTitle>
              <CardDescription>Execute individual trades from live signals</CardDescription>
            </CardHeader>
            <CardContent>
              <LiveSignalsPanel onExecuteTrade={executeManualTrade} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomatedTradingDashboard;