import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { SignalFeed } from '@/components/SignalFeed';
import { SignalsDebug } from '@/components/SignalsDebug';
import { SystemRebuild } from '@/components/SystemRebuild';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/hooks/use-toast';

import { LiveComprehensiveTest } from '@/components/LiveComprehensiveTest';
import { ComprehensiveTestPanel } from '@/components/ComprehensiveTestPanel';

const Signals = () => {
  const { signals, loading, generateSignals } = useSignals();
  const { toast } = useToast();
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [amountUSD, setAmountUSD] = useState(50);
  const [leverage, setLeverage] = useState(10);
  const [scalpMode, setScalpMode] = useState(false);

  // Filter and rank signals
  const rankedSignals = useRankedSignals(signals, { 
    hideWideSpreads: true,
    hide1MinSignals: false,
    excludeInnovationZone: true
  });

  const executeTrade = async (signal: any) => {
    setIsExecuting(true);
    try {
      const side = signal.direction === 'LONG' ? 'Buy' : 'Sell';
      const result = await TradingGateway.execute({
        symbol: signal.token,
        side,
        amountUSD,
        leverage,
        scalpMode,
        entryPrice: signal.price
      });

      if (result.ok) {
        toast({
          title: "Trade Executed",
          description: `${signal.token} ${side} - $${amountUSD} at ${leverage}x`,
          variant: "default",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
      setSelectedSignal(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Trading Signals
          </h1>
          <p className="text-muted-foreground">
            Advanced AI-powered signals with 80%+ confidence and real-time market analysis
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Signal Feed</h2>
          <Button onClick={generateSignals} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate New Signals
          </Button>
        </div>

        <ComprehensiveTestPanel />
        <LiveComprehensiveTest />
        
        <SystemRebuild />
        <SignalsDebug />
        
        {/* Live Signal Feed with Enhanced Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Live Signal Feed (Enhanced)</CardTitle>
          </CardHeader>
          <CardContent>
            <SignalFeed />
          </CardContent>
        </Card>

        {/* Trading Controls - Centered */}
        {selectedSignal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-background border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Execute Trade - {selectedSignal.token}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSignal(null)}>
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {selectedSignal.direction === 'LONG' ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-lg font-semibold">{selectedSignal.direction}</span>
                  </div>
                  <div className="text-2xl font-bold">${selectedSignal.price}</div>
                  <Badge variant="secondary" className="mt-1">
                    {selectedSignal.confidence}% Confidence
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amountUSD}
                      onChange={(e) => setAmountUSD(Number(e.target.value))}
                      min="25"
                      step="25"
                    />
                    <div className="flex gap-2 mt-2">
                      {[25, 50, 100, 250].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setAmountUSD(amount)}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Leverage: {leverage}x</Label>
                    <Slider
                      value={[leverage]}
                      onValueChange={(value) => setLeverage(value[0])}
                      max={25}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1x</span>
                      <span>25x</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="scalp-mode"
                      checked={scalpMode}
                      onCheckedChange={setScalpMode}
                    />
                    <Label htmlFor="scalp-mode">Scalp Mode (Quick TP/SL)</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Notional</span>
                      <div className="font-semibold">${(amountUSD * leverage).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Est. Qty</span>
                      <div className="font-semibold">{((amountUSD * leverage) / selectedSignal.price).toFixed(4)}</div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => executeTrade(selectedSignal)}
                  disabled={isExecuting}
                  className={`w-full ${
                    selectedSignal.direction === 'LONG' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isExecuting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : selectedSignal.direction === 'LONG' ? (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-2 h-4 w-4" />
                  )}
                  {isExecuting ? 'Executing...' : `${selectedSignal.direction} ${selectedSignal.token}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {loading ? (
          <div className="py-10 text-center opacity-70">Loading…</div>
        ) : (
          <div className="space-y-4">
            {rankedSignals.map((signal, index) => (
              <Card key={`${signal.token}-${signal.created_at || Date.now()}-${index}`} className="glass-card hover:bg-muted/20 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-semibold">{signal.token}</div>
                      <Badge variant={signal.direction === 'BUY' || signal.direction === 'Buy' ? 'default' : 'destructive'}>
                        {signal.direction}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        ${signal.entry_price || signal.exit_target || 0} • {Math.round((signal.confidence_score || signal.score || 0) * 100)}% confidence
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedSignal({
                        ...signal,
                        direction: (signal.direction === 'BUY' || signal.direction === 'Buy') ? 'LONG' : 'SHORT',
                        price: signal.entry_price || signal.exit_target || 0,
                        confidence: Math.round((signal.confidence_score || signal.score || 0) * 100)
                      })}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Target className="w-4 h-4" />
                      <span>Trade</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Signals;