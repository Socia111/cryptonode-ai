import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Star, Target, Zap } from 'lucide-react';
import { RankedSignal } from '@/hooks/useRankedSignals';

interface TopPicksProps {
  items: RankedSignal[];
  onExecute?: (signal: RankedSignal) => void;
  isExecuting?: boolean;
}

export const TopPicks: React.FC<TopPicksProps> = ({ items, onExecute, isExecuting }) => {
  if (!items || items.length === 0) return null;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="w-5 h-5 text-yellow-500 fill-current" />
          <span>⭐ Top Picks</span>
          <Badge variant="outline" className="text-xs">
            {items.length} premium setups
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3">
          {items.map((signal, index) => (
            <div
              key={signal.id}
              className="p-3 bg-background/60 border rounded-lg hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    {index + 1}
                  </div>
                  
                  {/* Symbol & Direction */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{signal.token}</span>
                    {signal.direction === 'BUY' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <Badge 
                      variant={signal.direction === 'BUY' ? "default" : "destructive"} 
                      className="text-xs px-1.5 py-0"
                    >
                      {signal.direction}
                    </Badge>
                  </div>

                  {/* Grade Badge */}
                  <Badge 
                    variant={
                      signal.grade === 'A+' ? 'success' :
                      signal.grade === 'A' ? 'default' :
                      signal.grade === 'B' ? 'warning' : 'secondary'
                    }
                    className="text-xs font-bold"
                  >
                    {signal.grade}
                  </Badge>
                  
                  {/* Score */}
                  <span className="text-xs text-muted-foreground font-medium">
                    score {Math.round(signal.score)}%
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>{signal.roi_projection?.toFixed(1)}% R:R</span>
                  </div>
                  <div className="text-right">
                    <div>Entry: ${signal.entry_price?.toFixed(4)}</div>
                    <div className="text-xs opacity-60">{signal.timeframe}</div>
                  </div>
                  
                  {onExecute && (
                    <Button
                      size="sm"
                      variant={signal.direction === 'BUY' ? "default" : "destructive"}
                      className="text-xs h-7 px-3"
                      onClick={() => onExecute(signal)}
                      disabled={isExecuting}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Execute
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};