import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Play, Zap } from 'lucide-react';
import { smokeTests } from '@/lib/smokeTests';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

const TestRunner = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [overallResult, setOverallResult] = useState<{ passed: boolean; score: string } | null>(null);

  const runSmokeTests = async () => {
    setRunning(true);
    setResults([]);
    
    try {
      console.log('🧪 [TestRunner] Starting comprehensive smoke tests...');
      
      // Run individual tests and track timing
      const testFunctions = [
        { name: 'Bybit API Status', fn: smokeTests.bybitApiStatus },
        { name: 'Canary Order', fn: smokeTests.canaryOrder },
        { name: 'TradingView Webhook', fn: smokeTests.tradingViewWebhook },
        { name: 'Positions Fetch', fn: smokeTests.positionsFetch },
        { name: 'Balance Check', fn: smokeTests.balanceCheck },
        { name: 'Quick Connection', fn: smokeTests.quickConnectionTest }
      ];

      const testResults: TestResult[] = [];
      
      for (const test of testFunctions) {
        const startTime = Date.now();
        try {
          const result = await test.fn();
          const duration = Date.now() - startTime;
          
          testResults.push({
            name: test.name,
            success: result.success,
            duration,
            error: result.error,
            data: result
          });
          
          setResults([...testResults]);
        } catch (error: any) {
          const duration = Date.now() - startTime;
          testResults.push({
            name: test.name,
            success: false,
            duration,
            error: error.message
          });
          setResults([...testResults]);
        }
      }

      // Calculate overall result
      const passedTests = testResults.filter(r => r.success).length;
      const totalTests = testResults.length;
      const overallPassed = passedTests >= 4; // Need at least 4/6 to pass
      
      setOverallResult({
        passed: overallPassed,
        score: `${passedTests}/${totalTests}`
      });

      console.log(`🧪 [TestRunner] Tests completed: ${overallPassed ? 'PASSED' : 'FAILED'} (${passedTests}/${totalTests})`);
      
    } catch (error) {
      console.error('🧪 [TestRunner] Test suite failed:', error);
    } finally {
      setRunning(false);
    }
  };

  const runQuickTest = async () => {
    setRunning(true);
    setResults([]);
    
    try {
      console.log('⚡ [TestRunner] Running quick connection test...');
      
      const startTime = Date.now();
      const result = await smokeTests.quickConnectionTest();
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        name: 'Quick Connection Test',
        success: result.success,
        duration,
        error: result.error,
        data: result
      };
      
      setResults([testResult]);
      setOverallResult({
        passed: result.success,
        score: result.success ? '1/1' : '0/1'
      });
      
    } catch (error: any) {
      console.error('⚡ [TestRunner] Quick test failed:', error);
      setResults([{
        name: 'Quick Connection Test',
        success: false,
        duration: 0,
        error: error.message
      }]);
      setOverallResult({ passed: false, score: '0/1' });
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-success" />
    ) : (
      <XCircle className="w-4 h-4 text-destructive" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Play className="w-5 h-5" />
            <span>System Test Runner</span>
          </div>
          {overallResult && (
            <Badge variant={overallResult.passed ? "default" : "destructive"}>
              {overallResult.score} {overallResult.passed ? 'PASS' : 'FAIL'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button 
            onClick={runSmokeTests}
            disabled={running}
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${running ? 'animate-spin' : ''}`} />
            Full Test Suite
          </Button>
          <Button 
            onClick={runQuickTest}
            disabled={running}
            variant="outline"
            className="flex-1"
          >
            <Zap className="w-4 h-4 mr-2" />
            Quick Test
          </Button>
        </div>

        {running && (
          <div className="text-center py-4">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Running tests...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.success)}
                  <span className="text-sm">{result.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                  {!result.success && result.error && (
                    <span className="text-xs text-destructive max-w-32 truncate" title={result.error}>
                      {result.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {overallResult && (
          <div className="text-center p-4 rounded-lg bg-muted">
            <div className={`text-lg font-bold ${overallResult.passed ? 'text-success' : 'text-destructive'}`}>
              {overallResult.passed ? '🟢 ALL SYSTEMS OPERATIONAL' : '🔴 SYSTEM ISSUES DETECTED'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Score: {overallResult.score} • {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Full suite tests all core trading functions</p>
          <p>• Quick test validates basic connectivity</p>
          <p>• Console: <code>window.__smokeTests.runProductionSuite()</code></p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestRunner;