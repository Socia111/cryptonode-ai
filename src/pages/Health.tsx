import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { smokeTests } from '@/lib/smokeTests';

interface TestResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

interface HealthResults {
  bybitApi: TestResult;
  canaryOrder: TestResult;
  tradingViewWebhook: TestResult;
  positions: TestResult;
  balance: TestResult;
  timestamp: string;
  overall: { passed: boolean; score: string };
}

const Health = () => {
  const [results, setResults] = useState<HealthResults | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runTests = async () => {
    setLoading(true);
    try {
      console.log('🏥 [Health] Running system health check...');
      const testResults = await smokeTests.runProductionSuite();
      setResults(testResults);
    } catch (error) {
      console.error('🏥 [Health] Failed to run tests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? 'PASS' : 'FAIL'}
      </Badge>
    );
  };

  const allPassed = results ? results.overall.passed : false;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">System Health Check</h1>
          <p className="text-muted-foreground">
            Automated smoke tests for critical infrastructure components
          </p>
          
          {results && (
            <div className="flex items-center justify-center space-x-4">
              <div className="text-2xl font-bold">
                {allPassed ? (
                  <span className="text-success">🟢 ALL SYSTEMS OPERATIONAL</span>
                ) : (
                  <span className="text-destructive">🔴 SYSTEM ISSUES DETECTED</span>
                )}
              </div>
              <Button onClick={runTests} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Re-run Tests
              </Button>
            </div>
          )}
        </div>

        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Running system diagnostics...</p>
            </CardContent>
          </Card>
        )}

        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.bybitApi.success)}
                    <span>Bybit API Connection</span>
                  </div>
                  {getStatusBadge(results.bybitApi.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests Bybit trading API connectivity and authentication
                  </p>
                  {results.bybitApi.success ? (
                    <p className="text-sm text-success">
                      ✓ Connected successfully ({results.bybitApi.testnet ? 'TESTNET' : 'MAINNET'})
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">
                      ✗ {results.bybitApi.error || 'Connection failed'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.canaryOrder.success)}
                    <span>Order Execution</span>
                  </div>
                  {getStatusBadge(results.canaryOrder.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests order placement and execution pipeline
                  </p>
                  {results.canaryOrder.success ? (
                    <p className="text-sm text-success">
                      ✓ Order system operational
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ⚪ {results.canaryOrder.message || 'System in paper mode'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.positions.success)}
                    <span>Position Management</span>
                  </div>
                  {getStatusBadge(results.positions.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests position fetching and account management
                  </p>
                  {results.positions.success ? (
                    <p className="text-sm text-success">
                      ✓ Position data accessible ({results.positions.positionCount} positions)
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">
                      ✗ {results.positions.error || 'Position data unavailable'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.balance.success)}
                    <span>Account Balance</span>
                  </div>
                  {getStatusBadge(results.balance.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests account balance and funding status
                  </p>
                  {results.balance.success ? (
                    <p className="text-sm text-success">
                      ✓ Balance: ${results.balance.usdtBalance?.toFixed(2) || '0.00'} USDT
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">
                      ✗ {results.balance.error || 'Balance data unavailable'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Test Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Timestamp:</strong> {new Date(results.timestamp).toLocaleString()}
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Raw test results (click to expand)
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>For manual testing, open browser console and run: <code>window.__smokeTests.runProductionSuite()</code></p>
          <p className="text-xs">Overall Score: <strong>{results.overall.score}</strong> - {results.overall.passed ? '✅ PASSED' : '❌ FAILED'}</p>
        </div>
      </div>
    </div>
  );
};

export default Health;