import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Play, Clock, Target, Shield, Star, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Signal {
  id: number;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  sl: number;
  tp: number;
  score: number;
  timeframe: string;
  created_at: string;
}

interface LiveSignalsPanelProps {
  onExecuteTrade: (signal: Signal) => Promise<void>;
}

const LiveSignalsPanel = ({ onExecuteTrade }: LiveSignalsPanelProps) => {
  const [whitelistSignals, setWhitelistSignals] = useState<Signal[]>([]);
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingSignals, setExecutingSignals] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('whitelist');
  const { toast } = useToast();

  useEffect(() => {
    fetchLiveSignals();
    
    // Set up real-time subscription for new signals
    const channel = supabase
      .channel('live-signals-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('New signal received:', payload.new);
          if (payload.new && payload.new.score >= 70) {
            // Show toast notification for ALL signals above 70%
            toast({
              title: "🚨 New Trading Signal",
              description: `${payload.new.symbol} ${payload.new.direction} - Score: ${payload.new.score}%`,
              duration: 4000,
            });
            
            // Add new signal to the top of the list
            const newSignal: Signal = {
              id: payload.new.id,
              symbol: payload.new.symbol,
              direction: payload.new.direction,
              entry_price: payload.new.entry_price || payload.new.price,
              sl: payload.new.stop_loss,
              tp: payload.new.take_profit,
              score: payload.new.score,
              timeframe: payload.new.timeframe,
              created_at: payload.new.created_at
            };
            
            // Check if this is a whitelist symbol
            const whitelistSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT'];
            const isWhitelist = whitelistSymbols.includes(newSignal.symbol);
            
            if (isWhitelist) {
              setWhitelistSignals(prev => [newSignal, ...prev.slice(0, 14)]);
            }
            setAllSignals(prev => [newSignal, ...prev.slice(0, 49)]);
            
            console.log('[LiveSignalsPanel] 🔥 New signal added:', newSignal.symbol, newSignal.score + '%');
          }
        }
      )
      .subscribe();

    const interval = setInterval(fetchLiveSignals, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveSignals = async () => {
    try {
      setLoading(true);
      console.log('[LiveSignalsPanel] Fetching signals directly from database...');
      
      const whitelistSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT'];
      
      // Fetch whitelist signals
      const { data: whitelistData, error: whitelistError } = await supabase
        .from('signals')
        .select('*')
        .gte('score', 70)
        .in('symbol', whitelistSymbols)
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch all signals (including non-whitelist)
      const { data: allData, error: allError } = await supabase
        .from('signals')
        .select('*')
        .gte('score', 70)
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (whitelistError || allError) {
        console.error('[LiveSignalsPanel] Database error:', whitelistError || allError);
        setLoading(false);
        return;
      }

      // Map signals format
      const mapSignal = (signal: any) => ({
        id: signal.id,
        symbol: signal.symbol,
        direction: signal.direction,
        entry_price: signal.price || signal.entry_price,
        sl: signal.stop_loss || signal.sl,
        tp: signal.take_profit || signal.tp,
        score: signal.score,
        timeframe: signal.timeframe,
        created_at: signal.created_at
      });

      if (whitelistData) {
        const mappedWhitelist = whitelistData.map(mapSignal);
        console.log(`[LiveSignalsPanel] Loaded ${mappedWhitelist.length} whitelist signals`);
        setWhitelistSignals(mappedWhitelist);
      }

      if (allData) {
        const mappedAll = allData.map(mapSignal);
        console.log(`[LiveSignalsPanel] Loaded ${mappedAll.length} total signals`);
        setAllSignals(mappedAll);
      }
    } catch (error) {
      console.error('[LiveSignalsPanel] Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTrade = async (signal: Signal) => {
    setExecutingSignals(prev => new Set(prev).add(signal.id));
    try {
      await onExecuteTrade(signal);
    } finally {
      setExecutingSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signal.id);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const signalTime = new Date(dateString);
    const diffMs = now.getTime() - signalTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const calculateRiskReward = (signal: Signal) => {
    const riskDistance = Math.abs(signal.entry_price - signal.sl);
    const rewardDistance = Math.abs(signal.tp - signal.entry_price);
    return rewardDistance / riskDistance;
  };

  const renderSignalsList = (signals: Signal[], type: 'whitelist' | 'all') => (
    <div className="space-y-4">
      {signals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No {type === 'whitelist' ? 'whitelist' : 'live'} signals available</p>
          <p className="text-xs">Signals appear when confidence ≥ 70%</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {signals.map((signal) => (
            <Card key={signal.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{signal.symbol}</h4>
                      <Badge 
                        variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {signal.direction === 'LONG' ? (
                          <><TrendingUp className="h-3 w-3 mr-1" /> LONG</>
                        ) : (
                          <><TrendingDown className="h-3 w-3 mr-1" /> SHORT</>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {signal.timeframe}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(signal.created_at)} • Score: {signal.score.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Entry</p>
                        <p className="font-medium">${signal.entry_price.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3" /> SL
                        </p>
                        <p className="font-medium text-red-600">${signal.sl.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" /> TP
                        </p>
                        <p className="font-medium text-green-600">${signal.tp.toFixed(4)}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      R:R {calculateRiskReward(signal).toFixed(2)}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleExecuteTrade(signal)}
                    disabled={executingSignals.has(signal.id)}
                    className="min-w-[80px]"
                  >
                    {executingSignals.has(signal.id) ? (
                      "Executing..."
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Live Trading Signals</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLiveSignals}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="whitelist" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Whitelist ({whitelistSignals.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            All Signals ({allSignals.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="whitelist" className="mt-4">
          {renderSignalsList(whitelistSignals, 'whitelist')}
          <div className="bg-muted/50 rounded-lg p-3 mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Whitelist Mode
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Curated selection of 8 premium symbols</li>
              <li>• Higher signal quality and reliability</li>
              <li>• Faster processing and lower latency</li>
              <li>• Optimized for consistent performance</li>
            </ul>
          </div>
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
          {renderSignalsList(allSignals, 'all')}
          <div className="bg-muted/50 rounded-lg p-3 mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              All Signals Mode
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Complete market coverage (~2000+ symbols)</li>
              <li>• Access to emerging opportunities</li>
              <li>• Comprehensive market analysis</li>
              <li>• More signals, higher variety</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveSignalsPanel;