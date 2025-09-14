import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from './ui/use-toast';

export function BalanceChecker() {
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [environment, setEnvironment] = useState<string>('unknown');
  const { toast } = useToast();

  const checkBalance = async () => {
    setLoading(true);
    try {
      const result = await TradingGateway.getBalance();
      
      if (result.ok && result.data) {
        setBalance(result.data);
        toast({
          title: "Balance Updated",
          description: "Account balance refreshed successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Balance Check Failed",
          description: result.error || "Could not retrieve balance",
        });
      }
    } catch (error: any) {
      console.error('Balance check error:', error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: error.message || "Failed to connect to exchange",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const result = await TradingGateway.testConnection();
      if (result.ok && result.data) {
        setEnvironment(result.data.environment || 'unknown');
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const getBalanceStatus = () => {
    if (!balance) return { color: 'secondary', text: 'Unknown' };
    
    const available = parseFloat(balance.availableBalance || '0');
    if (available >= 25) return { color: 'default', text: 'Sufficient' };
    if (available >= 5) return { color: 'secondary', text: 'Limited' };
    return { color: 'destructive', text: 'Insufficient' };
  };

  const balanceStatus = getBalanceStatus();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Account Balance
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={checkBalance}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Environment Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={environment === 'testnet' ? 'secondary' : 'default'}>
              {environment === 'testnet' ? '🧪 Testnet' : '💰 Mainnet'}
            </Badge>
            {environment === 'testnet' && (
              <span className="text-xs text-muted-foreground">
                Safe testing environment
              </span>
            )}
          </div>

          {/* Balance Information */}
          {balance ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    ${parseFloat(balance.availableBalance || '0').toFixed(2)} USDT
                  </span>
                  <Badge variant={balanceStatus.color as any}>
                    {balanceStatus.text}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="font-mono text-sm">
                  ${parseFloat(balance.totalBalance || '0').toFixed(2)} USDT
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Click refresh to check balance
            </div>
          )}

          {/* Trading Recommendations */}
          {balance && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                {parseFloat(balance.availableBalance || '0') >= 25 ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Ready for normal trading ($25+)
                  </div>
                ) : parseFloat(balance.availableBalance || '0') >= 5 ? (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertCircle className="h-3 w-3" />
                    Use small amounts ($5-$24) or add funds
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    Add funds to start trading (min $5)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}