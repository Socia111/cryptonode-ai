import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { Zap, Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TradeExecution {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amountUSD: number;
  leverage: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: string;
}

const LiveTradeExecutor = () => {
  const [executions, setExecutions] = useState<TradeExecution[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const result = await TradingGateway.testConnection();
      setIsConnected(result.ok);
      if (!result.ok) {
        console.warn('Trading connection issue:', result);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
    }
  };

  const executeTestTrade = async () => {
    const newExecution: TradeExecution = {
      id: crypto.randomUUID(),
      symbol: 'BTCUSDT',
      side: 'BUY',
      amountUSD: 25,
      leverage: 3,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    setExecutions(prev => [newExecution, ...prev.slice(0, 9)]);

    // Update to executing
    setExecutions(prev => prev.map(e => 
      e.id === newExecution.id ? { ...e, status: 'executing' } : e
    ));

    try {
      const result = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'BUY',
        amountUSD: 25,
        leverage: 3
      });

      if (result.ok) {
        setExecutions(prev => prev.map(e => 
          e.id === newExecution.id ? { 
            ...e, 
            status: 'completed', 
            result: result.data 
          } : e
        ));
        
        toast({
          title: "✅ Test Trade Executed",
          description: "BTC/USDT buy order placed successfully",
          variant: "default",
        });
      } else {
        setExecutions(prev => prev.map(e => 
          e.id === newExecution.id ? { 
            ...e, 
            status: 'failed', 
            error: result.message 
          } : e
        ));
        
        toast({
          title: "❌ Test Trade Failed",
          description: result.message || 'Unknown error',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setExecutions(prev => prev.map(e => 
        e.id === newExecution.id ? { 
          ...e, 
          status: 'failed', 
          error: error.message 
        } : e
      ));
      
      toast({
        title: "❌ Test Trade Error",
        description: error.message || 'Network error',
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'executing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'executing': return 'bg-blue-500/10 border-blue-500/20';
      case 'completed': return 'bg-green-500/10 border-green-500/20';
      case 'failed': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-muted/50';
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-primary" />
            <span>Live Trade Executor</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="text-xs"
            >
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Button
              onClick={executeTestTrade}
              disabled={!isConnected}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Zap className="w-4 h-4 mr-1" />
              Test Trade
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {executions.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              No trade executions yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Test Trade" to execute a sample order
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <div 
                key={execution.id}
                className={`p-3 rounded-lg border ${getStatusColor(execution.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(execution.status)}
                    <span className="font-medium">{execution.symbol}</span>
                    <Badge variant={execution.side === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                      {execution.side}
                    </Badge>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(execution.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-mono">${execution.amountUSD}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Leverage</p>
                    <p className="font-mono">{execution.leverage}x</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="capitalize">{execution.status}</p>
                  </div>
                </div>
                
                {execution.error && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-600">
                    Error: {execution.error}
                  </div>
                )}
                
                {execution.result && (
                  <div className="mt-2 p-2 bg-green-500/10 rounded text-xs text-green-600">
                    ✅ Order ID: {execution.result.orderId || 'Success'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveTradeExecutor;