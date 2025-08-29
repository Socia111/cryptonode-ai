import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import StatusChip from '@/components/StatusChip';
import { Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScannerSignal {
  id: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  confidence_score: number;
  price: number;
  indicators: {
    ema21: number;
    sma200: number;
    adx: number;
    di_plus: number;
    di_minus: number;
    stoch_k: number;
    stoch_d: number;
    rsi: number;
    hvp: number;
    vol_spike: boolean;
    spread_pct: number;
  };
  generated_at: string;
}

const ScannerDashboard = () => {
  const [signals, setSignals] = useState<ScannerSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState('bybit');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [sortBy, setSortBy] = useState<'confidence_score' | 'symbol' | 'generated_at'>('confidence_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const fetchSignals = async (showPast24Hours: boolean = false) => {
    try {
      if (!showPast24Hours) {
        // Try new signals API first for recent data
        try {
          const response = await supabase.functions.invoke('signals-api', {
            body: { path: '/signals/live' }
          });
          
          if (response.data?.success) {
            setSignals(response.data.live_signals || []);
            setLastUpdate(new Date().toLocaleString());
            return;
          }
        } catch (apiError) {
          console.warn('API call failed, falling back to direct DB query:', apiError);
        }
      }
      
      // Query database - show past 24h when scan is triggered, otherwise recent signals
      let query = supabase
        .from('signals')
        .select('*')
        .eq('status', 'active')
        .order('generated_at', { ascending: false });

      if (showPast24Hours) {
        // Show all signals from past 24 hours when "Scan Now" is pressed
        const past24Hours = new Date();
        past24Hours.setHours(past24Hours.getHours() - 24);
        query = query.gte('generated_at', past24Hours.toISOString());
      } else {
        query = query.limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map database signals to scanner format
      const mappedSignals = (data || []).map(signal => ({
        id: signal.id,
        symbol: signal.symbol,
        exchange: signal.exchange || 'bybit',
        direction: signal.direction,
        confidence_score: signal.confidence_score || signal.score || 0,
        price: signal.entry_price || 0,
        timeframe: signal.timeframe,
        generated_at: signal.generated_at || signal.created_at,
        indicators: signal.metadata?.indicators || {}
      }));

      setSignals(mappedSignals);
      setLastUpdate(new Date().toLocaleString());
    } catch (error) {
      console.error('Error fetching signals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch scanner signals",
        variant: "destructive",
      });
    }
  };

  const runScan = async () => {
    setLoading(true);
    try {
      // Trigger live scanner production for comprehensive scan
      const { data, error } = await supabase.functions.invoke('live-scanner-production', {
        body: { 
          exchange: selectedExchange, 
          timeframe: selectedTimeframe,
          relaxed_filters: true,
          symbols: [] // Scan all available symbols
        }
      });

      if (error) throw error;

      toast({
        title: "Live Scan Complete",
        description: `AItradeX1 scan finished - ${data?.signals_found || 0} signals found`,
      });

      // After scan, fetch signals from past 24 hours to show comprehensive results
      await fetchSignals(true);
    } catch (error) {
      console.error('Error running scan:', error);
      toast({
        title: "Scan Failed", 
        description: "Failed to run market scan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals(false); // Load recent signals initially
    
    // Auto-refresh every 2 minutes to show new signals
    const interval = setInterval(() => fetchSignals(false), 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const sortedSignals = [...signals].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return sortDir === 'asc' 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            AItradeX1 Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex gap-2">
              <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="binance">Binance</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5m</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="30m">30m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="4h">4h</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={runScan} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Scan Now
            </Button>
            
            {lastUpdate && (
              <span className="text-sm text-muted-foreground">
                Last updated: {lastUpdate} — {signals.length} signals
              </span>
            )}
          </div>

          {signals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active signals found. Run a scan to generate new signals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th 
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('confidence_score')}
                    >
                      Score {sortBy === 'confidence_score' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-left p-3">Direction</th>
                    <th 
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol {sortBy === 'symbol' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-left p-3">Price</th>
                    <th className="text-left p-3">ADX</th>
                    <th className="text-left p-3">HVP</th>
                    <th className="text-left p-3">%K</th>
                    <th className="text-left p-3">RSI</th>
                    <th className="text-left p-3">Vol Spike</th>
                    <th 
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('generated_at')}
                    >
                      Age {sortBy === 'generated_at' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSignals.map((signal) => (
                    <tr key={signal.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Badge variant="outline" className="font-bold">
                          {signal.confidence_score.toFixed(1)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <StatusChip 
                          type={signal.direction === 'LONG' ? 'long' : 'short'}
                          showIcon={true}
                        >
                          {signal.direction}
                        </StatusChip>
                      </td>
                      <td className="p-3 font-mono">
                        <div>
                          <div className="font-semibold">{signal.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {signal.exchange}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        ${signal.price.toFixed(6)}
                      </td>
                      <td className="p-3">
                        {signal.indicators.adx?.toFixed(1) || '-'}
                      </td>
                      <td className="p-3">
                        {signal.indicators.hvp?.toFixed(1) || '-'}
                      </td>
                      <td className="p-3">
                        {signal.indicators.stoch_k?.toFixed(1) || '-'}
                      </td>
                      <td className="p-3">
                        {signal.indicators.rsi?.toFixed(1) || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {signal.indicators.vol_spike ? '✅' : '-'}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(signal.generated_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScannerDashboard;