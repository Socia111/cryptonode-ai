import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Play, Square, Settings, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { FEATURES } from '@/config/featureFlags';

interface TradeExecution {
  symbol: string
  exchange: string
  quantity: number
  leverage: number
  order_type: 'market' | 'limit'
  price?: number
}

const TradingPanel = () => {
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [executionSettings, setExecutionSettings] = useState({
    exchange: 'binance',
    leverage: 10,
    capital_percent: 5
  });
  const { toast } = useToast();

  const executeTrade = async (signal: any, settings: TradeExecution) => {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      toast({
        title: "Auto-trading disabled",
        description: "Auto-trading is disabled in this build. Actions are simulated only.",
        variant: "default",
      });
      return;
    }

    setIsExecuting(true);
    
    try {
      const side = signal.direction === 'LONG' ? 'BUY' : 'SELL';
      const res = await TradingGateway.execute({ 
        symbol: signal.symbol, 
        side, 
        notionalUSD: settings.quantity 
      });
      
      if (!res.ok && res.code === 'DISABLED') {
        toast({
          title: "Auto-trading disabled", 
          description: res.message,
          variant: "default",
        });
        return;
      }

      // Simulate trade execution for now
      console.log('🚀 Simulating trade execution:', signal, settings);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Trade Executed (Simulated)",
        description: `${signal.symbol} ${signal.direction} - $${settings.quantity}`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('Trade execution error:', error);
      toast({
        title: "Trade Error",
        description: error.message || 'Failed to execute trade',
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const toggleAutoTrade = () => {
    setAutoTrade(!autoTrade);
    toast({
      title: autoTrade ? "Auto-Trade Disabled" : "Auto-Trade Enabled",
      description: autoTrade 
        ? "Manual approval required for trades" 
        : "Trades will execute automatically for high-confidence signals",
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>Trading Panel</span>
          </div>
          <Badge variant={autoTrade ? "secondary" : "outline"}>
            {autoTrade ? "Auto" : "Manual"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Auto-Trade Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border">
          <div>
            <p className="font-medium">Auto-Trade Mode</p>
            <p className="text-xs text-muted-foreground">
              Execute high-confidence signals automatically
            </p>
          </div>
          <Button
            onClick={toggleAutoTrade}
            variant={autoTrade ? "default" : "outline"}
            size="sm"
          >
            {autoTrade ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {autoTrade ? "Stop" : "Start"}
          </Button>
        </div>

        {/* Execution Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Execution Settings</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Exchange</label>
              <Select 
                value={executionSettings.exchange} 
                onValueChange={(value) => setExecutionSettings(prev => ({...prev, exchange: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="kucoin">KuCoin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground">Max Leverage</label>
              <Input
                type="number"
                value={executionSettings.leverage}
                onChange={(e) => setExecutionSettings(prev => ({...prev, leverage: parseInt(e.target.value)}))}
                min="1"
                max="125"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Capital Per Trade (%)</label>
            <Input
              type="number"
              value={executionSettings.capital_percent}
              onChange={(e) => setExecutionSettings(prev => ({...prev, capital_percent: parseFloat(e.target.value)}))}
              min="1"
              max="25"
              step="0.5"
            />
          </div>
        </div>

        {/* Active Trades Summary */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Active Trades</span>
          </div>
          
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No active trades</p>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="flex items-start space-x-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-destructive">High-Risk Warning</p>
            <p className="text-muted-foreground">
              Leveraged trading carries significant risk. Only trade with funds you can afford to lose.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            Close All Positions
          </Button>
          <Button variant="outline" size="sm">
            Emergency Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingPanel;