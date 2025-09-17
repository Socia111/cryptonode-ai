import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TradeResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const TradeTestPanel = () => {
  const [testing, setTesting] = useState(false);
  const [testAmount, setTestAmount] = useState(25);
  const [testLeverage, setTestLeverage] = useState(1);
  const [lastResult, setLastResult] = useState<TradeResult | null>(null);
  const { toast } = useToast();

  const testRealSignalExecution = async () => {
    setTesting(true);
    try {
      console.log('🧪 Testing real signal execution pipeline...');
      
      // Step 1: Get fresh real signals
      const { data: signalsData, error: signalsError } = await supabase.functions.invoke('signals-api', {
        body: { action: 'recent' }
      });
      
      if (signalsError || !signalsData?.signals?.length) {
        throw new Error('No real signals available for testing');
      }
      
      const signal = signalsData.signals[0]; // Use first signal
      console.log('📊 Testing with signal:', signal);
      
      // Step 2: Test trade executor status
      const { data: statusData, error: statusError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });
      
      if (statusError) {
        throw new Error(`Trade executor status check failed: ${statusError.message}`);
      }
      
      console.log('⚙️ Trade executor status:', statusData);
      
      // Step 3: Execute test trade based on signal
      const { data: tradeData, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: signal.symbol,
          side: signal.direction,
          amountUSD: testAmount,
          leverage: testLeverage
        }
      });
      
      if (tradeError) {
        throw new Error(`Trade execution failed: ${tradeError.message}`);
      }
      
      console.log('✅ Trade execution result:', tradeData);
      
      setLastResult({ success: true, data: tradeData });
      
      toast({
        title: "Trade Test Successful",
        description: `${tradeData.data?.paperMode ? 'Paper' : 'Live'} trade executed: ${signal.symbol} ${signal.direction} $${testAmount}`,
      });
      
    } catch (error: any) {
      console.error('❌ Trade test failed:', error);
      setLastResult({ success: false, error: error.message });
      
      toast({
        title: "Trade Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Real Signal → Trade Pipeline Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="testAmount">Test Amount (USD)</Label>
            <Input
              id="testAmount"
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              min={5}
              max={100}
            />
          </div>
          <div>
            <Label htmlFor="testLeverage">Leverage</Label>
            <Input
              id="testLeverage"
              type="number"
              value={testLeverage}
              onChange={(e) => setTestLeverage(Number(e.target.value))}
              min={1}
              max={10}
            />
          </div>
        </div>
        
        <Button 
          onClick={testRealSignalExecution}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing Pipeline...' : 'Test Real Signal → Trade Execution'}
        </Button>
        
        {lastResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                {lastResult.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            
            {lastResult.success ? (
              <div className="space-y-2">
                <p><strong>Order ID:</strong> {lastResult.data?.data?.orderId}</p>
                <p><strong>Symbol:</strong> {lastResult.data?.data?.symbol}</p>
                <p><strong>Side:</strong> {lastResult.data?.data?.side}</p>
                <p><strong>Amount:</strong> ${lastResult.data?.data?.amount}</p>
                <p><strong>Status:</strong> {lastResult.data?.data?.status}</p>
                <p><strong>Mode:</strong> {lastResult.data?.data?.paperMode ? 'Paper Trading' : 'Live Trading'}</p>
              </div>
            ) : (
              <p className="text-red-600">{lastResult.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};