import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { TradingTestHarness } from '@/components/TradingTestHarness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TestTrading = () => {
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