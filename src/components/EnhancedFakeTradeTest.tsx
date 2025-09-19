import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  id: string;
  symbol: string;
  side: string;
  amount: number;
  success: boolean;
  message: string;
  executedPrice?: number;
  orderId?: string;
  timestamp: string;
}

const COMPREHENSIVE_TEST_CASES = [
  { symbol: 'BTCUSDT', side: 'buy', amount: 25 },
  { symbol: 'ETHUSDT', side: 'buy', amount: 50 },
  { symbol: 'DOTUSDT', side: 'buy', amount: 25 },
  { symbol: 'LINKUSDT', side: 'sell', amount: 30 },
  { symbol: 'ADAUSDT', side: 'buy', amount: 20 },
  { symbol: 'SOLUSDT', side: 'sell', amount: 40 },
];

export function EnhancedFakeTradeTest() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(50);
  const [leverage, setLeverage] = useState(1);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  
  const { executeTrade, executing, lastTrade } = useTradingExecutor();
  const { toast } = useToast();

  const runSingleTest = async () => {
    console.log('🔥 Running single fake trade test:', { symbol, side, amount, leverage });
    
    try {
      const result = await executeTrade({
        symbol,
        side,
        amount,
        leverage,
        orderType: 'market'
      });

      const testResult: TestResult = {
        id: Date.now().toString(),
        symbol,
        side: side.toUpperCase(),
        amount,
        success: result.success,
        message: result.message,
        executedPrice: result.executedPrice,
        orderId: result.orderId,
        timestamp: new Date().toLocaleTimeString()
      };

      setResults(prev => [testResult, ...prev]);

      if (result.success) {
        toast({
          title: "✅ Single Test Passed",
          description: `${side.toUpperCase()} ${symbol} for $${amount} executed successfully`,
        });
      } else {
        toast({
          title: "❌ Single Test Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Test execution failed:', error);
      toast({
        title: "❌ Test Error",
        description: error.message || 'Unknown error occurred',
        variant: "destructive"
      });
    }
  };

  const runComprehensiveTest = async () => {
    setIsRunningTests(true);
    console.log('🚀 Running comprehensive fake trade tests...');
    
    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of COMPREHENSIVE_TEST_CASES) {
      try {
        console.log(`🧪 Testing: ${testCase.side.toUpperCase()} ${testCase.symbol} for $${testCase.amount}`);
        
        const result = await executeTrade({
          symbol: testCase.symbol,
          side: testCase.side as 'buy' | 'sell',
          amount: testCase.amount,
          leverage: 1,
          orderType: 'market'
        });

        const testResult: TestResult = {
          id: `${Date.now()}-${testCase.symbol}`,
          symbol: testCase.symbol,
          side: testCase.side.toUpperCase(),
          amount: testCase.amount,
          success: result.success,
          message: result.message,
          executedPrice: result.executedPrice,
          orderId: result.orderId,
          timestamp: new Date().toLocaleTimeString()
        };

        setResults(prev => [testResult, ...prev]);

        if (result.success) {
          passedTests++;
        } else {
          failedTests++;
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Test failed for ${testCase.symbol}:`, error);
        failedTests++;
        
        const testResult: TestResult = {
          id: `${Date.now()}-${testCase.symbol}-error`,
          symbol: testCase.symbol,
          side: testCase.side.toUpperCase(),
          amount: testCase.amount,
          success: false,
          message: error.message || 'Test execution error',
          timestamp: new Date().toLocaleTimeString()
        };

        setResults(prev => [testResult, ...prev]);
      }
    }

    setIsRunningTests(false);

    toast({
      title: "🏁 Comprehensive Test Complete",
      description: `Passed: ${passedTests}, Failed: ${failedTests}`,
      variant: failedTests === 0 ? "default" : "destructive"
    });
  };

  const clearResults = () => {
    setResults([]);
    toast({
      title: "🧹 Results Cleared",
      description: "All test results have been cleared"
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Enhanced Fake Trade Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Symbol</label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                  <SelectItem value="DOTUSDT">DOTUSDT</SelectItem>
                  <SelectItem value="LINKUSDT">LINKUSDT</SelectItem>
                  <SelectItem value="ADAUSDT">ADAUSDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Side</label>
              <Select value={side} onValueChange={(value: 'buy' | 'sell') => setSide(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">BUY</SelectItem>
                  <SelectItem value="sell">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Amount (USD)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={5}
                max={1000}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Leverage</label>
              <Input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                min={1}
                max={10}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={runSingleTest} 
              disabled={executing || isRunningTests}
              variant="outline"
            >
              {executing ? "Testing..." : "🔬 Single Test"}
            </Button>
            
            <Button 
              onClick={runComprehensiveTest} 
              disabled={executing || isRunningTests}
            >
              {isRunningTests ? "Running Tests..." : "🚀 Comprehensive Test"}
            </Button>
            
            <Button 
              onClick={clearResults} 
              variant="secondary"
              disabled={results.length === 0}
            >
              🧹 Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Test Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div 
                  key={result.id} 
                  className={`p-3 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "✅" : "❌"}
                      </Badge>
                      <span className="font-medium">
                        {result.side} {result.symbol} - ${result.amount}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {result.timestamp}
                      </span>
                    </div>
                    {result.orderId && (
                      <Badge variant="outline" className="text-xs">
                        {result.orderId}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {result.message}
                  </div>
                  {result.executedPrice && (
                    <div className="text-sm text-muted-foreground">
                      Executed at: ${result.executedPrice}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Trade Status */}
      {lastTrade && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Last Trade Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={lastTrade.success ? "default" : "destructive"}>
                  {lastTrade.success ? "✅ Success" : "❌ Failed"}
                </Badge>
                {lastTrade.orderId && (
                  <Badge variant="outline">ID: {lastTrade.orderId}</Badge>
                )}
              </div>
              <p className="text-sm">{lastTrade.message}</p>
              {lastTrade.executedPrice && (
                <p className="text-sm text-muted-foreground">
                  Executed Price: ${lastTrade.executedPrice}
                </p>
              )}
              {lastTrade.fees && (
                <p className="text-sm text-muted-foreground">
                  Fees: ${lastTrade.fees}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}