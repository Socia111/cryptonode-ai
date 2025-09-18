import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { PlayCircle, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface ScannerTestResults {
  success: boolean;
  comprehensiveSignals: number;
  newAlgorithmSignals: number;
  totalGenerated: number;
  exchanges?: string[];
  timestamp?: string;
}

export const ComprehensiveScannerTest = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [testResults, setTestResults] = useState<ScannerTestResults | null>(null);
  const [currentStats, setCurrentStats] = useState({
    totalSignals: 0,
    comprehensiveSignals: 0,
    newLogicSignals: 0,
    recentSignals: 0
  });

  // Get current signal stats
  const fetchCurrentStats = async () => {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      if (error) throw error;

      const stats = {
        totalSignals: data.length,
        comprehensiveSignals: data.filter(s => s.source === 'all_symbols_comprehensive').length,
        newLogicSignals: data.filter(s => s.algo === 'aitradex1_comprehensive_v4').length,
        recentSignals: data.filter(s => new Date(s.created_at) > new Date(Date.now() - 5 * 60 * 1000)).length
      };
      
      setCurrentStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Trigger comprehensive scanner
  const triggerComprehensiveScanner = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setTestResults(null);

    try {
      toast.info('🚀 Starting comprehensive scanner...');
      setScanProgress(20);

      // Get baseline
      await fetchCurrentStats();
      setScanProgress(40);

      // Trigger the comprehensive scanner
      const { data: scanResult, error } = await supabase.functions.invoke('all-symbols-scanner', {
        body: { 
          mode: 'comprehensive',
          trigger: 'manual_test',
          scan_all_symbols: true,
          force: true,
          advanced_ai: true
        }
      });

      if (error) throw error;
      setScanProgress(70);

      // Wait for signals to be generated
      await new Promise(resolve => setTimeout(resolve, 3000));
      setScanProgress(90);

      // Check for new signals
      const { data: comprehensiveSignals } = await supabase
        .from('signals')
        .select('*')
        .eq('source', 'all_symbols_comprehensive')
        .order('created_at', { ascending: false });

      const { data: algoSignals } = await supabase
        .from('signals')
        .select('*')
        .eq('algo', 'aitradex1_comprehensive_v4')
        .order('created_at', { ascending: false });

      setScanProgress(100);

      const results: ScannerTestResults = {
        success: scanResult?.success || false,
        comprehensiveSignals: comprehensiveSignals?.length || 0,
        newAlgorithmSignals: algoSignals?.length || 0,
        totalGenerated: scanResult?.signalsGenerated || 0,
        exchanges: scanResult?.exchanges || [],
        timestamp: new Date().toISOString()
      };

      setTestResults(results);
      await fetchCurrentStats();

      if (results.comprehensiveSignals > 0) {
        toast.success(`✅ Success! Generated ${results.comprehensiveSignals} comprehensive signals`);
      } else {
        toast.warning('⚠️ Scanner completed but no comprehensive signals found');
      }

    } catch (error) {
      console.error('Scanner test failed:', error);
      toast.error('❌ Scanner test failed');
      setTestResults({ 
        success: false, 
        comprehensiveSignals: 0, 
        newAlgorithmSignals: 0, 
        totalGenerated: 0 
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  useEffect(() => {
    fetchCurrentStats();
    const interval = setInterval(fetchCurrentStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Comprehensive Scanner Test
        </CardTitle>
        <CardDescription>
          Test the all-symbols scanner with 2000+ cryptocurrency pairs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{currentStats.totalSignals}</div>
            <div className="text-sm text-muted-foreground">Total Signals (1h)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{currentStats.comprehensiveSignals}</div>
            <div className="text-sm text-muted-foreground">Comprehensive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentStats.newLogicSignals}</div>
            <div className="text-sm text-muted-foreground">New Algorithm</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{currentStats.recentSignals}</div>
            <div className="text-sm text-muted-foreground">Recent (5m)</div>
          </div>
        </div>

        {/* Progress Bar */}
        {isScanning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Scanning progress...</span>
              <span>{scanProgress}%</span>
            </div>
            <Progress value={scanProgress} className="w-full" />
          </div>
        )}

        {/* Test Button */}
        <Button 
          onClick={triggerComprehensiveScanner}
          disabled={isScanning}
          className="w-full"
          size="lg"
        >
          {isScanning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Scanning 2000+ Symbols...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Comprehensive Scanner Test
            </>
          )}
        </Button>

        {/* Test Results */}
        {testResults && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              {testResults.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                Test {testResults.success ? 'Successful' : 'Failed'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium">Comprehensive Signals</div>
                <Badge variant={testResults.comprehensiveSignals > 0 ? "default" : "secondary"}>
                  {testResults.comprehensiveSignals}
                </Badge>
              </div>
              <div>
                <div className="font-medium">New Algorithm Signals</div>
                <Badge variant={testResults.newAlgorithmSignals > 0 ? "default" : "secondary"}>
                  {testResults.newAlgorithmSignals}
                </Badge>
              </div>
              <div>
                <div className="font-medium">Total Generated</div>
                <Badge variant={testResults.totalGenerated > 0 ? "default" : "secondary"}>
                  {testResults.totalGenerated}
                </Badge>
              </div>
            </div>

            {testResults.exchanges && testResults.exchanges.length > 0 && (
              <div>
                <div className="font-medium text-sm mb-1">Exchanges Scanned</div>
                <div className="flex gap-1">
                  {testResults.exchanges.map(exchange => (
                    <Badge key={exchange} variant="outline" className="text-xs">
                      {exchange}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
          <strong>What this test does:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Triggers the comprehensive all-symbols scanner function</li>
            <li>Scans 2000+ cryptocurrency pairs across multiple exchanges</li>
            <li>Uses the new aitradex1_comprehensive_v4 algorithm</li>
            <li>Generates signals with "all_symbols_comprehensive" source</li>
            <li>Reports success/failure and signal counts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};