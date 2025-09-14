import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TradingDiagnostics = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const diagnostics = {
        supabaseConnection: false,
        userAuth: false,
        apiKeys: false,
        edgeFunctions: false,
        bybitReachable: false,
        errors: [] as string[],
        testResults: [] as any[]
      };

      // Test 1: Supabase connection
      try {
        const { data, error } = await supabase.from('signals').select('count').limit(1);
        diagnostics.supabaseConnection = !error;
        if (error) diagnostics.errors.push(`Supabase: ${error.message}`);
      } catch (e) {
        diagnostics.errors.push(`Supabase connection failed: ${e}`);
      }

      // Test 2: New diagnostics endpoint
      try {
        const { data: diagData, error: diagError } = await supabase.functions.invoke('trade-diag');
        if (diagError) {
          diagnostics.errors.push(`Diagnostics: ${diagError.message}`);
        } else {
          diagnostics.edgeFunctions = true;
          diagnostics.testResults.push({ test: 'Environment Check', result: diagData });
          diagnostics.apiKeys = diagData?.environment?.has_api_key;
        }
      } catch (e) {
        diagnostics.errors.push(`Trade diagnostics failed: ${e}`);
      }

      // Test 3: Connection test
      try {
        const { data: connData, error: connError } = await supabase.functions.invoke('trade-connection-test');
        if (connError) {
          diagnostics.errors.push(`Connection test: ${connError.message}`);
        } else {
          diagnostics.testResults.push({ test: 'Bybit Connection', result: connData });
          diagnostics.bybitReachable = connData?.success || false;
        }
      } catch (e) {
        diagnostics.errors.push(`Connection test failed: ${e}`);
      }

      // Test 4: Paper trade test  
      try {
        const { data: tradeData, error: tradeError } = await supabase.functions.invoke('trade-executor', {
          body: {
            symbol: 'BTCUSDT',
            side: 'Buy',
            amountUSD: 10,
            testMode: true
          }
        });
        if (tradeError) {
          diagnostics.errors.push(`Trade test: ${tradeError.message}`);
        } else {
          diagnostics.testResults.push({ test: 'Trade Execution', result: tradeData });
        }
      } catch (e) {
        diagnostics.errors.push(`Trade execution test failed: ${e}`);
      }

      // Test 5: Direct Bybit API test (public endpoint)
      try {
        const response = await fetch('https://api.bybit.com/v5/market/time');
        diagnostics.bybitReachable = response.ok;
        if (!response.ok) {
          diagnostics.errors.push(`Bybit API unreachable: ${response.status}`);
        }
      } catch (e) {
        diagnostics.errors.push(`Bybit connectivity failed: ${e}`);
      }

      setResults(diagnostics);
      
    } catch (error) {
      toast.error(`Diagnostics failed: ${error}`);
      setResults({ errors: [`Critical error: ${error}`] });
    } finally {
      setIsRunning(false);
    }
  };

  const fixSuggestions = [
    {
      issue: "Missing API Keys", 
      solution: "Connect your Bybit account in the Live Setup tab",
      priority: "critical"
    },
    {
      issue: "No User Session",
      solution: "Sign in to your account first",
      priority: "high"
    },
    {
      issue: "Bybit Unreachable",
      solution: "Check internet connection or Bybit service status",
      priority: "medium"
    }
  ];

  const StatusIcon = ({ status }: { status: boolean }) => 
    status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Trading System Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Full Diagnostics'
          )}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Supabase Connection</span>
                <StatusIcon status={results.supabaseConnection} />
              </div>
              <div className="flex items-center justify-between">
                <span>Edge Functions</span>
                <StatusIcon status={results.edgeFunctions} />
              </div>
              <div className="flex items-center justify-between">
                <span>API Keys Configured</span>
                <StatusIcon status={results.apiKeys} />
              </div>
              <div className="flex items-center justify-between">
                <span>Bybit Reachable</span>
                <StatusIcon status={results.bybitReachable} />
              </div>
            </div>

            {results.testResults?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Test Results</h4>
                {results.testResults.map((test: any, i: number) => (
                  <details key={i} className="border rounded p-2">
                    <summary className="cursor-pointer font-medium">{test.test}</summary>
                    <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto">
                      {JSON.stringify(test.result, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            )}

            {results.errors?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Issues Found
                </h4>
                <div className="space-y-1">
                  {results.errors.map((error: string, i: number) => (
                    <div key={i} className="text-sm bg-red-50 p-2 rounded text-red-700">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">Quick Fixes</h4>
              {fixSuggestions.map((fix, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{fix.issue}</span>
                    <Badge variant={fix.priority === 'critical' ? 'destructive' : 'secondary'}>
                      {fix.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{fix.solution}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingDiagnostics;