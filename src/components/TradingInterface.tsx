import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Position {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  margin: number;
  leverage: number;
  liquidationPrice: number;
  status: 'open' | 'closed';
  openTime: Date;
}

interface OrderHistory {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  size: number;
  price: number;
  status: 'filled' | 'cancelled' | 'pending';
  time: Date;
}

export function TradingInterface() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('100');
  const [price, setPrice] = useState('42000');
  const [leverage, setLeverage] = useState([10]);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [liveMode, setLiveMode] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { toast } = useToast();

  // Mock data
  const [positions] = useState<Position[]>([
    {
      id: '1',
      symbol: 'BTC/USDT',
      side: 'buy',
      size: 0.1,
      entryPrice: 41800,
      currentPrice: 42150,
      pnl: 35.0,
      pnlPercent: 0.84,
      margin: 418,
      leverage: 10,
      liquidationPrice: 37620,
      status: 'open',
      openTime: new Date()
    },
    {
      id: '2',
      symbol: 'ETH/USDT',
      side: 'sell',
      size: 2,
      entryPrice: 2500,
      currentPrice: 2485,
      pnl: 30.0,
      pnlPercent: 0.6,
      margin: 250,
      leverage: 20,
      liquidationPrice: 2750,
      status: 'open',
      openTime: new Date()
    }
  ]);

  const [orderHistory] = useState<OrderHistory[]>([
    {
      id: '1',
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'market',
      size: 0.1,
      price: 41800,
      status: 'filled',
      time: new Date()
    },
    {
      id: '2',
      symbol: 'ETH/USDT',
      side: 'sell',
      type: 'limit',
      size: 2,
      price: 2500,
      status: 'filled',
      time: new Date()
    }
  ]);

  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT'];
  
  const calculateLiquidationPrice = () => {
    const entryPrice = parseFloat(price) || 0;
    const lev = leverage[0];
    const marginRatio = 0.1; // 10% maintenance margin
    
    if (side === 'buy') {
      return entryPrice * (1 - (1 / lev) + marginRatio);
    } else {
      return entryPrice * (1 + (1 / lev) - marginRatio);
    }
  };

  const calculateMargin = () => {
    const positionValue = parseFloat(amount) || 0;
    return positionValue / leverage[0];
  };

  const executeTrade = async () => {
    setIsExecuting(true);
    
    try {
      const tradeData = {
        symbol: selectedSymbol,
        side: side.toUpperCase(),
        amount_usd: parseFloat(amount),
        leverage: leverage[0],
        real_trading: liveMode,
        order_type: orderType,
        price: orderType !== 'market' ? parseFloat(price) : undefined,
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined
      };

      // Call the trade execution function
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'execute_trade',
          trade: tradeData
        }
      });

      if (error) throw error;

      toast({
        title: "Live Trade Executed",
        description: `${side.toUpperCase()} ${selectedSymbol} for $${amount}`,
      });

    } catch (error) {
      console.error('Trade execution error:', error);
      toast({
        title: "Trade Failed",
        description: "Failed to execute trade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const closePosition = async (positionId: string) => {
    toast({
      title: "Position Closed",
      description: "Position has been successfully closed",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trade" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trade">Trade</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Trading Form */}
        <TabsContent value="trade" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Execute Trade</CardTitle>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <Switch 
                         checked={liveMode} 
                         onCheckedChange={setLiveMode}
                         id="live-mode"
                       />
                       <Label htmlFor="live-mode" className="text-sm">
                         Live Trading
                       </Label>
                     </div>
                     {liveMode && (
                       <Badge className="bg-success/20 text-success border-success/30">
                         Live Mode
                       </Badge>
                     )}
                   </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Symbol</Label>
                      <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {symbols.map(symbol => (
                            <SelectItem key={symbol} value={symbol}>
                              {symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Order Type</Label>
                      <Select value={orderType} onValueChange={(value: 'market' | 'limit' | 'stop') => setOrderType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market">Market</SelectItem>
                          <SelectItem value="limit">Limit</SelectItem>
                          <SelectItem value="stop">Stop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={side === 'buy' ? 'default' : 'outline'}
                      onClick={() => setSide('buy')}
                      className={side === 'buy' ? 'bg-success hover:bg-success/90 flex-1' : 'flex-1'}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      BUY
                    </Button>
                    <Button
                      variant={side === 'sell' ? 'destructive' : 'outline'}
                      onClick={() => setSide('sell')}
                      className="flex-1"
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      SELL
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (USD)</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="100"
                      />
                    </div>

                    {orderType !== 'market' && (
                      <div className="space-y-2">
                        <Label>Price (USD)</Label>
                        <Input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="42000"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Leverage: {leverage[0]}x</Label>
                    <Slider
                      value={leverage}
                      onValueChange={setLeverage}
                      max={100}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stop Loss (Optional)</Label>
                      <Input
                        type="number"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        placeholder="40000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Take Profit (Optional)</Label>
                      <Input
                        type="number"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        placeholder="45000"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={executeTrade}
                    disabled={isExecuting}
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    {isExecuting ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Execute {side.toUpperCase()} Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Symbol</span>
                      <span className="font-mono">{selectedSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Side</span>
                      <Badge className={side === 'buy' ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'}>
                        {side.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-mono">${amount || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leverage</span>
                      <span className="font-mono">{leverage[0]}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-mono">${calculateMargin().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Liquidation</span>
                      <span className="font-mono text-destructive">
                        ${calculateLiquidationPrice().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Risk Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm">High leverage increases risk</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                    <Shield className="h-4 w-4 text-info" />
                    <span className="text-sm">Stop loss recommended</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Open Positions */}
        <TabsContent value="positions" className="mt-6">
          <Card className="surface-elevated">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length > 0 ? (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.id} className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className="font-mono">{position.symbol}</Badge>
                          <Badge 
                            className={position.side === 'buy' ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'}
                          >
                            {position.side === 'buy' ? 'LONG' : 'SHORT'} {position.leverage}x
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`text-right ${position.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            <div className="font-medium">
                              {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                            </div>
                            <div className="text-xs">
                              ({position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => closePosition(position.id)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Size</div>
                          <div className="font-mono">{position.size}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Entry Price</div>
                          <div className="font-mono">${position.entryPrice.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Current Price</div>
                          <div className="font-mono">${position.currentPrice.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Liquidation</div>
                          <div className="font-mono text-destructive">${position.liquidationPrice.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No open positions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order History */}
        <TabsContent value="history" className="mt-6">
          <Card className="surface-elevated">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orderHistory.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Badge className="font-mono">{order.symbol}</Badge>
                      <Badge className={order.side === 'buy' ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'}>
                        {order.side.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{order.type}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="font-mono">{order.size} @ ${order.price.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.time.toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge 
                        className={
                          order.status === 'filled' ? 'bg-success/20 text-success border-success/30' :
                          order.status === 'cancelled' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                          'bg-warning/20 text-warning border-warning/30'
                        }
                      >
                        {order.status === 'filled' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {order.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}