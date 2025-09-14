import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function SignalExecutionTest() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [amount, setAmount] = useState('25');
  const { toast } = useToast();

  const testSignalExecution = async () => {
    setIsExecuting(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing signal execution with params:', {
        symbol,
        side,
        amountUSD: parseFloat(amount)
      });

      const result = await TradingGateway.execute({
        symbol,
        side,
        amountUSD: parseFloat(amount),
        leverage: 1,
        orderType: 'Market'
      });

      setResult(result);
      
      if (result.ok) {
        toast({
          title: "✅ Signal Execution Test Successful",
          description: `${symbol} ${side} order executed successfully`,
          variant: "default",
        });
      } else {
        toast({
          title: "❌ Signal Execution Test Failed",
          description: result.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      const errorResult = { ok: false, error: error.message };
      setResult(errorResult);
      
      toast({
        title: "❌ Test Execution Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const testConnection = async () => {
    setIsExecuting(true);
    try {
      const result = await TradingGateway.testConnection();
      setResult(result);
      
      if (result.ok) {
        toast({
          title: "✅ Connection Test Successful",
          description: "Trading gateway is responding",
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
      toast({
        title: "❌ Connection Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Signal Execution Test
          <Badge variant="outline">Debug Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                <SelectItem value="ADAUSDT">ADAUSDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="side">Side</Label>
            <Select value={side} onValueChange={(value) => setSide(value as 'Buy' | 'Sell')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="5"
            step="1"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={testConnection}
            variant="outline"
            disabled={isExecuting}
            className="flex-1"
          >
            {isExecuting ? 'Testing...' : 'Test Connection'}
          </Button>
          
          <Button
            onClick={testSignalExecution}
            disabled={isExecuting}
            className="flex-1"
          >
            {isExecuting ? 'Executing...' : 'Execute Test Signal'}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-muted rounded-lg border">
            <h4 className="font-semibold mb-2">Test Result:</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}