import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Activity,
  Database,
  TrendingUp,
  Settings,
  Shield,
  Zap
} from 'lucide-react';

interface DiagnosticTest {
  status: 'PASSED' | 'WARNING' | 'FAILED';
  message: string;
  details: any;
}

interface DiagnosticResult {
  timestamp: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summary: string;
  healthScore: number;
  tests: {
    databaseConnectivity?: DiagnosticTest;
    tradingAccountsAccess?: DiagnosticTest;
    liveMarketData?: DiagnosticTest;
    signalsGeneration?: DiagnosticTest;
    exchangeFeedStatus?: DiagnosticTest;
    automatedTradingConfig?: DiagnosticTest;
    whitelistSettings?: DiagnosticTest;
  };
  recommendations: string[];
  error?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PASSED':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'WARNING':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'FAILED':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Activity className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'HEALTHY':
      return 'bg-green-500';
    case 'WARNING':
      return 'bg-yellow-500';
    case 'CRITICAL':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const testIcons = {
  databaseConnectivity: Database,
  tradingAccountsAccess: Settings,
  liveMarketData: TrendingUp,
  signalsGeneration: Zap,
  exchangeFeedStatus: Activity,
  automatedTradingConfig: Settings,
  whitelistSettings: Shield
};

const testNames = {
  databaseConnectivity: 'Database Connectivity',
  tradingAccountsAccess: 'Trading Accounts Access',
  liveMarketData: 'Live Market Data',
  signalsGeneration: 'Signals Generation',
  exchangeFeedStatus: 'Exchange Feed Status',
  automatedTradingConfig: 'Automated Trading Config',
  whitelistSettings: 'Whitelist Settings'
};

export default function SystemDiagnosticsReport() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[SystemDiagnostics] Running comprehensive diagnostics...');
      
      const { data, error: invokeError } = await supabase.functions.invoke('diagnostics');
      
      if (invokeError) {
        throw new Error(`Diagnostics failed: ${invokeError.message}`);
      }
      
      setDiagnostic(data);
      console.log('[SystemDiagnostics] Diagnostics completed:', data);
      
    } catch (err: any) {
      console.error('[SystemDiagnostics] Error:', err);
      setError(err.message || 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            Running System Diagnostics...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={50} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Testing system components and generating comprehensive report...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            Diagnostics Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={runDiagnostics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Diagnostics
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!diagnostic) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              System Health Overview
            </span>
            <Button onClick={runDiagnostics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(diagnostic.status)}`} />
                <span className="text-lg font-semibold">{diagnostic.status}</span>
                <Badge variant="outline">{diagnostic.summary}</Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{diagnostic.healthScore}%</div>
                <div className="text-sm text-muted-foreground">Health Score</div>
              </div>
            </div>
            
            <Progress value={diagnostic.healthScore} className="w-full" />
            
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(diagnostic.timestamp).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Component Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(diagnostic.tests).map(([testKey, testResult]) => {
              const IconComponent = testIcons[testKey as keyof typeof testIcons] || Activity;
              const testName = testNames[testKey as keyof typeof testNames] || testKey;
              
              return (
                <div key={testKey} className="flex items-start gap-3 p-3 border rounded-lg">
                  <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(testResult.status)}
                      <span className="font-medium">{testName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                    {testResult.details && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {typeof testResult.details === 'object' ? (
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(testResult.details, null, 2)}
                          </pre>
                        ) : (
                          <span>{String(testResult.details)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {diagnostic.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {diagnostic.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Details */}
      {diagnostic.error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              System Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription className="font-mono text-sm">
                {diagnostic.error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}