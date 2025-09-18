import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Play, CheckCircle, AlertCircle } from 'lucide-react';

interface ScanResult {
  totalSymbolsScanned?: number;
  marketDataPoints?: number;
  signalsGenerated?: number;
  exchanges?: string[];
  success?: boolean;
  message?: string;
}

interface SignalStats {
  source: string;
  algo: string;
  total_signals: number;
  unique_symbols: number;
  first_signal: string;
  last_signal: string;
}

export function ComprehensiveTestPanel() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [signalStats, setSignalStats] = useState<SignalStats[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const triggerComprehensiveScanner = async () => {
    setIsScanning(true);
    setProgress(0);
    setScanResult(null);
    
    try {
      toast({
        title: "🚀 Starting Comprehensive Scanner",
        description: "Triggering scan of 2000+ symbols across all exchanges...",
      });

      setProgress(20);

      // Trigger the all-symbols-scanner
      const { data, error } = await supabase.functions.invoke('all-symbols-scanner', {
        body: { comprehensive: true, mode: 'production' }
      });

      setProgress(50);

      if (error) {
        throw new Error(error.message || 'Scanner failed');
      }

      setScanResult(data);
      setProgress(80);

      // Wait for signals to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Fetch updated signal statistics
      await fetchSignalStats();
      setProgress(100);

      toast({
        title: "✅ Comprehensive Scanner Completed",
        description: `Scanned ${data?.totalSymbolsScanned || 'Unknown'} symbols, generated ${data?.signalsGenerated || 0} signals`,
      });

    } catch (error) {
      console.error('Scanner error:', error);
      toast({
        title: "❌ Scanner Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const fetchSignalStats = async () => {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('source, algo, symbol, created_at')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if (error) throw error;

      // Group by source/algo
      const stats: { [key: string]: SignalStats } = {};
      
      data?.forEach(signal => {
        const key = `${signal.source}/${signal.algo}`;
        if (!stats[key]) {
          stats[key] = {
            source: signal.source,
            algo: signal.algo,
            total_signals: 0,
            unique_symbols: 0,
            first_signal: signal.created_at,
            last_signal: signal.created_at
          };
        }
        stats[key].total_signals++;
        if (signal.created_at < stats[key].first_signal) {
          stats[key].first_signal = signal.created_at;
        }
        if (signal.created_at > stats[key].last_signal) {
          stats[key].last_signal = signal.created_at;
        }
      });

      // Calculate unique symbols for each source/algo
      Object.keys(stats).forEach(key => {
        const [source, algo] = key.split('/');
        const symbolsForThisCombo = new Set(
          data?.filter(s => s.source === source && s.algo === algo)
               .map(s => s.symbol) || []
        );
        stats[key].unique_symbols = symbolsForThisCombo.size;
      });

      setSignalStats(Object.values(stats).sort((a, b) => b.total_signals - a.total_signals));

    } catch (error) {
      console.error('Error fetching signal stats:', error);
    }
  };

  React.useEffect(() => {
    fetchSignalStats();
  }, []);

  const getSourceColor = (source: string) => {
    if (source === 'all_symbols_comprehensive') return 'default';
    if (source === 'aitradex1_advanced') return 'secondary';
    if (source === 'aitradex1_real_enhanced') return 'outline';
    return 'destructive';
  };

  const isComprehensive = (stats: SignalStats) => {
    return stats.source === 'all_symbols_comprehensive' || 
           stats.algo === 'aitradex1_comprehensive_v4' ||
           stats.unique_symbols > 20;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Comprehensive Scanner Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={triggerComprehensiveScanner}
              disabled={isScanning}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Play className="h-4 w-4 mr-2" />
              {isScanning ? 'Scanning...' : 'Trigger Comprehensive Scanner'}
            </Button>
            
            <Button 
              onClick={fetchSignalStats}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>

          {isScanning && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Scanning progress:</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {scanResult && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Scan Results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Symbols Scanned</div>
                    <div className="font-medium">{scanResult.totalSymbolsScanned || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Market Data Points</div>
                    <div className="font-medium">{scanResult.marketDataPoints || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Signals Generated</div>
                    <div className="font-medium">{scanResult.signalsGenerated || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Exchanges</div>
                    <div className="font-medium">{scanResult.exchanges?.join(', ') || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Signal Statistics (Last 10 minutes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signalStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent signals found
            </div>
          ) : (
            <div className="space-y-4">
              {signalStats.map((stats, index) => (
                <div key={`${stats.source}/${stats.algo}`} 
                     className={`p-4 rounded-lg border ${isComprehensive(stats) ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={getSourceColor(stats.source)}>
                        {stats.source}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {stats.algo}
                      </Badge>
                      {isComprehensive(stats) && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          ✅ COMPREHENSIVE
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{stats.total_signals} signals</span>
                      <span className="text-xs text-muted-foreground">
                        {stats.unique_symbols} symbols
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Latest: {new Date(stats.last_signal).toLocaleTimeString()}
                  </div>
                  
                  {stats.unique_symbols > 8 && (
                    <div className="mt-2">
                      <Badge variant="default" className="text-xs bg-blue-600">
                        🎯 DIVERSE: {stats.unique_symbols} unique symbols
                      </Badge>
                    </div>
                  )}
                  
                  {stats.unique_symbols <= 8 && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs text-amber-600">
                        ⚠️ LIMITED: Only {stats.unique_symbols} symbols
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}