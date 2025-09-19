import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';
import { useToast } from '@/hooks/use-toast';
import { Play, TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function FakeTradeTest() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(50);
  const [leverage, setLeverage] = useState(1);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { executing, lastTrade, executeTrade } = useTradingExecutor();
  const { toast } = useToast();

  const runSingleTest = async () => {
    setIsRunning(true);
    
    try {
      console.log('🧪 Starting fake trade test...');
      
      const testParams = {
        symbol,
        side,
        amount,
        leverage,
        orderType: 'market' as const
      };

      const result = await executeTrade(testParams);
      
      const testResult = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        params: testParams,
        result,
        success: result.success
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      
      if (result.success) {
        toast({
          title: "✅ Test Trade Successful",
          description: `${symbol} ${side.toUpperCase()} - $${amount} USDT executed`,
        });
      } else {
        toast({
          title: "❌ Test Trade Failed", 
          description: result.message,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Test trade error:', error);
      
      const testResult = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        params: { symbol, side, amount, leverage },
        result: { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
        success: false
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      
      toast({
        title: "❌ Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const testCases = [
      { symbol: 'BTCUSDT', side: 'buy' as const, amount: 25 },
      { symbol: 'ETHUSDT', side: 'buy' as const, amount: 50 },
      { symbol: 'BNBUSDT', side: 'sell' as const, amount: 30 },
      { symbol: 'ADAUSDT', side: 'buy' as const, amount: 75 },
    ];

    for (const testCase of testCases) {
      try {
        console.log(`🧪 Testing: ${testCase.symbol} ${testCase.side} $${testCase.amount}`);
        
        const result = await executeTrade({
          ...testCase,
          leverage: 1,
          orderType: 'market'
        });
        
        const testResult = {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          params: testCase,
          result,
          success: result.success
        };
        
        setTestResults(prev => [testResult, ...prev]);
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Test case failed: ${testCase.symbol}`, error);
        
        const testResult = {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          params: testCase,
          result: { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
          success: false
        };
        
        setTestResults(prev => [testResult, ...prev]);
      }
    }
    
    setIsRunning(false);
    
    const successCount = testResults.filter(r => r.success).length;
    const totalTests = testCases.length;
    
    toast({
      title: "🧪 Comprehensive Test Complete",
      description: `${successCount}/${totalTests} tests passed`,
      variant: successCount === totalTests ? "default" : "destructive"
    });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Fake Trade Testing
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test trading functionality with paper trades before going live
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                  <SelectItem value="BNBUSDT">BNBUSDT</SelectItem>
                  <SelectItem value="ADAUSDT">ADAUSDT</SelectItem>
                  <SelectItem value="LINKUSDT">LINKUSDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="side">Side</Label>
              <Select value={side} onValueChange={(value: 'buy' | 'sell') => setSide(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amount">Amount (USDT)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="1"
                max="1000"
              />
            </div>
            
            <div>
              <Label htmlFor="leverage">Leverage</Label>
              <Select value={leverage.toString()} onValueChange={(value) => setLeverage(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={runSingleTest}
              disabled={isRunning || executing}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? "Testing..." : "Run Single Test"}
            </Button>
            
            <Button
              onClick={runComprehensiveTest}
              disabled={isRunning || executing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {isRunning ? "Running..." : "Comprehensive Test"}
            </Button>
            
            {testResults.length > 0 && (
              <Button
                onClick={clearResults}
                variant="outline"
                size="sm"
              >
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Results
              <Badge variant="outline">
                {testResults.filter(r => r.success).length}/{testResults.length} passed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((test) => (
                <div key={test.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {test.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {test.params.symbol} {test.params.side.toUpperCase()} ${test.params.amount}
                      </span>
                      <Badge variant={test.success ? "default" : "destructive"} className="text-xs">
                        {test.success ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {test.timestamp}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>{test.result.message}</p>
                    {test.result.orderId && (
                      <p className="text-xs">Order ID: {test.result.orderId}</p>
                    )}
                    {test.result.executedPrice && (
                      <p className="text-xs">Price: ${test.result.executedPrice}</p>
                    )}
                  </div>
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
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Last Trade Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {lastTrade.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={lastTrade.success ? "default" : "destructive"}>
                {lastTrade.success ? "SUCCESS" : "FAILED"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{lastTrade.message}</p>
            {lastTrade.orderId && (
              <p className="text-xs text-muted-foreground mt-1">
                Order ID: {lastTrade.orderId}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}