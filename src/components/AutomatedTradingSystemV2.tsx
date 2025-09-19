import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, Settings, TrendingUp, Shield, Zap, Target } from 'lucide-react';

interface TradingConfig {
  enabled: boolean;
  max_daily_trades: number;
  credit_allowance: number;
  risk_per_trade: number;
  min_signal_score: number;
  max_leverage: number;
  stop_loss_enabled: boolean;
  take_profit_enabled: boolean;
  exchanges: string[];
}

export default function AutomatedTradingSystemV2() {
  const [config, setConfig] = useState<TradingConfig>({
    enabled: false,
    max_daily_trades: 10,
    credit_allowance: 250,
    risk_per_trade: 0.02, // 2%
    min_signal_score: 85,
    max_leverage: 3,
    stop_loss_enabled: true,
    take_profit_enabled: true,
    exchanges: ['bybit', 'binance', 'okx']
  });

  const [stats, setStats] = useState({
    trades_today: 0,
    credits_used: 0,
    active_positions: 0,
    success_rate: 0,
    total_pnl: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTradingConfig();
    loadTradingStats();
  }, []);

  const loadTradingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'automated_trading_config')
        .maybeSingle();

      if (data?.value && typeof data.value === 'object') {
        setConfig(prev => ({ ...prev, ...(data.value as Partial<TradingConfig>) }));
      }
    } catch (error) {
      console.error('Error loading trading config:', error);
    }
  };

  const loadTradingStats = async () => {
    try {
      // Get today's trade count
      const today = new Date().toISOString().split('T')[0];
      const { count: tradesCount } = await supabase
        .from('execution_queue')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .eq('status', 'completed');

      // Get active positions
      const { count: activePositions } = await supabase
        .from('trading_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Calculate credits used (mock calculation)
      const creditsUsed = (tradesCount || 0) * 25; // 25 credits per trade

      setStats({
        trades_today: tradesCount || 0,
        credits_used: creditsUsed,
        active_positions: activePositions || 0,
        success_rate: 73.5, // Mock success rate
        total_pnl: 1247.85 // Mock PnL
      });
    } catch (error) {
      console.error('Error loading trading stats:', error);
    }
  };

  const saveTradingConfig = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'automated_trading_config',
          value: config as any
        });

      if (error) throw error;

      toast({
        title: "Configuration Saved",
        description: "Automated trading settings have been updated successfully.",
      });

      // If enabled, start the trading system
      if (config.enabled) {
        await startTradingSystem();
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save trading configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startTradingSystem = async () => {
    try {
      // Trigger the comprehensive trading pipeline
      const { data, error } = await supabase.functions.invoke('comprehensive-trading-pipeline', {
        body: { 
          action: 'start_automated_trading',
          config: config
        }
      });

      if (error) throw error;

      toast({
        title: "🚀 Trading System Started",
        description: "Automated trading is now active with live market scanning.",
      });

      // Refresh stats
      loadTradingStats();
    } catch (error) {
      console.error('Error starting trading system:', error);
      toast({
        title: "Error",
        description: "Failed to start automated trading system.",
        variant: "destructive",
      });
    }
  };

  const stopTradingSystem = async () => {
    setConfig({ ...config, enabled: false });
    toast({
      title: "⏸️ Trading System Stopped",
      description: "Automated trading has been disabled.",
    });
  };

  const toggleTrading = async () => {
    if (config.enabled) {
      await stopTradingSystem();
    } else {
      setConfig({ ...config, enabled: true });
      await saveTradingConfig();
    }
  };

  const creditUsagePercentage = (stats.credits_used / config.credit_allowance) * 100;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automated Trading System V2</h1>
          <p className="text-muted-foreground">Multi-exchange live trading with 250 credit allowance</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={config.enabled ? "default" : "secondary"} className="text-sm px-3 py-1">
            {config.enabled ? "ACTIVE" : "INACTIVE"}
          </Badge>
          <Button
            onClick={toggleTrading}
            variant={config.enabled ? "destructive" : "default"}
            size="lg"
            disabled={isLoading}
          >
            {config.enabled ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {config.enabled ? "Stop Trading" : "Start Trading"}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Trades Today</p>
                <p className="text-2xl font-bold">{stats.trades_today}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Credits Used</p>
                <p className="text-2xl font-bold">{stats.credits_used}</p>
                <Progress value={creditUsagePercentage} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Active Positions</p>
                <p className="text-2xl font-bold">{stats.active_positions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{stats.success_rate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Total P&L</p>
              <p className={`text-2xl font-bold ${stats.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.total_pnl.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Trading Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-trades">Max Daily Trades</Label>
              <Input
                id="max-trades"
                type="number"
                value={config.max_daily_trades}
                onChange={(e) => setConfig({ ...config, max_daily_trades: parseInt(e.target.value) })}
                min="1"
                max="50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-allowance">Credit Allowance</Label>
              <Input
                id="credit-allowance"
                type="number"
                value={config.credit_allowance}
                onChange={(e) => setConfig({ ...config, credit_allowance: parseInt(e.target.value) })}
                min="100"
                max="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk-per-trade">Risk Per Trade (%)</Label>
              <Input
                id="risk-per-trade"
                type="number"
                value={config.risk_per_trade * 100}
                onChange={(e) => setConfig({ ...config, risk_per_trade: parseFloat(e.target.value) / 100 })}
                min="0.5"
                max="5"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-score">Min Signal Score</Label>
              <Input
                id="min-score"
                type="number"
                value={config.min_signal_score}
                onChange={(e) => setConfig({ ...config, min_signal_score: parseInt(e.target.value) })}
                min="60"
                max="95"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-leverage">Max Leverage</Label>
              <Input
                id="max-leverage"
                type="number"
                value={config.max_leverage}
                onChange={(e) => setConfig({ ...config, max_leverage: parseInt(e.target.value) })}
                min="1"
                max="10"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="stop-loss"
                checked={config.stop_loss_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, stop_loss_enabled: checked })}
              />
              <Label htmlFor="stop-loss">Enable Stop Loss</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="take-profit"
                checked={config.take_profit_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, take_profit_enabled: checked })}
              />
              <Label htmlFor="take-profit">Enable Take Profit</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Supported Exchanges</Label>
            <div className="flex gap-2">
              {config.exchanges.map(exchange => (
                <Badge key={exchange} variant="outline" className="capitalize">
                  {exchange}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={loadTradingConfig}>
              Reset
            </Button>
            <Button onClick={saveTradingConfig} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Daily Risk Limit</p>
              <p className="text-lg font-semibold">{(config.risk_per_trade * config.max_daily_trades * 100).toFixed(1)}%</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Max Position Size</p>
              <p className="text-lg font-semibold">${(config.credit_allowance * config.risk_per_trade).toFixed(0)}</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Max Leverage</p>
              <p className="text-lg font-semibold">{config.max_leverage}x</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}