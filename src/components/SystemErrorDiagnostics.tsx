import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  details?: any;
}

export function SystemErrorDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    const tests: DiagnosticResult[] = [
      { test: 'Database Connection', status: 'pending', message: 'Testing...' },
      { test: 'Signals API', status: 'pending', message: 'Testing...' },
      { test: 'Trade Executor', status: 'pending', message: 'Testing...' },
      { test: 'Edge Functions', status: 'pending', message: 'Testing...' },
      { test: 'Network Connectivity', status: 'pending', message: 'Testing...' }
    ];
    
    setResults([...tests]);

    // Test 1: Database Connection
    try {
      console.log('🔍 Testing database connection...');
      const { data, error } = await supabase.from('signals').select('count').limit(1);
      
      if (error) {
        throw error;
      }
      
      tests[0] = { test: 'Database Connection', status: 'pass', message: 'Database accessible' };
      console.log('✅ Database connection test passed');
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      tests[0] = { 
        test: 'Database Connection', 
        status: 'fail', 
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
    setResults([...tests]);

    // Test 2: Signals API
    try {
      console.log('🔍 Testing signals API...');
      const { data, error } = await supabase
        .from('signals')
        .select('id, symbol, score, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        throw error;
      }
      
      tests[1] = { 
        test: 'Signals API', 
        status: 'pass', 
        message: `Retrieved ${data?.length || 0} signals`,
        details: data
      };
      console.log('✅ Signals API test passed');
    } catch (error) {
      console.error('❌ Signals API test failed:', error);
      tests[1] = { 
        test: 'Signals API', 
        status: 'fail', 
        message: `Signals API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
    setResults([...tests]);

    // Test 3: Trade Executor
    try {
      console.log('🔍 Testing trade executor...');
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'status'
        }
      });
      
      if (error) {
        throw error;
      }
      
      tests[2] = { 
        test: 'Trade Executor', 
        status: 'pass', 
        message: 'Trade executor responsive',
        details: data
      };
      console.log('✅ Trade executor test passed');
    } catch (error) {
      console.error('❌ Trade executor test failed:', error);
      tests[2] = { 
        test: 'Trade Executor', 
        status: 'fail', 
        message: `Trade executor error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
    setResults([...tests]);

    // Test 4: Edge Functions
    try {
      console.log('🔍 Testing edge functions...');
      const { data, error } = await supabase.functions.invoke('comprehensive-trading-pipeline', {
        body: {
          action: 'status_check'
        }
      });
      
      if (error) {
        throw error;
      }
      
      tests[3] = { 
        test: 'Edge Functions', 
        status: 'pass', 
        message: 'Edge functions accessible',
        details: data
      };
      console.log('✅ Edge functions test passed');
    } catch (error) {
      console.error('❌ Edge functions test failed:', error);
      tests[3] = { 
        test: 'Edge Functions', 
        status: 'fail', 
        message: `Edge functions error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
    setResults([...tests]);

    // Test 5: Network Connectivity
    try {
      console.log('🔍 Testing network connectivity...');
      const response = await fetch('https://api.bybit.com/v5/market/time');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Network error: ${response.status}`);
      }
      
      tests[4] = { 
        test: 'Network Connectivity', 
        status: 'pass', 
        message: 'External API accessible',
        details: data
      };
      console.log('✅ Network connectivity test passed');
    } catch (error) {
      console.error('❌ Network connectivity test failed:', error);
      tests[4] = { 
        test: 'Network Connectivity', 
        status: 'fail', 
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
    setResults([...tests]);

    setIsRunning(false);
    
    const failedTests = tests.filter(t => t.status === 'fail');
    
    if (failedTests.length === 0) {
      toast({
        title: "✅ All Diagnostics Passed",
        description: "System appears to be working correctly",
      });
    } else {
      toast({
        title: "❌ Diagnostics Failed",
        description: `${failedTests.length} test(s) failed`,
        variant: "destructive"
      });
    }
  };

  const runFakeTradeTest = async () => {
    try {
      console.log('🧪 Running fake trade test...');
      
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'execute_trade',
          symbol: 'BTCUSDT',
          side: 'BUY',
          amount_usd: 25,
          leverage: 1,
          paper_mode: true
        }
      });

      console.log('📊 Trade test result:', { data, error });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "✅ Fake Trade Test Passed",
          description: `Trade executed successfully: ${data.message}`,
        });
      } else {
        toast({
          title: "❌ Fake Trade Test Failed",
          description: data?.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Fake trade test failed:', error);
      toast({
        title: "❌ Fake Trade Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          System Error Diagnostics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive system error analysis and troubleshooting
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
          </Button>
          
          <Button
            onClick={runFakeTradeTest}
            variant="outline"
            className="flex items-center gap-2"
          >
            🧪 Test Fake Trade
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Diagnostic Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {result.status === 'pass' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {result.status === 'fail' && <XCircle className="h-4 w-4 text-red-500" />}
                  {result.status === 'pending' && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                  
                  <div>
                    <span className="font-medium">{result.test}</span>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
                
                <Badge variant={result.status === 'pass' ? 'default' : result.status === 'fail' ? 'destructive' : 'outline'}>
                  {result.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {results.some(r => r.status === 'fail') && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h4 className="font-medium text-destructive mb-2">Error Details:</h4>
            <div className="space-y-2 text-sm">
              {results
                .filter(r => r.status === 'fail')
                .map((result, index) => (
                  <div key={index}>
                    <strong>{result.test}:</strong> {result.message}
                    {result.details && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Show technical details
                        </summary>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}