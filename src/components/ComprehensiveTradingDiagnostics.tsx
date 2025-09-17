import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export const ComprehensiveTradingDiagnostics = () => {
  const [results, setResults] = useState<Record<string, DiagnosticResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const { toast } = useToast();

  const runDiagnostic = async (testName: string, action: string) => {
    setTesting(prev => ({ ...prev, [testName]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('trading-diagnostics', {
        body: { action }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setResults(prev => ({ ...prev, [testName]: data }));
      
      toast({
        title: data.success ? "Test Passed ✅" : "Test Failed ❌",
        description: data.message || data.error || `${testName} completed`,
        variant: data.success ? "default" : "destructive"
      });
      
    } catch (err: any) {
      const errorResult = { success: false, error: err.message };
      setResults(prev => ({ ...prev, [testName]: errorResult }));
      
      toast({
        title: "Test Error ❌",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setTesting(prev => ({ ...prev, [testName]: false }));
    }
  };

  const loadSystemLogs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trading-diagnostics', {
        body: { action: 'get_system_logs' }
      });
      
      if (!error && data?.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  useEffect(() => {
    loadSystemLogs();
  }, []);

  const diagnosticTests = [
    {
      name: 'Bybit Connection',
      key: 'bybit_connection',
      action: 'test_bybit_connection',
      description: 'Test API credentials and wallet connection'
    },
    {
      name: 'Order Validation',
      key: 'order_validation', 
      action: 'test_order_validation',
      description: 'Validate order parameters and signing'
    },
    {
      name: 'Full Pipeline',
      key: 'full_pipeline',
      action: 'test_full_pipeline', 
      description: 'End-to-end signal → trade execution test'
    }
  ];

  const renderResult = (result: DiagnosticResult | undefined) => {
    if (!result) return null;
    
    return (
      <div className="mt-2 p-3 border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={result.success ? "default" : "destructive"}>
            {result.success ? "PASS" : "FAIL"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
        
        {result.success ? (
          <div className="space-y-1 text-sm">
            {result.environment && <p><strong>Environment:</strong> {result.environment}</p>}
            {result.balance && (
              <p><strong>Balance Available:</strong> {result.balance.list?.[0]?.totalWalletBalance || 'Unknown'} USDT</p>
            )}
            {result.current_btc_price && <p><strong>BTC Price:</strong> ${result.current_btc_price}</p>}
            {result.pipeline_test && (
              <div>
                <p><strong>Test Signal:</strong> {result.pipeline_test.signal_used.symbol} {result.pipeline_test.signal_used.direction}</p>
                <p><strong>Trade Status:</strong> {result.pipeline_test.trade_result.data?.status}</p>
                <p><strong>Paper Mode:</strong> {result.pipeline_test.trade_result.data?.paperMode ? 'Yes' : 'No'}</p>
              </div>
            )}
            <p className="text-green-600">{result.message}</p>
          </div>
        ) : (
          <p className="text-red-600">{result.error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Comprehensive Trading Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tests" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tests">Diagnostic Tests</TabsTrigger>
              <TabsTrigger value="logs">System Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tests" className="space-y-4">
              {diagnosticTests.map((test) => (
                <div key={test.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                    </div>
                    <Button 
                      onClick={() => runDiagnostic(test.key, test.action)}
                      disabled={testing[test.key]}
                      size="sm"
                    >
                      {testing[test.key] ? 'Testing...' : 'Run Test'}
                    </Button>
                  </div>
                  {renderResult(results[test.key])}
                </div>
              ))}
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h5 className="font-medium mb-2">🎯 Quick Actions</h5>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      diagnosticTests.forEach(test => 
                        runDiagnostic(test.key, test.action)
                      );
                    }}
                    variant="outline"
                    disabled={Object.values(testing).some(Boolean)}
                  >
                    Run All Tests
                  </Button>
                  <Button onClick={loadSystemLogs} variant="outline">
                    Refresh Logs
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="logs">
              <ScrollArea className="h-96 w-full border rounded-lg p-4">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground">No recent logs found</p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="p-2 border rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};