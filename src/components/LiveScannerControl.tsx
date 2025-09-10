import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Play, Square, Zap, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LiveScannerControlProps {
  onSignalGenerated?: (signal: any) => void;
}

const LiveScannerControl = ({ onSignalGenerated }: LiveScannerControlProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [timeframe, setTimeframe] = useState('15m');
  const [relaxedMode, setRelaxedMode] = useState(false);
  const [lastScanResults, setLastScanResults] = useState<any>(null);
  const [scanInterval, setScanInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for new signals in real-time
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
          console.log('🔔 New signal detected:', payload.new);
          toast({
            title: "🚨 New Signal Generated",
            description: `${payload.new.symbol} ${payload.new.direction} - Score: ${payload.new.score}%`,
          });
          onSignalGenerated?.(payload.new);
        }
      )
      .subscribe();

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      supabase.removeChannel(channel);
    };
  }, [onSignalGenerated, scanInterval]);

  const runScan = async () => {
    setIsScanning(true);
    try {
      console.log(`🔍 Starting live scan: tf=${timeframe}, relaxed=${relaxedMode}`);
      
      const { data, error } = await supabase.functions.invoke('live-scanner-production', {
        body: {
          timeframe,
          relaxed_filters: relaxedMode,
          // Let scanner fetch all active USDT pairs
        }
      });

      if (error) throw error;

      if (data.success) {
        setLastScanResults(data);
        toast({
          title: "✅ Scan Complete",
          description: `Found ${data.signals_found} new signals from ${data.symbols_scanned} symbols`,
        });
      } else {
        throw new Error(data.error || 'Scan failed');
      }
    } catch (error: any) {
      console.error('Scanner error:', error);
      toast({
        title: "❌ Scan Failed",
        description: error.message || "Failed to run live scanner",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleAutoScan = () => {
    const newAutoScan = !autoScan;
    setAutoScan(newAutoScan);

    if (newAutoScan) {
      // Start auto-scanning every 5 minutes
      const interval = setInterval(runScan, 5 * 60 * 1000);
      setScanInterval(interval);
      
      // Run first scan immediately
      runScan();
      
      toast({
        title: "🔄 Auto-Scan Enabled",
        description: "Live scanner will run every 5 minutes",
      });
    } else {
      // Stop auto-scanning
      if (scanInterval) {
        clearInterval(scanInterval);
        setScanInterval(null);
      }
      
      toast({
        title: "⏸️ Auto-Scan Disabled",
        description: "Live scanner stopped",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Live Signal Scanner
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Real-time signal generation using Bybit live data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={autoScan ? "default" : "secondary"} className="flex items-center gap-1">
              {autoScan ? (
                <>
                  <Activity className="h-3 w-3" />
                  Live
                </>
              ) : (
                <>
                  <Square className="h-3 w-3" />
                  Manual
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scanner Controls */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Timeframe</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="2h">2 hours</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="relaxed-mode"
              checked={relaxedMode}
              onCheckedChange={setRelaxedMode}
            />
            <label htmlFor="relaxed-mode" className="text-sm font-medium">
              Relaxed Mode
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-scan"
              checked={autoScan}
              onCheckedChange={toggleAutoScan}
            />
            <label htmlFor="auto-scan" className="text-sm font-medium">
              Auto-Scan (5 min)
            </label>
          </div>
        </div>

        {/* Manual Scan Button */}
        <div className="flex justify-center">
          <Button 
            onClick={runScan}
            disabled={isScanning}
            size="lg"
            className="min-w-[200px]"
          >
            {isScanning ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Scan Now
              </>
            )}
          </Button>
        </div>

        {/* Last Scan Results */}
        {lastScanResults && (
          <div className="border rounded-lg p-4 bg-muted/20">
            <h4 className="font-medium mb-2">Last Scan Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-primary">{lastScanResults.symbols_scanned}</p>
                <p className="text-xs text-muted-foreground">Symbols Scanned</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">{lastScanResults.signals_found}</p>
                <p className="text-xs text-muted-foreground">Signals Found</p>
              </div>
              <div>
                <p className="text-lg font-bold">{lastScanResults.timeframe}</p>
                <p className="text-xs text-muted-foreground">Timeframe</p>
              </div>
              <div>
                <p className="text-lg font-bold">
                  {new Date(lastScanResults.timestamp).toLocaleTimeString()}
                </p>
                <p className="text-xs text-muted-foreground">Last Scan</p>
              </div>
            </div>
            
            {lastScanResults.results?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Latest Signals:</p>
                <div className="space-y-1">
                  {lastScanResults.results.slice(0, 3).map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{result.symbol}</span>
                      <Badge variant={result.direction === 'LONG' ? 'default' : 'destructive'} className="text-xs">
                        {result.direction}
                      </Badge>
                      <span className="text-muted-foreground">{result.score.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveScannerControl;