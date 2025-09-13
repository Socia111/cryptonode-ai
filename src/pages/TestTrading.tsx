import React, { useState } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { TradingTestHarness } from '@/components/TradingTestHarness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { tradingSettings } from '@/lib/tradingSettings';

const TestTrading = () => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runSmokeTest = async () => {
    setBusy(true);
    setResult(null);
    
    try {
      console.log('🧪 Smoke test start');
      const settings = tradingSettings.getSettings();
      console.log('📋 Global settings:', settings);

      // 1) Ping edge function
      const ping = await TradingGateway.testConnection();
      console.log('🔌 Connection:', ping);
      if (!ping?.ok) throw new Error(ping?.error || ping?.statusText || 'Connection failed');

      // 2) Build params — $1 scalp, 1x, Post-Only limit
      const symbol = 'BTCUSDT';
      const side: 'BUY' | 'SELL' = 'BUY';
      const mark = 45000; // Default mark price for testing
      const price = +(mark * 0.999).toFixed(2); // Maker-friendly (below mark)
      const { stopLoss, takeProfit } = tradingSettings.calculateRiskPrices(mark, 'Buy', 0.25, 0.5);

      const params = {
        symbol,
        side,
        amountUSD: 1,
        leverage: 1,
        orderType: 'Limit' as const,
        price,
        timeInForce: 'PostOnly' as const,
        stopLoss,
        takeProfit,
        entryPrice: price,
        scalpMode: true
      };

      console.log('📤 Exec params:', params);
      const out = await TradingGateway.execute(params);
      console.log('✅ Exec result:', out);
      setResult(out);

      toast({ 
        title: out.ok ? '✅ Smoke Test Passed' : '❌ Smoke Test Failed', 
        description: out.message || `${symbol} Post-Only Limit Test`,
        variant: out.ok ? 'default' : 'destructive'
      });
    } catch (e: any) {
      console.error('🚨 Smoke test error', e);
      toast({ 
        title: '🚨 Smoke Test Error', 
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
                Runs a $1 Post-Only limit order test with micro SL/TP to validate the entire pipeline.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={runSmokeTest} 
                  disabled={busy}
                  className="flex-1"
                >
                  {busy ? '🔄 Running...' : '🧪 Run Post-Only Limit Test ($1)'}
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
                    <li>• Amount validation & adjustment</li>
                    <li>• SL/TP calculation from global settings</li>
                    <li>• Parameter formatting & validation</li>
                    <li>• Edge function connectivity</li>
                    <li>• Complete execution pipeline logging</li>
                    <li>• Post-Only limit order placement</li>
                    <li>• Risk guard validation</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-600">⚠️ Testing Considerations:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Uses real Bybit API (testnet if configured)</li>
                    <li>• Check console logs for detailed debugging</li>
                    <li>• Start with small amounts ($1-5)</li>
                    <li>• Verify API credentials are set up</li>
                    <li>• Review all logs before live trading</li>
                    <li>• Post-Only may reject if price takes liquidity</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <TradingTestHarness />
        </div>
      </div>
    </MainLayout>
  );
};

export default TestTrading;