import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { supabase } from '@/integrations/supabase/client';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Database, 
  Cloud, 
  Key,
  Activity
} from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
  icon?: React.ReactNode;
}

export function SystemDiagnostics() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const tests: DiagnosticResult[] = [
      { test: 'Authentication Status', status: 'running', icon: <Key className="w-4 h-4" /> },
      { test: 'Database Connectivity', status: 'running', icon: <Database className="w-4 h-4" /> },
      { test: 'Edge Function Status', status: 'running', icon: <Cloud className="w-4 h-4" /> },
      { test: 'Trading API Connection', status: 'running', icon: <Activity className="w-4 h-4" /> },
      { test: 'RLS Policies Check', status: 'running', icon: <Database className="w-4 h-4" /> }
    ];

    setResults([...tests]);

    // Test 1: Authentication Status
    try {
      const { data: { session } } = await supabase.auth.getSession();
      tests[0] = {
        ...tests[0],
        status: session ? 'passed' : 'failed',
        message: session ? `Authenticated as ${session.user.email}` : 'Not authenticated',
        data: { hasSession: !!session, userId: session?.user?.id }
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[0] = {
        ...tests[0],
        status: 'failed',
        message: `Auth error: ${error.message}`
      };
      setResults([...tests]);
    }

    // Test 2: Database Connectivity
    try {
      const { data: markets, error: marketsError } = await supabase
        .from('markets')
        .select('symbol')
        .limit(1);
      
      const { data: signals, error: signalsError } = await supabase
        .from('signals')
        .select('id')
        .limit(1);

      if (marketsError || signalsError) {
        throw new Error(marketsError?.message || signalsError?.message);
      }

      tests[1] = {
        ...tests[1],
        status: 'passed',
        message: `Database accessible - Markets: ${markets?.length || 0}, Signals: ${signals?.length || 0}`,
        data: { marketsCount: markets?.length, signalsCount: signals?.length }
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[1] = {
        ...tests[1],
        status: 'failed',
        message: `Database error: ${error.message}`
      };
      setResults([...tests]);
    }

    // Test 3: Edge Function Status
    try {
      const connection = await TradingGateway.testConnection();
      tests[2] = {
        ...tests[2],
        status: connection.ok ? 'passed' : 'failed',
        message: connection.ok ? 'Edge function operational' : `Edge function error: ${connection.error}`,
        data: connection
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[2] = {
        ...tests[2],
        status: 'failed',
        message: `Edge function error: ${error.message}`
      };
      setResults([...tests]);
    }

    // Test 4: Trading API Connection (Test Mode)
    try {
      const tradeTest = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 1,
        leverage: 1,
        scalpMode: true
      });
      
      tests[3] = {
        ...tests[3],
        status: tradeTest.ok ? 'passed' : 'failed',
        message: tradeTest.ok ? 'Trading API connected' : `Trading API error: ${tradeTest.error}`,
        data: tradeTest
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[3] = {
        ...tests[3],
        status: 'failed',
        message: `Trading API error: ${error.message}`
      };
      setResults([...tests]);
    }

    // Test 5: RLS Policies Check
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Test user_trading_accounts access
        const { data: accounts, error: accountsError } = await supabase
          .from('user_trading_accounts')
          .select('id')
          .limit(1);
          
        tests[4] = {
          ...tests[4],
          status: accountsError ? 'failed' : 'passed',
          message: accountsError ? `RLS error: ${accountsError.message}` : 'RLS policies working correctly',
          data: { accountsAccessible: !accountsError }
        };
      } else {
        tests[4] = {
          ...tests[4],
          status: 'failed',
          message: 'Cannot test RLS policies - not authenticated'
        };
      }
      setResults([...tests]);
    } catch (error: any) {
      tests[4] = {
        ...tests[4],
        status: 'failed',
        message: `RLS test error: ${error.message}`
      };
      setResults([...tests]);
    }

    setIsRunning(false);
    
    const passedTests = tests.filter(t => t.status === 'passed').length;
    const totalTests = tests.length;
    
    toast({
      title: 'System Diagnostics Complete',
      description: `${passedTests}/${totalTests} tests passed`,
      variant: passedTests === totalTests ? 'default' : 'destructive'
    });
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'running':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Running...</Badge>;
      case 'passed':
        return <Badge className="bg-green-500 hover:bg-green-600">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          System Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isRunning} className="w-full">
          {isRunning ? 'Running Diagnostics...' : 'Run System Diagnostics'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {result.icon}
                    {getStatusIcon(result.status)}
                  </div>
                  <div>
                    <div className="font-medium">{result.test}</div>
                    {result.message && (
                      <div className="text-sm text-muted-foreground max-w-md">
                        {result.message}
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && !isRunning && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <strong>Summary:</strong> {results.filter(r => r.status === 'passed').length}/{results.length} tests passed
            </div>
            {results.some(r => r.status === 'failed') && (
              <div className="text-sm text-red-600 mt-1">
                <strong>Common fixes:</strong>
                <ul className="list-disc list-inside mt-1">
                  <li>Sign in to test authenticated features</li>
                  <li>Add Bybit API credentials in settings</li>
                  <li>Check database permissions</li>
                  <li>Verify edge function deployment</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}