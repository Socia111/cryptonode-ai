import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Target, Shield, Clock, X, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeSignal {
  id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  entry_price: number;
  sl: number;
  tp: number;
  confidence_score: number;
  timeframe: string;
  created_at: string;
  exchange: string;
  reason?: string;
}

const RealtimeSignalsFeed: React.FC = () => {
  const [signals, setSignals] = useState<RealtimeSignal[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up real-time subscription for new signals
    const channel = supabase
      .channel('realtime-signals-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('New signal received:', payload);
          const newSignal = payload.new as any;
          
          // Only show signals that aren't 5m timeframe and have decent confidence
          if (newSignal.timeframe !== '5m' && newSignal.score >= 70) {
            const formattedSignal: RealtimeSignal = {
              id: newSignal.id,
              token: newSignal.token || newSignal.symbol,
              direction: newSignal.direction,
              entry_price: newSignal.entry_price || newSignal.price,
              sl: newSignal.sl || newSignal.stop_loss,
              tp: newSignal.tp || newSignal.take_profit,
              confidence_score: newSignal.confidence_score || newSignal.score,
              timeframe: newSignal.timeframe,
              created_at: newSignal.created_at,
              exchange: newSignal.exchange || 'Bybit',
              reason: newSignal.reason
            };

            setSignals(prev => {
              const newSignals = [formattedSignal, ...prev];
              // Keep only the latest 20 signals
              return newSignals.slice(0, 20);
            });

            // Auto-scroll to bottom when new signal arrives
            setTimeout(() => {
              if (feedRef.current) {
                feedRef.current.scrollTop = feedRef.current.scrollHeight;
              }
            }, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error - will retry');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const calculateRiskReward = (signal: RealtimeSignal) => {
    const riskDistance = Math.abs(signal.entry_price - signal.sl);
    const rewardDistance = Math.abs(signal.tp - signal.entry_price);
    return rewardDistance / riskDistance;
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed ${isExpanded ? 'top-4 left-4 w-96 h-[80vh]' : 'top-4 right-4 w-80 h-96'} z-40 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card/50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-medium text-sm">Live Signals Feed</span>
          <Badge variant="outline" className="text-xs">
            {signals.length}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Feed Content */}
      <div 
        ref={feedRef}
        className="p-2 overflow-y-auto"
        style={{ height: isExpanded ? 'calc(80vh - 60px)' : 'calc(24rem - 60px)' }}
      >
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Waiting for signals...</p>
            <p className="text-xs text-muted-foreground mt-1">Real-time feed (70%+ confidence)</p>
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map((signal, index) => (
              <Card 
                key={`${signal.id}-${index}`} 
                className="p-3 bg-card/80 border-border/50 animate-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="space-y-2">
                  {/* Signal Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {signal.direction === 'BUY' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium text-sm">{signal.token}</span>
                      <Badge 
                        variant={signal.direction === 'BUY' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {signal.direction}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {signal.timeframe}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(signal.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">${formatPrice(signal.entry_price)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" /> SL
                      </p>
                      <p className="font-medium text-red-600">${formatPrice(signal.sl)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" /> TP
                      </p>
                      <p className="font-medium text-green-600">${formatPrice(signal.tp)}</p>
                    </div>
                  </div>

                  {/* Signal Metrics */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/30">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs">
                        <span className="text-muted-foreground">Score: </span>
                        <span className="text-primary font-medium">{signal.confidence_score}%</span>
                      </span>
                      <span className="text-xs">
                        <span className="text-muted-foreground">R:R </span>
                        <span className="font-medium">{calculateRiskReward(signal).toFixed(2)}</span>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{signal.exchange}</span>
                  </div>

                  {/* Reason (if available) */}
                  {signal.reason && (
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                      {signal.reason}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Show toggle button if hidden */}
      {!isVisible && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="fixed top-4 right-4 z-50"
        >
          Show Feed
        </Button>
      )}
    </div>
  );
};

export default RealtimeSignalsFeed;
