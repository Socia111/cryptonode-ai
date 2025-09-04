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
  config: TestResult;
  realtime: TestResult;
  auth: TestResult;
  signalGeneration: TestResult;
  timestamp: string;
}

const Health = () => {
  const [results, setResults] = useState<HealthResults | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runTests = async () => {
    setLoading(true);
    try {
      console.log('🏥 [Health] Running system health check...');
      const testResults = await smokeTests.runAll();
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

  const allPassed = results ? [results.config, results.realtime, results.signalGeneration].every(r => r.success) : false;

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
                    {getStatusIcon(results.config.success)}
                    <span>Database Connection</span>
                  </div>
                  {getStatusBadge(results.config.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests Supabase connectivity and RLS policies
                  </p>
                  {results.config.success ? (
                    <p className="text-sm text-success">
                      ✓ Connected successfully ({results.config.rows || 0} test records)
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">
                      ✗ {results.config.error || 'Connection failed'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.realtime.success)}
                    <span>Realtime Connection</span>
                  </div>
                  {getStatusBadge(results.realtime.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests WebSocket connectivity and presence tracking
                  </p>
                  {results.realtime.success ? (
                    <p className="text-sm text-success">
                      ✓ Realtime connection established
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">
                      ✗ {results.realtime.error || 'Realtime connection failed'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.auth.success)}
                    <span>Authentication</span>
                  </div>
                  {getStatusBadge(results.auth.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests auth session and user management
                  </p>
                  {results.auth.success ? (
                    <p className="text-sm text-success">
                      ✓ Auth session active (User: {results.auth.user_id?.slice(0, 8)}...)
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ⚪ No active session (authentication not required)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.signalGeneration.success)}
                    <span>Edge Functions</span>
                  </div>
                  {getStatusBadge(results.signalGeneration.success)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tests signal generation and edge function connectivity
                  </p>
                  {results.signalGeneration.success ? (
                    <p className="text-sm text-success">
                      ✓ Function invocation successful
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">
                      ✗ {results.signalGeneration.error || 'Function invocation failed'}
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

        <div className="text-center text-sm text-muted-foreground">
          <p>For manual testing, open browser console and run: <code>window.__smokeTests.runAll()</code></p>
        </div>
      </div>
    </div>
  );
};

export default Health;