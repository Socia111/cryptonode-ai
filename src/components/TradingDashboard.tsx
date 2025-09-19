import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Activity, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TradeParams {
  symbol: string;
  side: 'Buy' | 'Sell';
  amountUSD: number;
}

export const TradingDashboard = () => {
  const { toast } = useToast();
  const [isTrading, setIsTrading] = useState(false);
  const [tradeParams, setTradeParams] = useState<TradeParams>({
    symbol: 'BTCUSDT',
    side: 'Buy',
    amountUSD: 100
  });

  const executeTestTrade = async () => {
    setIsTrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          ...tradeParams
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Trade Executed",
          description: `${tradeParams.side} ${tradeParams.symbol} - $${tradeParams.amountUSD}`,
        });
      } else {
        throw new Error(data?.error || 'Trade failed');
      }
    } catch (error: any) {
      toast({
        title: "Trade Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTrading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });

      if (error) throw error;

      toast({
        title: "System Status",
        description: `Trading: ${data?.trading_enabled ? 'Enabled' : 'Disabled'}`,
      });
    } catch (error: any) {
      toast({
        title: "Status Check Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$12,345.67</div>
          <p className="text-xs text-muted-foreground">
            +2.5% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">3</div>
          <p className="text-xs text-muted-foreground">
            2 profitable, 1 pending
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">+$234.56</div>
          <p className="text-xs text-muted-foreground">
            +1.9% today
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Execute Trade</CardTitle>
          <CardDescription>
            Test the trading system with a simulated order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Select 
                value={tradeParams.symbol} 
                onValueChange={(value) => setTradeParams(prev => ({ ...prev, symbol: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="side">Side</Label>
              <Select 
                value={tradeParams.side} 
                onValueChange={(value: 'Buy' | 'Sell') => setTradeParams(prev => ({ ...prev, side: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                type="number"
                value={tradeParams.amountUSD}
                onChange={(e) => setTradeParams(prev => ({ ...prev, amountUSD: Number(e.target.value) }))}
                min="10"
                max="10000"
              />
            </div>

            <div className="space-y-2 flex items-end">
              <Badge variant="default">
                Live Trading
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={executeTestTrade} 
              disabled={isTrading}
              className="flex-1"
            >
              {isTrading ? "Executing..." : "Execute Test Trade"}
            </Button>
            <Button 
              onClick={checkStatus} 
              variant="outline"
            >
              Check Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};