import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Signal {
  id: string;
  symbol: string;
  timeframe: string;
  direction: string;
  score: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  created_at: string;
  source: string;
  metadata?: any;
}

export function FullMarketSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState(70);
  const [showOnlyRecent, setShowOnlyRecent] = useState(true);
  const { toast } = useToast();

  const loadAllSignals = async () => {
    try {
      setLoading(true);
      
      // Get signals from last 24 hours with score >= minScore
      const timeFilter = showOnlyRecent 
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days if not recent only

      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .gte('score', minScore)
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false })
        .limit(2000); // Get up to 2000 signals

      if (error) {
        throw error;
      }

      setSignals(data || []);
      console.log(`Loaded ${data?.length || 0} signals from full market`);
      
      if (data && data.length > 0) {
        toast({
          title: "Signals Loaded",
          description: `Loaded ${data.length} signals from the full market`,
        });
      }
    } catch (error) {
      console.error('Error loading signals:', error);
      toast({
        title: "Error",
        description: "Failed to load market signals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerSignalGeneration = async () => {
    try {
      setLoading(true);
      toast({
        title: "Generating Signals",
        description: "Starting comprehensive signal generation...",
      });

      // Trigger the live signal orchestrator
      const { data, error } = await supabase.functions.invoke('live-signal-orchestrator', {
        body: { comprehensive: true }
      });

      if (error) {
        throw error;
      }

      console.log('Signal generation triggered:', data);
      
      // Wait a moment then reload signals
      setTimeout(() => {
        loadAllSignals();
      }, 3000);

      toast({
        title: "Signal Generation Started",
        description: "New signals will appear shortly...",
      });
    } catch (error) {
      console.error('Error triggering signal generation:', error);
      toast({
        title: "Error",
        description: "Failed to trigger signal generation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter signals based on search and criteria
  useEffect(() => {
    let filtered = signals;

    if (searchTerm) {
      filtered = filtered.filter(signal => 
        signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSignals(filtered);
  }, [signals, searchTerm]);

  useEffect(() => {
    loadAllSignals();
  }, [minScore, showOnlyRecent]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'LONG' || direction === 'BUY' ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  // Group signals by symbol for better display
  const signalsBySymbol = filteredSignals.reduce((acc, signal) => {
    if (!acc[signal.symbol]) {
      acc[signal.symbol] = [];
    }
    acc[signal.symbol].push(signal);
    return acc;
  }, {} as Record<string, Signal[]>);

  const uniqueSymbols = Object.keys(signalsBySymbol).length;
  const totalSignals = filteredSignals.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Full Market Signals ({uniqueSymbols} symbols, {totalSignals} signals)</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={triggerSignalGeneration}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Generate New
              </Button>
              <Button
                onClick={loadAllSignals}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search symbols or sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Min Score:</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showOnlyRecent}
                onCheckedChange={setShowOnlyRecent}
              />
              <label className="text-sm">Last 24h only</label>
            </div>
          </div>

          {/* Signals Display */}
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading signals...</p>
            </div>
          ) : totalSignals === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No signals found matching your criteria</p>
              <Button onClick={triggerSignalGeneration} className="mt-4">
                Generate New Signals
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(signalsBySymbol).map(([symbol, symbolSignals]) => (
                <Card key={symbol} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{symbol}</h3>
                    <Badge variant="outline">{symbolSignals.length} signals</Badge>
                  </div>
                  <div className="space-y-2">
                    {symbolSignals.slice(0, 3).map((signal) => (
                      <div key={signal.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(signal.direction)}
                          <span className="text-sm">{signal.timeframe}</span>
                          <Badge className={`text-xs ${getScoreColor(signal.score)}`}>
                            {signal.score}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${signal.entry_price.toFixed(4)}
                        </div>
                      </div>
                    ))}
                    {symbolSignals.length > 3 && (
                      <div className="text-xs text-center text-muted-foreground">
                        +{symbolSignals.length - 3} more signals
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}