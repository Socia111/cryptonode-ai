import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSignals } from '@/hooks/useSignals';
import { Loader2, TrendingUp, TrendingDown, BarChart3, Zap } from 'lucide-react';

const BottomSignalsBar: React.FC = () => {
  const { signals, loading, generateSignals } = useSignals();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest signal when new ones arrive
  useEffect(() => {
    if (scrollRef.current && signals.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [signals.length]);

  // Filter active signals from multiple timeframes (5m to 4h)
  const activeSignals = signals.filter(signal => 
    signal.status === 'active' && 
    ['5m', '15m', '30m', '1h', '2h', '4h'].includes(signal.timeframe)
  );

  const formatPrice = (price: number) => {
    return price?.toFixed(4) || '0.0000';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const signalTime = new Date(timestamp);
    const diffMs = now.getTime() - signalTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50/95 backdrop-blur-sm border-t border-gradient-to-r from-purple-300 to-blue-300 shadow-xl">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm text-grey-primary">Live Signals</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {activeSignals.length} Active (5m-4h)
            </Badge>
          </div>
          
          <Button 
            variant="destructive" 
            size="lg" 
            onClick={generateSignals}
            disabled={loading}
            className="shrink-0 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold px-6 py-3"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <BarChart3 className="h-3 w-3 mr-1" />
            )}
            Generate
          </Button>
        </div>

        {/* Scrolling signals feed */}
        <div 
          ref={scrollRef}
          className="flex items-center space-x-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
          style={{ scrollbarWidth: 'thin' }}
        >
          {activeSignals.length === 0 ? (
            <div className="flex items-center justify-center w-full py-2">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Scanning markets...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">No active signals</span>
                </div>
              )}
            </div>
          ) : (
            activeSignals.map((signal, index) => {
              const rainbowColors = [
                'from-red-200 to-pink-200 border-red-300',
                'from-orange-200 to-yellow-200 border-orange-300', 
                'from-yellow-200 to-lime-200 border-yellow-300',
                'from-green-200 to-emerald-200 border-green-300',
                'from-cyan-200 to-blue-200 border-cyan-300',
                'from-blue-200 to-indigo-200 border-blue-300',
                'from-purple-200 to-violet-200 border-purple-300',
                'from-pink-200 to-rose-200 border-pink-300'
              ];
              const colorClass = rainbowColors[index % rainbowColors.length];
              
              return (
              <Card key={`${signal.id}-${index}`} className={`flex items-center space-x-3 px-4 py-3 bg-gradient-to-r ${colorClass} shrink-0 min-w-[320px] animate-in slide-in-from-right-5 duration-300 shadow-lg hover:shadow-xl transition-all`}>
                <div className="flex items-center space-x-2">
                   {signal.direction === 'BUY' ? (
                     <div className="flex items-center space-x-1 bg-success text-success-foreground px-3 py-1.5 rounded-full shadow-md">
                       <TrendingUp className="h-4 w-4" />
                       <span className="text-xs font-bold">LONG</span>
                     </div>
                   ) : (
                     <div className="flex items-center space-x-1 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full shadow-md">
                       <TrendingDown className="h-4 w-4" />
                       <span className="text-xs font-bold">SHORT</span>
                     </div>
                   )}
                   <span className="font-bold text-sm text-foreground">{signal.token}</span>
                 </div>
                 
                 <div className="text-xs text-foreground font-bold bg-background/50 px-2 py-1 rounded">
                   ${formatPrice(signal.entry_price)}
                 </div>
                 
                 <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground border-0">
                   {signal.timeframe}
                 </Badge>
                 
                 <div className="text-xs bg-background/60 px-2 py-1 rounded-full">
                   <span className="text-primary font-bold">{signal.confidence_score}%</span>
                 </div>
                 
                 <div className="text-xs text-muted-foreground bg-background/40 px-2 py-1 rounded">
                  {formatTimeAgo(signal.created_at)}
                </div>
              </Card>
            )})
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomSignalsBar;