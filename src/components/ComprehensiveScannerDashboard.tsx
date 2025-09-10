import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, RotateCcw, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ScanStatus {
  is_running: boolean;
  total_symbols: number;
  processed_symbols: number;
  signals_generated: number;
  last_scan: string;
  estimated_completion: string;
}

interface ScanResult {
  success: boolean;
  total_symbols_scanned: number;
  signals_generated: number;
  symbols_found: number;
  timestamp: string;
}

const ComprehensiveScannerDashboard = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const { toast } = useToast();

  const fetchScanStatus = async () => {
    try {
      // Check if a scan is currently running by looking at signals_state
      const { data: scanState, error } = await supabase
        .from('signals_state')
        .select('*')
        .eq('symbol', 'COMPREHENSIVE_SCAN')
        .eq('direction', 'SCAN_STARTED')
        .order('last_emitted', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching scan status:', error);
        return;
      }

      if (scanState && scanState.length > 0) {
        const lastScan = new Date(scanState[0].last_emitted);
        const timeSinceLastScan = Date.now() - lastScan.getTime();
        
        // Consider scan running if started within last 30 minutes
        const isCurrentlyRunning = timeSinceLastScan < 30 * 60 * 1000;
        
        setIsScanning(isCurrentlyRunning);
        
        if (isCurrentlyRunning) {
          // Estimate progress based on time elapsed (assuming 30 min total scan time)
          const progress = Math.min((timeSinceLastScan / (30 * 60 * 1000)) * 100, 95);
          setScanProgress(progress);
        }
      }

      // Get count of total signals for today
      const today = new Date().toISOString().split('T')[0];
      const { count: todaySignals } = await supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setScanStatus({
        is_running: isScanning,
        total_symbols: 0,
        processed_symbols: 0,
        signals_generated: todaySignals || 0,
        last_scan: scanState?.[0]?.last_emitted || '',
        estimated_completion: ''
      });

    } catch (error) {
      console.error('Error fetching scan status:', error);
    }
  };

  const startComprehensiveScan = async () => {
    try {
      setIsScanning(true);
      setScanProgress(0);
      
      toast({
        title: "🚀 Starting Comprehensive Scan",
        description: "Scanning all Bybit trading pairs for signals...",
      });

      const response = await supabase.functions.invoke('trigger-comprehensive-scan', {
        body: {
          batch_size: 25,
          timeframes: ['5', '15'],
          force_scan: true
        }
      });

      if (response.error) {
        throw response.error;
      }

      setLastScanResult(response.data?.scan_result);
      
      toast({
        title: "✅ Scan Initiated",
        description: "Comprehensive scan has been started successfully.",
      });

      // Start progress monitoring
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 1;
        });
      }, 10000); // Update every 10 seconds

      // Check completion after 30 minutes
      setTimeout(() => {
        clearInterval(progressInterval);
        setIsScanning(false);
        setScanProgress(100);
        fetchScanStatus();
        toast({
          title: "🎯 Scan Complete",
          description: "Comprehensive scan has finished processing all symbols.",
        });
      }, 30 * 60 * 1000);

    } catch (error) {
      console.error('Error starting scan:', error);
      setIsScanning(false);
      toast({
        title: "❌ Scan Failed",
        description: error.message || "Failed to start comprehensive scan",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchScanStatus();
    const interval = setInterval(fetchScanStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const time = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return time.toLocaleDateString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Comprehensive Bybit Scanner
            </CardTitle>
            <CardDescription>
              Scan all Bybit trading pairs for AItradeX1 signals
            </CardDescription>
          </div>
          <Button 
            onClick={startComprehensiveScan}
            disabled={isScanning}
            className="flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <Pause className="h-4 w-4" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Full Scan
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scanner Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {isScanning ? (
                          <>
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <Badge variant="secondary">Running</Badge>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <Badge variant="outline">Idle</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Signals Today</p>
                    <p className="text-2xl font-bold mt-1">{scanStatus?.signals_generated || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Scan</p>
                    <p className="text-sm mt-1">{formatTimeAgo(scanStatus?.last_scan || '')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {isScanning ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Scan Progress</span>
                    <span>{Math.round(scanProgress)}%</span>
                  </div>
                  <Progress value={scanProgress} className="w-full" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Estimated Time Remaining:</span>
                    <div className="font-medium">
                      {Math.max(0, 30 - Math.floor(scanProgress / 100 * 30))} minutes
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Processing:</span>
                    <div className="font-medium">All USDT pairs</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Scanning all available Bybit trading pairs. This process takes approximately 30 minutes.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No scan currently running</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Start Full Scan" to begin comprehensive analysis
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {lastScanResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{lastScanResult.symbols_found}</p>
                        <p className="text-sm text-muted-foreground">Symbols Found</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{lastScanResult.total_symbols_scanned}</p>
                        <p className="text-sm text-muted-foreground">Symbols Scanned</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{lastScanResult.signals_generated}</p>
                        <p className="text-sm text-muted-foreground">Signals Generated</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {lastScanResult.total_symbols_scanned > 0 
                            ? Math.round((lastScanResult.signals_generated / lastScanResult.total_symbols_scanned) * 100)
                            : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Last Scan Completed</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(lastScanResult.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Success
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No scan results available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Run a comprehensive scan to see detailed results
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ComprehensiveScannerDashboard;