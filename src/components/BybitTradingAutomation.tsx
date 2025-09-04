import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Settings, 
  Zap, 
  DollarSign,
  BarChart3,
  Activity
} from 'lucide-react';

interface TradingConfig {
  enabled: boolean;
  max_position_size: number;
  risk_per_trade: number;
  max_open_positions: number;
  min_confidence_score: number;
  timeframes: string[];
  symbols_blacklist: string[];
  use_leverage: boolean;
  leverage_amount: number;
}

const BybitTradingAutomation: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tradingStats, setTradingStats] = useState({
    activePositions: 0,
    todayPnL: 0,
    totalVolume: 0,
    winRate: 0
  });

  const [config, setConfig] = useState<TradingConfig>({
    enabled: false,
    max_position_size: 10,
    risk_per_trade: 2,
    max_open_positions: 5,
    min_confidence_score: 80,
    timeframes: ['5m', '15m'],
    symbols_blacklist: ['USDCUSDT'],
    use_leverage: true,
    leverage_amount: 3
  });

  useEffect(() => {
    checkTradingStatus();
    const interval = setInterval(checkTradingStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkTradingStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-automated-trading', {
        body: { action: 'status', config }
      });

      if (error) {
        console.error('Trading status check failed:', error);
        setIsConnected(false);
        return;
      }

      if (data?.success) {
        setIsConnected(true);
        setTradingStats(data.stats || tradingStats);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnected(false);
    }
  };

  const toggleAutomation = async () => {
    setIsLoading(true);
    try {
      const action = config.enabled ? 'stop' : 'start';
      const { data, error } = await supabase.functions.invoke('bybit-automated-trading', {
        body: { 
          action, 
          config: { ...config, enabled: !config.enabled }
        }
      });

      if (error) throw error;

      setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
      toast.success(`Automated trading ${config.enabled ? 'stopped' : 'started'}`);
    } catch (error) {
      console.error('Toggle automation failed:', error);
      toast.error('Failed to toggle automation');
    } finally {
      setIsLoading(false);
    }
  };

  const executeAllSignals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bybit-automated-trading', {
        body: { action: 'execute_all', config }
      });

      if (error) {
        console.error('Bybit execution error:', error);
        toast.error(`Trading Error: ${error.message || 'Failed to execute signals'}`);
        return;
      }

      if (data?.success) {
        const successMsg = `✅ Executed ${data.executed_count} of ${data.total_signals} signals`;
        toast.success(successMsg);
        
        // Show detailed results if there are failures
        if (data.results && data.executed_count < data.total_signals) {
          const failures = data.results.filter((r: any) => !r.success);
          console.log('Failed executions:', failures);
          toast.error(`${failures.length} signals failed - check console for details`);
        }
      } else {
        toast.error(data?.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Bulk execution failed:', error);
      toast.error(`Live Trading Error: ${error.message || 'Failed to call trading function'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (key: keyof TradingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-primary" />
              <span>Bybit Automated Trading</span>
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{tradingStats.activePositions}</div>
              <div className="text-xs text-muted-foreground">Active Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                ${tradingStats.todayPnL.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Today P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                ${tradingStats.totalVolume.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {tradingStats.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Automation Controls */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Auto-Execute New Signals</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-trade">Enable Automation</Label>
              <Switch
                id="auto-trade"
                checked={config.enabled}
                onCheckedChange={() => toggleAutomation()}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-size">Order Size (USDT)</Label>
              <Input
                id="order-size"
                type="number"
                value={config.max_position_size}
                onChange={(e) => updateConfig('max_position_size', parseFloat(e.target.value))}
                placeholder="10"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="use-leverage">Use Leverage</Label>
              <Switch
                id="use-leverage"
                checked={config.use_leverage}
                onCheckedChange={(checked) => updateConfig('use_leverage', checked)}
              />
            </div>

            {config.use_leverage && (
              <div className="space-y-2">
                <Label>Leverage: {config.leverage_amount}x</Label>
                <Slider
                  value={[config.leverage_amount]}
                  onValueChange={(value) => updateConfig('leverage_amount', value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            <Button 
              onClick={executeAllSignals}
              disabled={isLoading}
              className="w-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              🚀 Bulk Execute All Signals
            </Button>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Risk Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Risk per Trade: {config.risk_per_trade}%</Label>
              <Slider
                value={[config.risk_per_trade]}
                onValueChange={(value) => updateConfig('risk_per_trade', value[0])}
                max={5}
                min={1}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Max Open Positions: {config.max_open_positions}</Label>
              <Slider
                value={[config.max_open_positions]}
                onValueChange={(value) => updateConfig('max_open_positions', value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Min Confidence Score: {config.min_confidence_score}%</Label>
              <Slider
                value={[config.min_confidence_score]}
                onValueChange={(value) => updateConfig('min_confidence_score', value[0])}
                max={95}
                min={70}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframes">Active Timeframes</Label>
              <div className="flex space-x-2">
                {['5m', '15m', '30m', '1h'].map((tf) => (
                  <Badge
                    key={tf}
                    variant={config.timeframes.includes(tf) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newTimeframes = config.timeframes.includes(tf)
                        ? config.timeframes.filter(t => t !== tf)
                        : [...config.timeframes, tf];
                      updateConfig('timeframes', newTimeframes);
                    }}
                  >
                    {tf}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Features */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>Advanced Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Shield className="w-8 h-8 text-success" />
              <div>
                <div className="font-medium">Stop Loss Protection</div>
                <div className="text-sm text-muted-foreground">Automatic SL from signals</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <TrendingUp className="w-8 h-8 text-primary" />
              <div>
                <div className="font-medium">Take Profit Targets</div>
                <div className="text-sm text-muted-foreground">Smart TP management</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Activity className="w-8 h-8 text-accent" />
              <div>
                <div className="font-medium">Real-time Monitoring</div>
                <div className="text-sm text-muted-foreground">24/7 position tracking</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BybitTradingAutomation;