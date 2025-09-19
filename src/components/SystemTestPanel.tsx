import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlayCircle, Database, Signal, TrendingUp } from 'lucide-react';

export const SystemTestPanel = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runSystemTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      toast({
        title: "🧪 Running System Test",
        description: "Testing all components..."
      });

      // Test 1: Check signals
      console.log('[SystemTest] Testing signals database...');
      const { data: signalsData, error: signalsError } = await supabase
        .from('signals')
        .select('*')
        .limit(10);
      console.log('[SystemTest] Signals result:', { count: signalsData?.length, error: signalsError });

      // Test 2: Check execution orders  
      console.log('[SystemTest] Testing execution orders...');
      const { data: ordersData, error: ordersError } = await supabase
        .from('execution_orders')
        .select('*')
        .limit(5);
      console.log('[SystemTest] Orders result:', { count: ordersData?.length, error: ordersError });

      // Test 3: Check exchange status
      console.log('[SystemTest] Testing exchange feed status...');
      const { data: exchangeData, error: exchangeError } = await supabase
        .from('exchange_feed_status')
        .select('*')
        .limit(5);
      console.log('[SystemTest] Exchange result:', { count: exchangeData?.length, error: exchangeError });

      // Test 4: Test enhanced signal generator
      console.log('[SystemTest] Testing signal generator...');
      const { data: demoResult, error: demoError } = await supabase.functions.invoke('aitradex1-enhanced-scanner');
      console.log('[SystemTest] Signal generator result:', { success: !demoError, error: demoError });

      // Test 5: Test paper trading executor
      console.log('[SystemTest] Testing paper trading executor...');
      const { data: tradeResult, error: tradeError } = await supabase.functions.invoke('paper-trading-executor', {
        body: {
          symbol: 'BTCUSDT',
          side: 'buy',
          amount: 50,
          leverage: 1,
          paperMode: true
        }
      });
      console.log('[SystemTest] Paper trading result:', { success: !tradeError, data: tradeResult, error: tradeError });

      const testResults = {
        signals: {
          success: !signalsError,
          count: signalsData?.length || 0,
          error: signalsError?.message
        },
        orders: {
          success: !ordersError,
          count: ordersData?.length || 0,
          error: ordersError?.message
        },
        exchange: {
          success: !exchangeError,
          count: exchangeData?.length || 0,
          error: exchangeError?.message
        },
        demoSignals: {
          success: !demoError,
          data: demoResult,
          error: demoError?.message
        },
        paperTrading: {
          success: !tradeError,
          data: tradeResult,
          error: tradeError?.message
        }
      };

      setResults(testResults);

      const allPassed = Object.values(testResults).every(test => test.success);
      
      toast({
        title: allPassed ? "✅ All Tests Passed" : "⚠️ Some Tests Failed",
        description: `System components tested: ${Object.keys(testResults).length}`,
        variant: allPassed ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('System test failed:', error);
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getBadgeVariant = (success: boolean) => {
    return success ? 'default' : 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          System Test Panel
        </CardTitle>
        <CardDescription>
          Comprehensive test of all trading system components
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runSystemTest} 
          disabled={testing}
          className="w-full flex items-center gap-2"
        >
          <PlayCircle className="h-4 w-4" />
          {testing ? 'Running Tests...' : 'Run Complete System Test'}
        </Button>

        {results && (
          <div className="space-y-3">
            <h4 className="font-semibold">Test Results:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4" />
                  <span className="text-sm">Signals Database</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getBadgeVariant(results.signals.success)}>
                    {results.signals.success ? 'PASS' : 'FAIL'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {results.signals.count} records
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="text-sm">Execution Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getBadgeVariant(results.orders.success)}>
                    {results.orders.success ? 'PASS' : 'FAIL'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {results.orders.count} records
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4" />
                  <span className="text-sm">Exchange Status</span>
                </div>
                <Badge variant={getBadgeVariant(results.exchange.success)}>
                  {results.exchange.success ? 'PASS' : 'FAIL'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  <span className="text-sm">Demo Signals</span>
                </div>
                <Badge variant={getBadgeVariant(results.demoSignals.success)}>
                  {results.demoSignals.success ? 'PASS' : 'FAIL'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Paper Trading</span>
                </div>
                <Badge variant={getBadgeVariant(results.paperTrading.success)}>
                  {results.paperTrading.success ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
            </div>

            {/* Show errors if any */}
            {Object.values(results).some((test: any) => !test.success) && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h5 className="font-medium text-destructive mb-2">Errors Found:</h5>
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