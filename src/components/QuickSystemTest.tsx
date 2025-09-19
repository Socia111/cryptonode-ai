import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const QuickSystemTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runQuickTest = async () => {
    setTesting(true);
    const testResults: any = {};

    try {
      console.log('🧪 [QuickTest] Starting system tests...');

      // Test 1: Database read
      console.log('📊 [QuickTest] Testing database read...');
      const { data: signalsData, error: signalsError } = await supabase
        .from('signals')
        .select('id, symbol, score')
        .limit(5);
      
      testResults.database = {
        success: !signalsError,
        count: signalsData?.length || 0,
        error: signalsError?.message
      };
      console.log('📊 [QuickTest] Database result:', testResults.database);

      // Test 2: Paper trading insert
      console.log('💰 [QuickTest] Testing paper trade insert...');
      const { data: insertData, error: insertError } = await supabase
        .from('execution_orders')
        .insert({
          symbol: 'TESTUSDT',
          side: 'buy',
          qty: 0.001,
          amount_usd: 10,
          leverage: 1,
          paper_mode: true,
          status: 'test_order',
          exchange_order_id: `test_${Date.now()}`
        })
        .select();

      testResults.paperTradeInsert = {
        success: !insertError,
        data: insertData,
        error: insertError?.message
      };
      console.log('💰 [QuickTest] Paper trade insert result:', testResults.paperTradeInsert);

      // Test 3: Paper trading function
      console.log('🚀 [QuickTest] Testing paper trading function...');
      const { data: functionData, error: functionError } = await supabase.functions.invoke('paper-trading-executor', {
        body: {
          symbol: 'BTCUSDT',
          side: 'buy',
          amount: 25,
          leverage: 1,
          paperMode: true
        }
      });

      testResults.paperTradingFunction = {
        success: !functionError,
        data: functionData,
        error: functionError?.message
      };
      console.log('🚀 [QuickTest] Paper trading function result:', testResults.paperTradingFunction);

      setResults(testResults);

      const allPassed = Object.values(testResults).every((test: any) => test.success);
      toast({
        title: allPassed ? "✅ All Quick Tests Passed" : "⚠️ Some Quick Tests Failed",
        description: `Tests completed: ${Object.keys(testResults).length}`,
        variant: allPassed ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('🔥 [QuickTest] System test failed:', error);
      toast({
        title: "❌ Quick Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Quick System Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={runQuickTest} 
          disabled={testing}
          className="w-full mb-4"
        >
          {testing ? 'Running Quick Tests...' : 'Run Quick Tests'}
        </Button>

        {results && (
          <div className="space-y-3">
            <h4 className="font-semibold">Test Results:</h4>
            
            {Object.entries(results).map(([testName, result]: [string, any]) => (
              <div key={testName} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{testName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? 'PASS' : 'FAIL'}
                  </Badge>
                  {result.count !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {result.count} items
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Show errors */}
            {Object.values(results).some((test: any) => !test.success) && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h5 className="font-medium text-destructive mb-2">Errors:</h5>
                <div className="space-y-1 text-sm">
                  {Object.entries(results).map(([key, test]: [string, any]) => 
                    !test.success && test.error && (
                      <div key={key} className="text-destructive">
                        <strong>{key}:</strong> {test.error}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};