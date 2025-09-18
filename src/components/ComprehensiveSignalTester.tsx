import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface SignalStats {
  totalSignals: number;
  comprehensiveSignals: number;
  newAlgoSignals: number;
  recentSignals: number;
  topSymbols: Array<{ symbol: string; count: number }>;
}

interface TestProgress {
  step: string;
  progress: number;
  status: 'running' | 'complete' | 'error';
}

export const ComprehensiveSignalTester: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [stats, setStats] = useState<SignalStats>({
    totalSignals: 0,
    comprehensiveSignals: 0,
    newAlgoSignals: 0,
    recentSignals: 0,
    topSymbols: []
  });
  const [testProgress, setTestProgress] = useState<TestProgress>({
    step: 'Ready',
    progress: 0,
    status: 'complete'
  });
  const [testResults, setTestResults] = useState<any>(null);

  // Fetch current signal statistics
  const fetchStats = async () => {
    try {
      // Total signals
      const { data: totalData } = await supabase
        .from('signals')
        .select('id', { count: 'exact' });

      // Comprehensive signals
      const { data: comprehensiveData } = await supabase
        .from('signals')
        .select('id', { count: 'exact' })
        .eq('source', 'all_symbols_comprehensive');

      // New algorithm signals
      const { data: newAlgoData } = await supabase
        .from('signals')
        .select('id', { count: 'exact' })
        .eq('algo', 'aitradex1_comprehensive_v4');

      // Recent signals (last hour)
      const { data: recentData } = await supabase
        .from('signals')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      // Top symbols from comprehensive signals
      const { data: symbolData } = await supabase
        .from('signals')
        .select('symbol')
        .eq('source', 'all_symbols_comprehensive')
        .limit(100);

      const symbolCounts = symbolData?.reduce((acc: any, signal: any) => {
        acc[signal.symbol] = (acc[signal.symbol] || 0) + 1;
        return acc;
      }, {}) || {};

      const topSymbols = Object.entries(symbolCounts)
        .map(([symbol, count]) => ({ symbol, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalSignals: totalData?.length || 0,
        comprehensiveSignals: comprehensiveData?.length || 0,
        newAlgoSignals: newAlgoData?.length || 0,
        recentSignals: recentData?.length || 0,
        topSymbols
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Run comprehensive test
  const runComprehensiveTest = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      // Step 1: Get baseline
      setTestProgress({ step: 'Getting baseline signal counts...', progress: 10, status: 'running' });
      const baselineStats = { ...stats };
      
      // Step 2: Trigger comprehensive scanner
      setTestProgress({ step: 'Triggering comprehensive all-symbols scanner...', progress: 30, status: 'running' });
      
      const { data: scanResult, error: scanError } = await supabase.functions.invoke('all-symbols-scanner', {
        body: {
          mode: 'comprehensive',
          trigger: 'full_test_verification',
          scan_all_symbols: true,
          advanced_ai: true,
          force_scan: true,
          exchanges: ['bybit', 'binance', 'coinex']
        }
      });

      if (scanError) {
        throw new Error(`Scanner error: ${scanError.message}`);
      }

      setTestProgress({ step: 'Scanner triggered, waiting for processing...', progress: 50, status: 'running' });
      
      // Step 3: Wait for processing
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Step 4: Check for new signals
      setTestProgress({ step: 'Analyzing new signals...', progress: 70, status: 'running' });
      
      // Refresh stats
      await fetchStats();
      
      // Step 5: Verify comprehensive signals
      setTestProgress({ step: 'Verifying comprehensive signal generation...', progress: 90, status: 'running' });
      
      const { data: newComprehensiveSignals } = await supabase
        .from('signals')
        .select('*')
        .eq('source', 'all_symbols_comprehensive')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: newAlgoSignals } = await supabase
        .from('signals')
        .select('*')
        .eq('algo', 'aitradex1_comprehensive_v4')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      const testResults = {
        scannerResponse: scanResult,
        newComprehensiveSignals: newComprehensiveSignals?.length || 0,
        newAlgoSignals: newAlgoSignals?.length || 0,
        sampleSignals: newComprehensiveSignals?.slice(0, 3) || [],
        symbolsScanned: scanResult?.symbolsScanned || 0,
        exchangesScanned: scanResult?.exchanges || [],
        success: (newComprehensiveSignals?.length || 0) > 0
      };

      setTestResults(testResults);
      setTestProgress({ step: 'Test complete!', progress: 100, status: 'complete' });
      
      if (testResults.success) {
        toast.success(`✅ Success! Generated ${testResults.newComprehensiveSignals} comprehensive signals`);
      } else {
        toast.error('❌ No comprehensive signals generated');
      }

    } catch (error) {
      console.error('Test failed:', error);
      setTestProgress({ step: `Error: ${error.message}`, progress: 0, status: 'error' });
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔬 Comprehensive Scanner Test & Verification
        </CardTitle>
        <CardDescription>
          Full test of the all-symbols comprehensive scanner with real-time monitoring
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalSignals.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Signals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.comprehensiveSignals}</div>
            <div className="text-sm text-muted-foreground">Comprehensive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.newAlgoSignals}</div>
            <div className="text-sm text-muted-foreground">New Algorithm</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.recentSignals}</div>
            <div className="text-sm text-muted-foreground">Recent (1h)</div>
          </div>
        </div>

        {/* Test Progress */}
        {testing && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{testProgress.step}</span>
              <span className="text-sm text-muted-foreground">{testProgress.progress}%</span>
            </div>
            <Progress value={testProgress.progress} className="w-full" />
          </div>
        )}

        {/* Test Button */}
        <div className="flex justify-center">
          <Button
            onClick={runComprehensiveTest}
            disabled={testing}
            size="lg"
            className="px-8"
          >
            {testing ? '🔄 Testing in Progress...' : '🚀 Run Full Comprehensive Test'}
          </Button>
        </div>

        {/* Test Results */}
        {testResults && (
          <Alert className={testResults.success ? 'border-green-500' : 'border-yellow-500'}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">
                  {testResults.success ? '✅ Test Successful!' : '⚠️ Test Completed with Issues'}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Scanner Success: <Badge variant={testResults.scannerResponse?.success ? 'default' : 'destructive'}>
                    {testResults.scannerResponse?.success ? 'YES' : 'NO'}
                  </Badge></div>
                  <div>Symbols Scanned: <Badge variant="outline">{testResults.symbolsScanned}</Badge></div>
                  <div>Comprehensive Signals: <Badge variant="outline">{testResults.newComprehensiveSignals}</Badge></div>
                  <div>New Algorithm Signals: <Badge variant="outline">{testResults.newAlgoSignals}</Badge></div>
                </div>
                
                {testResults.sampleSignals.length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium mb-2">Sample New Signals:</div>
                    {testResults.sampleSignals.map((signal: any, i: number) => (
                      <div key={i} className="text-xs bg-muted p-2 rounded mb-1">
                        {signal.symbol} {signal.direction} - Score: {signal.score}% ({signal.algo})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Top Symbols */}
        {stats.topSymbols.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Top Comprehensive Signals by Symbol:</h4>
            <div className="flex flex-wrap gap-2">
              {stats.topSymbols.map((item, i) => (
                <Badge key={i} variant="outline">
                  {item.symbol} ({item.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};