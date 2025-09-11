import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';

export const TradingTest: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const runConnectionTest = async () => {
    setIsTesting(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Testing trade executor connection...');
      
      const result = await TradingGateway.testConnection();
      
      setTestResults(result);
      
      if (result.ok) {
        toast({
          title: "✅ Connection Test Passed",
          description: "Trade executor is working correctly",
          variant: "default",
        });
      } else {
        toast({
          title: "❌ Connection Test Failed",
          description: result.error || "Connection failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResults({ ok: false, error: error.message });
      toast({
        title: "❌ Test Error",
        description: error.message || "Test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runMockTrade = async () => {
    setIsTesting(true);
    
    try {
      console.log('🧪 Testing mock trade execution...');
      
      const result = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'BUY',
        amountUSD: 5,
        leverage: 1
      });
      
      setTestResults(result);
      
      if (result.ok) {
        toast({
          title: "✅ Mock Trade Successful",
          description: "Trade execution is working correctly",
          variant: "default",
        });
      } else {
        toast({
          title: "❌ Mock Trade Failed",
          description: result.message || "Trade failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResults({ ok: false, error: error.message });
      toast({
        title: "❌ Trade Test Error",
        description: error.message || "Test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>🧪 Trading System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button 
            onClick={runConnectionTest}
            disabled={isTesting}
            className="w-full"
            variant="outline"
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          
          <Button 
            onClick={runMockTrade}
            disabled={isTesting}
            className="w-full"
            variant="default"
          >
            {isTesting ? "Testing..." : "Test Mock Trade"}
          </Button>
        </div>
        
        {testResults && (
          <div className="mt-4 p-3 border rounded text-xs">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};