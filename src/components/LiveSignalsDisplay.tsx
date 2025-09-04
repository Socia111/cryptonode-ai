import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';

const LiveSignalsDisplay = () => {
  const { signals, loading } = useSignals();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Loading Live Signals...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Trading Signals</CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time signals from production scanners
        </p>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active signals found. The scanner runs automatically every few minutes.
          </div>
        ) : (
          <div className="space-y-4">
            {signals.slice(0, 10).map((signal) => (
              <div key={signal.id} className="border border-grey-300 bg-grey-100/50 rounded-lg p-4 space-y-2 hover:bg-grey-200/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{signal.token}</h3>
                    <Badge variant={signal.direction === 'BUY' ? 'default' : 'destructive'}>
                      {signal.direction === 'BUY' ? (
                        <><TrendingUp className="h-3 w-3 mr-1" /> BUY</>
                      ) : (
                        <><TrendingDown className="h-3 w-3 mr-1" /> SELL</>
                      )}
                    </Badge>
                     <Badge className={
                       signal.confidence_score >= 80 ? 'bg-grey-200 text-grey-800 border-grey-300' :
                       signal.confidence_score >= 70 ? 'bg-grey-300 text-grey-700 border-grey-400' :
                       'bg-grey-400 text-grey-600 border-grey-500'
                     }>
                      {signal.confidence_score.toFixed(1)}% Confidence
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {signal.timeframe} • {new Date(signal.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Entry Price</p>
                    <p className="font-medium">${signal.entry_price.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stop Loss</p>
                    <p className="font-medium">
                      {signal.stop_loss ? `$${signal.stop_loss.toFixed(4)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Take Profit</p>
                    <p className="font-medium">
                      {signal.exit_target ? `$${signal.exit_target.toFixed(4)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ROI Projection</p>
                    <p className="font-medium text-green-600">
                      +{signal.roi_projection.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveSignalsDisplay;