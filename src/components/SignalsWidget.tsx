import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSignals } from '@/hooks/useSignals';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface SignalsWidgetProps {
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

const SignalsWidget: React.FC<SignalsWidgetProps> = ({ 
  maxItems = 5, 
  showHeader = true,
  className = ''
}) => {
  const { signals, loading } = useSignals();
  
  const topSignals = signals.slice(0, maxItems);

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h`;
  };

  return (
    <Card className={`border border-border/50 ${className}`}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Live Signals
            <Badge variant="outline" className="text-xs ml-auto">
              {signals.length}
            </Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "pt-0" : ""}>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">Loading...</p>
          </div>
        ) : topSignals.length === 0 ? (
          <div className="text-center py-4">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No active signals</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topSignals.map((signal, index) => (
              <div 
                key={signal.id} 
                className="flex items-center justify-between p-2 rounded-lg border border-border/30 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {signal.direction === 'BUY' ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <span className="text-xs font-medium text-foreground">
                      {signal.token}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs px-1 py-0"
                  >
                    {signal.timeframe}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-medium text-foreground">
                      ${formatPrice(signal.entry_price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {signal.confidence_score.toFixed(0)}%
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {formatTime(signal.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalsWidget;