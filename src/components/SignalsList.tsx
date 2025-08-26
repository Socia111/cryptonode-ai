
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Clock, Target, Volume2 } from 'lucide-react';

const SignalsList = () => {
  const signals = [
    {
      id: 1,
      coin: 'ETH/USDT',
      type: 'BUY',
      signal: 'Golden Cross',
      price: '$3,247.82',
      confidence: 96.2,
      timeframe: '15m',
      volume: '+127%',
      timestamp: '2 min ago'
    },
    {
      id: 2,
      coin: 'SOL/USDT',
      type: 'SELL',
      signal: 'RSI Overbought',
      price: '$198.45',
      confidence: 89.4,
      timeframe: '5m',
      volume: '+89%',
      timestamp: '5 min ago'
    },
    {
      id: 3,
      coin: 'ADA/USDT',
      type: 'BUY',
      signal: 'Volume Spike',
      price: '$1.23',
      confidence: 91.8,
      timeframe: '30m',
      volume: '+234%',
      timestamp: '8 min ago'
    }
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-primary" />
            <span>Live Signals</span>
          </div>
          <Badge variant="secondary" className="pulse-glow bg-primary/20 text-primary">
            {signals.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {signals.map((signal) => {
          const isBuy = signal.type === 'BUY';
          const signalColor = isBuy ? 'success' : 'destructive';
          const TrendIcon = isBuy ? TrendingUp : TrendingDown;

          return (
            <div 
              key={signal.id} 
              className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${
                isBuy 
                  ? 'bg-success/10 border-success/20 hover:glow-success' 
                  : 'bg-destructive/10 border-destructive/20 hover:glow-danger'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isBuy ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                  }`}>
                    <TrendIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold trading-mono">{signal.coin}</h4>
                    <p className="text-xs text-muted-foreground">{signal.signal}</p>
                  </div>
                </div>
                
                <Badge 
                  variant="outline" 
                  className={`text-xs ${isBuy ? 'border-success text-success' : 'border-destructive text-destructive'}`}
                >
                  {signal.type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-semibold trading-mono">{signal.price}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Confidence</p>
                  <p className="font-semibold trading-mono">{signal.confidence}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timeframe</p>
                  <p className="font-semibold trading-mono">{signal.timeframe}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Volume</p>
                  <p className="font-semibold trading-mono text-chart-volume">{signal.volume}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{signal.timestamp}</span>
                </div>
                
                <Button 
                  size="sm" 
                  variant={isBuy ? "default" : "destructive"}
                  className="text-xs"
                >
                  Execute Trade
                </Button>
              </div>
            </div>
          );
        })}

        <Button variant="outline" className="w-full mt-4">
          View All Signals
        </Button>
      </CardContent>
    </Card>
  );
};

export default SignalsList;
