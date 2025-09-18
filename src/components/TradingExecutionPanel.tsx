import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';
import { useTradingAccounts } from '@/hooks/useTradingAccounts';
import { Play, StopCircle, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface Signal {
  id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  entry_price: number;
  confidence_score: number;
  timeframe: string;
  stop_loss?: number | null;
  exit_target?: number | null;
}

interface TradingExecutionPanelProps {
  signals?: Signal[];
}

export function TradingExecutionPanel({ signals = [] }: TradingExecutionPanelProps) {
  const { executing, lastTrade, executeTrade, executeSignalTrade, closePosition } = useTradingExecutor();
  const { accounts } = useTradingAccounts();
  const { toast } = useToast();

  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedSide, setSelectedSide] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState('100');
  const [leverage, setLeverage] = useState('1');
  const [paperMode, setPaperMode] = useState(true);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');

  const connectedAccount = accounts.find(acc => acc.is_active);
  const highConfidenceSignals = signals.filter(s => s.confidence_score >= 80);

  const handleManualTrade = async () => {
    if (!tradeAmount || isNaN(Number(tradeAmount)) || Number(tradeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid trade amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await executeTrade({
        symbol: selectedSymbol,
        side: selectedSide,
        amount: Number(tradeAmount),
        leverage: Number(leverage),
        orderType,
        price: orderType === 'limit' ? Number(limitPrice) : undefined,
        paperMode
      });

      if (result.success) {
        console.log('Trade executed successfully:', result);
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
    }
  };

  const handleSignalTrade = async (signal: Signal) => {
    try {
      const result = await executeSignalTrade(signal, Number(tradeAmount), paperMode);
      if (result.success) {
        console.log('Signal trade executed:', result);
      }
    } catch (error) {
      console.error('Signal trade failed:', error);
    }
  };

  const handleClosePosition = async () => {
    try {
      const result = await closePosition(selectedSymbol, paperMode);
      if (result.success) {
        console.log('Position closed:', result);
      }
    } catch (error) {
      console.error('Close position failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Play className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Trading Execution</h2>
          <p className="text-sm text-muted-foreground">
            Execute trades manually or from signals
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectedAccount ? (
                <>
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm">Connected to {connectedAccount.exchange}</span>
                  <Badge variant="secondary">{connectedAccount.account_type}</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="text-sm text-warning">No trading account connected</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={paperMode} 
                onCheckedChange={setPaperMode}
                disabled={!connectedAccount}
              />
              <Label className="text-xs">
                {paperMode ? 'Paper Trading' : 'Live Trading'}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Trading */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manual Trade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                    <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                    <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                    <SelectItem value="ADA/USDT">ADA/USDT</SelectItem>
                    <SelectItem value="DOT/USDT">DOT/USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Side</Label>
                <Select value={selectedSide} onValueChange={(value: 'buy' | 'sell') => setSelectedSide(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        Buy
                      </div>
                    </SelectItem>
                    <SelectItem value="sell">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        Sell
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (USDT)</Label>
                <Input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Leverage</Label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="3">3x</SelectItem>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="10">10x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(value: 'market' | 'limit') => setOrderType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market Order</SelectItem>
                  <SelectItem value="limit">Limit Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {orderType === 'limit' && (
              <div className="space-y-2">
                <Label>Limit Price</Label>
                <Input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="Enter limit price"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleManualTrade}
                disabled={executing || !connectedAccount}
                className="flex-1"
              >
                {executing ? "Executing..." : "Execute Trade"}
              </Button>
              <Button 
                variant="outline"
                onClick={handleClosePosition}
                disabled={executing || !connectedAccount}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            </div>

            {!connectedAccount && (
              <p className="text-xs text-warning">
                Connect a trading account in the Authentication tab to enable trading
              </p>
            )}
          </CardContent>
        </Card>

        {/* Signal Trading */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signal Trading</CardTitle>
            <p className="text-sm text-muted-foreground">
              Execute trades from high-confidence signals
            </p>
          </CardHeader>
          <CardContent>
            {highConfidenceSignals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No high-confidence signals available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Signals with 80%+ confidence will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {highConfidenceSignals.slice(0, 5).map((signal) => (
                  <div key={signal.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={signal.direction === 'BUY' ? 'default' : 'destructive'}>
                          {signal.direction}
                        </Badge>
                        <span className="font-medium">{signal.token}</span>
                        <Badge variant="outline">{signal.timeframe}</Badge>
                      </div>
                      <Badge className="bg-primary/20 text-primary">
                        {signal.confidence_score.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Entry: ${signal.entry_price.toFixed(4)}</p>
                      {signal.stop_loss && <p>Stop Loss: ${signal.stop_loss.toFixed(4)}</p>}
                      {signal.exit_target && <p>Target: ${signal.exit_target.toFixed(4)}</p>}
                    </div>

                    <Button 
                      size="sm" 
                      onClick={() => handleSignalTrade(signal)}
                      disabled={executing || !connectedAccount}
                      className="w-full"
                    >
                      {executing ? "Executing..." : `Execute ${signal.direction}`}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Trade Result */}
      {lastTrade && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Trade Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-3 rounded-lg ${lastTrade.success ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
              <p className={`font-medium ${lastTrade.success ? 'text-success' : 'text-destructive'}`}>
                {lastTrade.success ? '✅ Success' : '❌ Failed'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {lastTrade.message}
              </p>
              {lastTrade.orderId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Order ID: {lastTrade.orderId}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}