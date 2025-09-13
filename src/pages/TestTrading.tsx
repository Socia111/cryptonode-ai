import React, { useState } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { TradingTestHarness } from '@/components/TradingTestHarness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { type ExecResult, type OrderTIF } from '@/lib/tradingTypes';
import { tradingSettings } from '@/lib/tradingSettings';
import { TradingErrorFixTest } from '@/components/TradingErrorFixTest';
import { ComprehensiveErrorFixTest } from '@/components/ComprehensiveErrorFixTest';

const TestTrading = () => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [testParams, setTestParams] = useState({
    symbol: 'BTCUSDT',
    side: 'BUY' as 'BUY'|'SELL',
    amountUSD: 5,
    leverage: 5,
    scalpMode: false,
    // Limit test inputs:
    useLimit: true,
    timeInForce: 'PostOnly' as OrderTIF,
  });

  const runSmokeTest = async () => {
    setBusy(true);
    setResult(null);
    
    try {
      console.log('🔥 Smoke: start');

      // 1) connection
      const ping: ExecResult = await TradingGateway.testConnection();
      if (!ping.ok) throw new Error(`Connection failed: ${ping.error || ping.message || 'unknown'}`);
      console.log('🔌 OK connection', ping);

      // 2) calc risk - use a fixed test price for deterministic results
      const testPrice = 45000; // Fixed test price
      const entry = testParams.useLimit ? testPrice : testPrice;
      const side = testParams.side === 'BUY' ? 'Buy' : 'Sell' as const;
      const risk = tradingSettings.calculateRiskPrices(entry, side, undefined, undefined, testParams.scalpMode);
      console.log('🎯 risk', risk);

      // 3) place tiny post-only limit (no fill if crossed)
      const res = await TradingGateway.execute({
        symbol: testParams.symbol,
        side,
        amountUSD: testParams.amountUSD,
        leverage: testParams.leverage,
        orderType: testParams.useLimit ? 'Limit' : 'Market',
        price: entry,
        timeInForce: testParams.timeInForce,
        stopLoss: risk.stopLoss,
        takeProfit: risk.takeProfit,
        scalpMode: testParams.scalpMode
      });

      console.log('✅ execute result', res);
      if (!res.ok) throw new Error(res.error || res.message || 'execution error');

      setResult(res);
      toast({ 
        title: 'Smoke test OK', 
        description: `${testParams.symbol} ${side} - Check console for details` 
      });
    } catch (e: any) {
      console.error('🚨 Smoke failed', e);
      toast({ 
        title: 'Smoke test failed', 
        description: e.message, 
        variant: 'destructive' 
      });
      setResult({ ok: false, error: e.message });
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🧪 Trading Pipeline Debugger</h1>
          <p className="text-muted-foreground">
            Test and debug your trading execution flow step-by-step
          </p>
        </div>

        <div className="grid gap-6">
          {/* Smoke Test Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Quick Smoke Test
                <Badge variant="outline">5-Minute Validation</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Runs a deterministic Post-Only limit order test with micro SL/TP to validate the entire pipeline.
              </p>
              
              {/* Test Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <select 
                    className="w-full p-2 border rounded text-sm"
                    value={testParams.symbol}
                    onChange={(e) => setTestParams(prev => ({ ...prev, symbol: e.target.value }))}
                  >
                    <option value="BTCUSDT">BTCUSDT</option>
                    <option value="ETHUSDT">ETHUSDT</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Side</Label>
                  <select 
                    className="w-full p-2 border rounded text-sm"
                    value={testParams.side}
                    onChange={(e) => setTestParams(prev => ({ ...prev, side: e.target.value as 'BUY' | 'SELL' }))}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
                
                <div className="space-y-2 flex items-center gap-2">
                  <Switch 
                    checked={testParams.useLimit}
                    onCheckedChange={(checked) => setTestParams(prev => ({ ...prev, useLimit: checked }))}
                  />
                  <Label>Use Limit (Post-Only)</Label>
                </div>
                
                <div className="space-y-2 flex items-center gap-2">
                  <Switch 
                    checked={testParams.scalpMode}
                    onCheckedChange={(checked) => setTestParams(prev => ({ ...prev, scalpMode: checked }))}
                  />
                  <Label>Scalp Mode</Label>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={runSmokeTest} 
                  disabled={busy}
                  className="flex-1"
                >
                  {busy ? '🔄 Running...' : '🧪 Run Post-Only Limit Test'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setResult(null)}
                  disabled={!result}
                >
                  Clear
                </Button>
              </div>
              
              {result && (
                <div className="bg-muted p-4 rounded">
                  <h4 className="font-medium mb-2">📋 Smoke Test Result</h4>
                  <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    Open DevTools → Console for detailed pipeline logs
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚠️ Important Testing Guidelines
                <Badge variant="secondary">Read First</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">✅ What This Tests:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Connection to edge function</li>
                    <li>• SL/TP calculation (0.35%/0.70% scalp mode)</li>
                    <li>• Post-Only limit order placement</li>
                    <li>• Parameter forwarding & validation</li>
                    <li>• Complete execution pipeline logging</li>
                    <li>• Risk management integration</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-600">⚠️ Expected Results:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Console: connection → risk → execute result</li>
                    <li>• Result: ok: true with order details</li>
                    <li>• Post-Only may reject if price crosses</li>
                    <li>• Check SL/TP attachment in response</li>
                    <li>• Verify order type and timeInForce</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <ComprehensiveErrorFixTest />
          <TradingErrorFixTest />
          <TradingTestHarness />
        </div>
      </div>
    </MainLayout>
  );
};

export default TestTrading;