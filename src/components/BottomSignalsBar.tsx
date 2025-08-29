import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSignals } from '@/hooks/useSignals';
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

const BottomSignalsBar: React.FC = () => {
  const { signals, loading, generateSignals } = useSignals();

  // Show only the top 3 most recent high-confidence signals
  const topSignals = signals
    .filter(signal => signal.confidence_score >= 75)
    .slice(0, 3);

  const formatPrice = (price: number) => {
    return price?.toFixed(4) || '0.0000';
  };

  if (loading && signals.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading signals...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t">
      <div className="container mx-auto px-4 py-2">
        {topSignals.length === 0 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No active signals</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateSignals}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <BarChart3 className="h-3 w-3 mr-1" />
              )}
              Generate
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 overflow-x-auto">
              {topSignals.map((signal, index) => (
                <Card key={index} className="flex items-center space-x-3 px-3 py-2 bg-card/50 border-border/50 shrink-0">
                  <div className="flex items-center space-x-2">
                    {signal.direction === 'BUY' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium text-sm">{signal.token}</span>
                  </div>
                  
                  <Badge 
                    variant={signal.direction === 'BUY' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {signal.direction}
                  </Badge>
                  
                  <div className="text-xs text-muted-foreground">
                    Entry: ${formatPrice(signal.entry_price)}
                  </div>
                  
                  <div className="text-xs">
                    <span className="text-primary font-medium">{signal.confidence_score}%</span>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <Badge variant="outline" className="text-xs">
                {signals.length} signals
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateSignals}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <BarChart3 className="h-3 w-3 mr-1" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomSignalsBar;