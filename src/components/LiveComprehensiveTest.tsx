import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { PlayCircle, CheckCircle, AlertCircle, BarChart3, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface TestResults {
  success: boolean;
  comprehensiveSignals: number;
  newAlgorithmSignals: number;
  totalGenerated: number;
  testPassed: boolean;
  avgScore?: number;
  uniqueSymbols?: number;
  topSignals?: any[];
}

export const LiveComprehensiveTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [liveStats, setLiveStats] = useState({
    totalSignals: 0,
    comprehensiveSignals: 0,
    newAlgoSignals: 0,
    recentSignals: 0,
    lastUpdate: new Date().toISOString()
  });

  const updateLiveStats = async () => {
    try {
      const { data: signals, error } = await supabase
        .from('signals')
        .select('source, algo, score, created_at, symbol, direction')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        totalSignals: signals.length,
        comprehensiveSignals: signals.filter(s => s.source === 'all_symbols_comprehensive').length,
        newAlgoSignals: signals.filter(s => s.algo === 'aitradex1_comprehensive_v4').length,
        recentSignals: signals.filter(s => new Date(s.created_at) > new Date(Date.now() - 5 * 60 * 1000)).length,
        lastUpdate: new Date().toISOString()
      };
      
      setLiveStats(stats);
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('Initializing comprehensive scanner test...');
    setTestResults(null);

    try {
      // Step 1: Get baseline
      setCurrentStep('Getting baseline signal counts...');
      setProgress(10);
      await updateLiveStats();

      // Step 2: Trigger scanner
      setCurrentStep('Triggering comprehensive all-symbols scanner...');
      setProgress(30);
      
      toast.info('🚀 Starting comprehensive scanner - this will scan 2000+ symbols');

      const { data: scanResult, error: scanError } = await supabase.functions.invoke('all-symbols-scanner', {
        body: { 
          mode: 'comprehensive',
          trigger: 'live_test_execution',
          scan_all_symbols: true,
          advanced_ai: true,
          force_execution: true,
          exchanges: ['bybit', 'binance', 'coinex']
        }
      });

      if (scanError) throw scanError;
      
      setProgress(60);
      setCurrentStep('Scanner executed, waiting for signal generation...');
      console.log('Scanner result:', scanResult);

      // Step 3: Wait for processing
      await new Promise(resolve => setTimeout(resolve, 8000));
      setProgress(80);
      setCurrentStep('Checking for new comprehensive signals...');

      // Step 4: Check results
      const { data: comprehensiveSignals } = await supabase
        .from('signals')
        .select('*')
        .eq('source', 'all_symbols_comprehensive')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: algoSignals } = await supabase
        .from('signals')
        .select('*')
        .eq('algo', 'aitradex1_comprehensive_v4')
        .order('created_at', { ascending: false })
        .limit(100);

      setProgress(90);
      setCurrentStep('Analyzing results...');

      // Step 5: Analyze results
      const allNewSignals = [...(comprehensiveSignals || []), ...(algoSignals || [])];
      const results: TestResults = {
        success: scanResult?.success || false,
        comprehensiveSignals: comprehensiveSignals?.length || 0,
        newAlgorithmSignals: algoSignals?.length || 0,
        totalGenerated: scanResult?.signalsGenerated || 0,
        testPassed: (comprehensiveSignals?.length || 0) > 0 || (algoSignals?.length || 0) > 0
      };

      if (allNewSignals.length > 0) {
        results.avgScore = allNewSignals.reduce((sum, s) => sum + (s.score || 0), 0) / allNewSignals.length;
        results.uniqueSymbols = new Set(allNewSignals.map(s => s.symbol)).size;
        results.topSignals = allNewSignals
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 5);
      }

      setProgress(100);
      setCurrentStep('Test completed!');
      setTestResults(results);
      await updateLiveStats();

      if (results.testPassed) {
        toast.success(`✅ Success! Generated ${results.comprehensiveSignals + results.newAlgorithmSignals} new comprehensive signals`);
      } else {
        toast.warning('⚠️ Scanner completed but no comprehensive signals found');
      }

    } catch (error) {
      console.error('Test failed:', error);
      toast.error('❌ Comprehensive test failed');
      setTestResults({ 
        success: false, 
        comprehensiveSignals: 0, 
        newAlgorithmSignals: 0, 
        totalGenerated: 0,
        testPassed: false
      });
      setCurrentStep('Test failed');
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  useEffect(() => {
    updateLiveStats();
    const interval = setInterval(updateLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Live Comprehensive Scanner Test
          </CardTitle>
          <CardDescription>
            Full test of the 2000+ symbol comprehensive scanner with real-time monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{liveStats.totalSignals}</div>
              <div className="text-sm text-muted-foreground">Total (1h)</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{liveStats.comprehensiveSignals}</div>
              <div className="text-sm text-muted-foreground">Comprehensive</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{liveStats.newAlgoSignals}</div>
              <div className="text-sm text-muted-foreground">New Algorithm</div>
            </div>
            <div className="text-center p-3 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{liveStats.recentSignals}</div>
              <div className="text-sm text-muted-foreground">Recent (5m)</div>
            </div>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Test Button */}
          <Button 
            onClick={runComprehensiveTest}
            disabled={isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Running Comprehensive Test...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Execute Full Comprehensive Test
              </>
            )}
          </Button>

          {/* Test Results */}
          {testResults && (
            <Alert className={testResults.testPassed ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"}>
              <div className="flex items-center gap-2">
                {testResults.testPassed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">
                  Test {testResults.testPassed ? 'PASSED' : 'WARNING'}
                </span>
              </div>
              <AlertDescription className="mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Results Summary:</div>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Comprehensive signals: <Badge variant="outline">{testResults.comprehensiveSignals}</Badge></li>
                      <li>New algorithm signals: <Badge variant="outline">{testResults.newAlgorithmSignals}</Badge></li>
                      <li>Total generated: <Badge variant="outline">{testResults.totalGenerated}</Badge></li>
                      {testResults.avgScore && <li>Average score: <Badge variant="outline">{testResults.avgScore.toFixed(1)}%</Badge></li>}
                      {testResults.uniqueSymbols && <li>Unique symbols: <Badge variant="outline">{testResults.uniqueSymbols}</Badge></li>}
                    </ul>
                  </div>
                  {testResults.topSignals && testResults.topSignals.length > 0 && (
                    <div>
                      <div className="font-medium">Top Signals:</div>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {testResults.topSignals.map((signal, i) => (
                          <li key={i} className="text-xs">
                            {signal.symbol} {signal.direction} - {signal.score}%
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
            <strong>What this test does:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Triggers the all-symbols-scanner function with comprehensive mode</li>
              <li>Scans 2000+ cryptocurrency pairs across Bybit, Binance, and CoinEx</li>
              <li>Uses the new aitradex1_comprehensive_v4 algorithm</li>
              <li>Generates signals with "all_symbols_comprehensive" source</li>
              <li>Monitors results in real-time and shows success/failure</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};