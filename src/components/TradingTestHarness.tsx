import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { tradingSettings } from '@/lib/tradingSettings';
import { Separator } from '@/components/ui/separator';

export const TradingTestHarness = () => {
  const [testParams, setTestParams] = useState({
    symbol: 'BTCUSDT',
    side: 'BUY' as 'BUY' | 'SELL',
    amountUSD: 10,
    leverage: 1,
    scalpMode: false,
    entryPrice: 45000,
    customSL: '',
    customTP: ''
  });
  
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runTest = async () => {
    setIsRunning(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Starting Trading Test Harness');
      
      // Step 1: Show current global settings
      const globalSettings = tradingSettings.getSettings();
      console.log('📋 Global Trading Settings:', globalSettings);
      
      // Step 2: Calculate risk prices manually
      const riskPrices = tradingSettings.calculateRiskPrices(
        testParams.entryPrice,
        testParams.side === 'BUY' ? 'Buy' : 'Sell',
        testParams.customSL ? parseFloat(testParams.customSL) : undefined,
        testParams.customTP ? parseFloat(testParams.customTP) : undefined
      );
      console.log('🎯 Calculated Risk Prices:', riskPrices);
      
      // Step 3: Prepare execution parameters
      const execParams = {
        symbol: testParams.symbol,
        side: testParams.side,
        amountUSD: testParams.amountUSD,
        leverage: testParams.leverage,
        scalpMode: testParams.scalpMode,
        entryPrice: testParams.entryPrice,
        stopLoss: testParams.customSL ? parseFloat(testParams.customSL) : undefined,
        takeProfit: testParams.customTP ? parseFloat(testParams.customTP) : undefined
      };
      
      console.log('📤 Execution Parameters:', execParams);
      
      // Step 4: Test connection first
      const connectionTest = await TradingGateway.testConnection();
      console.log('🔌 Connection Test:', connectionTest);
      
      if (!connectionTest.ok) {
        throw new Error(`Connection failed: ${connectionTest.error || connectionTest.statusText}`);
      }
      
      // Step 5: Execute the trade (this will be a real API call)
      const result = await TradingGateway.execute(execParams);
      console.log('✅ Final Execution Result:', result);
      
      setTestResults({
        globalSettings,
        riskPrices,
        execParams,
        connectionTest,
        executionResult: result,
        timestamp: new Date().toISOString()
      });
      
      if (result.ok) {
        toast({ 
          title: '✅ Test Trade Executed', 
          description: `${testParams.symbol} ${testParams.side} - Check console for details` 
        });
      } else {
        toast({ 
          title: '❌ Test Trade Failed', 
          description: result.message || 'Unknown error',
          variant: 'destructive'
        });
      }
      
    } catch (error: any) {
      console.error('🚨 Test Harness Error:', error);
      toast({ 
        title: '🚨 Test Error', 
        description: error.message,
        variant: 'destructive'
      });
      setTestResults({ error: error.message, timestamp: new Date().toISOString() });
    } finally {
      setIsRunning(false);
    }
  };

  const riskPrices = tradingSettings.calculateRiskPrices(
    testParams.entryPrice,
    testParams.side === 'BUY' ? 'Buy' : 'Sell'
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Trading Pipeline Test Harness
          <Badge variant="outline">Safe Testing Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Input 
              value={testParams.symbol}
              onChange={(e) => setTestParams(prev => ({ ...prev, symbol: e.target.value }))}
              placeholder="BTCUSDT"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Side</Label>
            <select 
              className="w-full p-2 border rounded"
              value={testParams.side}
              onChange={(e) => setTestParams(prev => ({ ...prev, side: e.target.value as 'BUY' | 'SELL' }))}
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Amount USD</Label>
            <Input 
              type="number"
              value={testParams.amountUSD}
              onChange={(e) => setTestParams(prev => ({ ...prev, amountUSD: parseFloat(e.target.value) }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Leverage</Label>
            <Input 
              type="number"
              value={testParams.leverage}
              onChange={(e) => setTestParams(prev => ({ ...prev, leverage: parseInt(e.target.value) }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Entry Price</Label>
            <Input 
              type="number"
              value={testParams.entryPrice}
              onChange={(e) => setTestParams(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) }))}
            />
          </div>
          
          <div className="space-y-2 flex items-center gap-2">
            <Switch 
              checked={testParams.scalpMode}
              onCheckedChange={(checked) => setTestParams(prev => ({ ...prev, scalpMode: checked }))}
            />
            <Label>Scalp Mode</Label>
          </div>
        </div>

        {/* Risk Management Preview */}
        <div className="bg-muted p-4 rounded">
          <h4 className="font-medium mb-2">📊 Risk Management Preview</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Stop Loss:</span>
              <div className="font-mono">${riskPrices.stopLoss?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Take Profit:</span>
              <div className="font-mono">${riskPrices.takeProfit?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Risk/Reward:</span>
              <div className="font-mono">
                {riskPrices.stopLoss && riskPrices.takeProfit && testParams.entryPrice 
                  ? (Math.abs(riskPrices.takeProfit - testParams.entryPrice) / Math.abs(testParams.entryPrice - riskPrices.stopLoss)).toFixed(2)
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={runTest}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? '🔄 Running Test...' : '🧪 Run Pipeline Test'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setTestResults(null)}
          >
            Clear Results
          </Button>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="space-y-4">
            <h4 className="font-medium">📋 Test Results</h4>
            <div className="bg-muted p-4 rounded space-y-2">
              <div className="font-mono text-xs">
                <div className="font-medium text-green-600">✅ Global Settings Loaded</div>
                <div className="font-medium text-green-600">✅ Risk Prices Calculated</div>
                <div className="font-medium text-green-600">✅ Parameters Prepared</div>
                <div className={`font-medium ${testResults.connectionTest?.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.connectionTest?.ok ? '✅' : '❌'} Connection Test
                </div>
                <div className={`font-medium ${testResults.executionResult?.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.executionResult?.ok ? '✅' : '❌'} Trade Execution
                </div>
              </div>
              
              {testResults.executionResult && (
                <div className="mt-4 p-2 bg-background rounded text-xs">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(testResults.executionResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};