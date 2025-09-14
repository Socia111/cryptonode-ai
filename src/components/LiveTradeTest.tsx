import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TradeResult {
  ok: boolean;
  mode?: string;
  trade?: any;
  orderId?: string;
  bybitResponse?: any;
  error?: string;
}

export function LiveTradeTest() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<TradeResult | null>(null);
  const [params, setParams] = useState({
    symbol: 'BTCUSDT',
    side: 'Buy',
    amountUSD: 10,
    leverage: 1,
    orderType: 'Market'
  });

  const executeTest = async () => {
    setIsExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('trade-executor', {
        body: {
          action: 'place_order',
          ...params
        }
      });

      if (error) {
        setResult({ ok: false, error: error.message });
        return;
      }

      setResult(data);
    } catch (err: any) {
      setResult({ ok: false, error: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Live Trade Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <Select value={params.symbol} onValueChange={(value) => setParams({...params, symbol: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="side">Side</Label>
            <Select value={params.side} onValueChange={(value) => setParams({...params, side: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="amount">Amount USD</Label>
            <Input
              type="number"
              value={params.amountUSD}
              onChange={(e) => setParams({...params, amountUSD: Number(e.target.value)})}
              min="1"
              max="100"
            />
          </div>
          
          <div>
            <Label htmlFor="leverage">Leverage</Label>
            <Input
              type="number"
              value={params.leverage}
              onChange={(e) => setParams({...params, leverage: Number(e.target.value)})}
              min="1"
              max="10"
            />
          </div>
        </div>

        <Button 
          onClick={executeTest} 
          disabled={isExecuting}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing Trade...
            </>
          ) : (
            'Execute Live Trade'
          )}
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {result.ok ? 'Trade Executed Successfully' : 'Trade Failed'}
              </span>
              {result.mode && (
                <Badge variant={result.mode === 'live' ? 'default' : 'secondary'}>
                  {result.mode.toUpperCase()}
                </Badge>
              )}
            </div>

            {result.ok && result.orderId && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Order ID:</strong> {result.orderId}
                </p>
                {result.trade && (
                  <p className="text-xs text-green-700 mt-1">
                    {result.trade.side} {result.trade.amountUSD} USD of {result.trade.symbol} @ {result.trade.leverage}x leverage
                  </p>
                )}
              </div>
            )}

            {!result.ok && result.error && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}

            {result.bybitResponse && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Bybit Response</summary>
                <pre className="mt-2 bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(result.bybitResponse, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}