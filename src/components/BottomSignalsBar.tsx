import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSignals } from '@/hooks/useSignals';
import { Loader2, TrendingUp, TrendingDown, BarChart3, Zap, Activity, DollarSign, Timer } from 'lucide-react';

const BottomSignalsBar: React.FC = () => {
  const { signals, loading, generateSignals } = useSignals();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest signal when new ones arrive
  useEffect(() => {
    if (scrollRef.current && signals.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [signals.length]);

  // Filter active signals from multiple timeframes (excluding 5m)
  const activeSignals = signals.filter(signal => 
    signal.status === 'active' && 
    ['15m', '30m', '1h', '2h', '4h'].includes(signal.timeframe)
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

  // Calculate stats
  const highConfidenceSignals = activeSignals.filter(s => s.confidence_score >= 80);
  const recentSignals = activeSignals.filter(s => {
    const signalTime = new Date(s.created_at);
    const now = new Date();
    return (now.getTime() - signalTime.getTime()) < 60 * 60 * 1000; // Last 1 hour
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-lg border-t border-border/50 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        {/* Top Stats Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Zap className="h-5 w-5 text-primary" />
                {loading && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <span className="font-semibold text-sm">Live Market Scanner</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">Active:</span>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {activeSignals.length}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">High Confidence:</span>
                <Badge variant="default" className="text-xs px-2 py-0.5 bg-primary/20 text-primary">
                  {highConfidenceSignals.length}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-1">
                <Timer className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-muted-foreground">Recent:</span>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {recentSignals.length}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button 
            variant="destructive" 
            size="lg" 
            onClick={generateSignals}
            disabled={loading}
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Scanning...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Signals
              </>
            )}
          </Button>
        </div>

        {/* Enhanced Scrolling Signals Feed */}
        <div 
          ref={scrollRef}
          className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/40 hover:scrollbar-thumb-border/60 transition-colors"
          style={{ scrollbarWidth: 'thin' }}
        >
          {activeSignals.length === 0 ? (
            <div className="flex items-center justify-center w-full py-4">
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div className="absolute inset-0 h-5 w-5 border-2 border-primary/20 rounded-full animate-ping" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Scanning markets...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3 py-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">No active signals • Click Generate to scan</span>
                </div>
              )}
            </div>
          ) : (
            activeSignals.map((signal, index) => (
              <Card 
                key={`${signal.id}-${index}`} 
                className="flex items-center space-x-3 px-4 py-3 bg-card/80 hover:bg-card border-border/60 hover:border-border shrink-0 min-w-[320px] animate-in slide-in-from-right-5 duration-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-2">
                  {signal.direction === 'BUY' ? (
                    <div className="p-1 rounded-full bg-green-500/20">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  ) : (
                    <div className="p-1 rounded-full bg-red-500/20">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {signal.token}
                  </span>
                </div>
                
                <Badge 
                  variant={signal.direction === 'BUY' ? 'default' : 'destructive'}
                  className="text-xs font-medium px-2 py-0.5"
                >
                  {signal.direction}
                </Badge>
                
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground">Entry</span>
                  <span className="text-xs font-mono font-medium">
                    ${formatPrice(signal.entry_price)}
                  </span>
                </div>
                
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  {signal.timeframe}
                </Badge>
                
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground">Score</span>
                  <span className={`text-xs font-bold ${
                    signal.confidence_score >= 80 ? 'text-green-500' : 
                    signal.confidence_score >= 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {signal.confidence_score}%
                  </span>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground">Age</span>
                  <span className="text-xs font-medium">
                    {formatTimeAgo(signal.created_at)}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomSignalsBar;