import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  Square, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface TradeResult {
  success: boolean;
  trade_id?: string;
  paper_mode: boolean;
  message: string;
  execution_time_ms?: number;
  avg_price?: string;
  executed_qty?: string;
  result?: any;
}

export function EnhancedTradeTest() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResult, setTestResult] = useState<TradeResult | null>(null);
  
  // Test parameters
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amountUsd, setAmountUsd] = useState(10);
  const [leverage, setLeverage] = useState(1);
  const [paperMode, setPaperMode] = useState(true);
  
  const { toast } = useToast();

  const executeTestTrade = async () => {
    setIsExecuting(true);
    setTestResult(null);

    try {
      console.log('🧪 Starting enhanced trade test...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const tradePayload = {
        action: 'execute_trade',
        symbol: symbol.toUpperCase(),
        side,
        amount_usd: amountUsd,
        leverage,
        paper_mode: paperMode,
        user_id: user?.id
      };

      console.log('📋 Trade payload:', tradePayload);

      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: tradePayload
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Trade response:', data);
      setTestResult(data);

      toast({
        title: data.success ? "Trade Executed" : "Trade Failed",
        description: `${data.message} ${data.execution_time_ms ? `(${data.execution_time_ms}ms)` : ''}`,
        variant: data.success ? "default" : "destructive",
      });

    } catch (error) {
      console.error('❌ Trade test failed:', error);
      
      const errorResult: TradeResult = {
        success: false,
        paper_mode: paperMode,
        message: error.message || 'Unknown error occurred'
      };
      
      setTestResult(errorResult);
      
      toast({
        title: "Trade Test Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const resetTest = () => {
    setTestResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Enhanced Trade Execution Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                disabled={isExecuting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={amountUsd}
                onChange={(e) => setAmountUsd(parseFloat(e.target.value))}
                disabled={isExecuting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leverage">Leverage</Label>
              <Input
                id="leverage"
                type="number"
                min="1"
                max="20"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                disabled={isExecuting}
              />
            </div>

            <div className="space-y-2">
              <Label>Paper Mode</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={paperMode}
                  onCheckedChange={setPaperMode}
                  disabled={isExecuting}
                />
                <span className="text-sm text-muted-foreground">
                  {paperMode ? 'Paper Trading' : 'Live Trading'}
                </span>
              </div>
            </div>
          </div>

          {/* Trade Direction */}
          <div className="space-y-2">
            <Label>Trade Direction</Label>
            <div className="flex gap-2">
              <Button
                variant={side === 'BUY' ? 'default' : 'outline'}
                onClick={() => setSide('BUY')}
                disabled={isExecuting}
                className="flex-1"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                BUY (Long)
              </Button>
              <Button
                variant={side === 'SELL' ? 'default' : 'outline'}
                onClick={() => setSide('SELL')}
                disabled={isExecuting}
                className="flex-1"
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                SELL (Short)
              </Button>
            </div>
          </div>

          {/* Execute Button */}
          <div className="flex gap-2">
            <Button
              onClick={executeTestTrade}
              disabled={isExecuting}
              className="flex-1"
              size="lg"
            >
              {isExecuting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Test Trade
                </>
              )}
            </Button>

            {testResult && (
              <Button
                onClick={resetTest}
                variant="outline"
                size="lg"
              >
                <Square className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card className={`border-2 ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Test Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "SUCCESS" : "FAILED"}
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Mode</Label>
                <Badge variant="outline">
                  {testResult.paper_mode ? "Paper Trading" : "Live Trading"}
                </Badge>
              </div>

              {testResult.execution_time_ms && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Execution Time</Label>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm font-mono">{testResult.execution_time_ms}ms</span>
                  </div>
                </div>
              )}

              {testResult.trade_id && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Trade ID</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                    {testResult.trade_id}
                  </code>
                </div>
              )}
            </div>

            {testResult.avg_price && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Average Price</Label>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="font-mono">{testResult.avg_price}</span>
                  </div>
                </div>

                {testResult.executed_qty && (
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Executed Quantity</Label>
                    <span className="font-mono">{testResult.executed_qty}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Message</Label>
              <p className="text-sm">{testResult.message}</p>
            </div>

            {testResult.result && (
              <details className="space-y-2">
                <summary className="text-sm font-medium cursor-pointer">
                  Raw Response (Click to expand)
                </summary>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(testResult.result, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}