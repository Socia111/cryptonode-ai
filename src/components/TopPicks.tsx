import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';

interface RankedSignal {
  id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  confidence_score: number;
  entry_price: number;
  stop_loss?: number | null;
  exit_target?: number | null;
  grade: 'A+' | 'A' | 'B' | 'C';
  score: number;
  timeframe: string;
}

interface TopPicksProps {
  items: RankedSignal[];
}

export const TopPicks: React.FC<TopPicksProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-primary" />
          Top Picks
          <Badge variant="secondary" className="text-xs">
            {items.length} premium setups
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((signal, index) => {
          const isBuy = signal.direction === 'BUY';
          const Icon = isBuy ? TrendingUp : TrendingDown;
          
          return (
            <div
              key={signal.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-primary">#{index + 1}</span>
                  <Icon className={`w-4 h-4 ${isBuy ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{signal.token}</span>
                    <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                      {signal.direction}
                    </Badge>
                    <Badge 
                      variant={
                        signal.grade === 'A+' ? 'default' :
                        signal.grade === 'A' ? 'secondary' :
                        signal.grade === 'B' ? 'outline' : 'destructive'
                      } 
                      className="text-xs"
                    >
                      {signal.grade}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {signal.timeframe} • Entry: ${signal.entry_price?.toFixed(4)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium">
                  {(signal.score * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  edge score
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};