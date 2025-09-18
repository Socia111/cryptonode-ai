import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, DollarSign, Activity, AlertCircle, Play, Square } from 'lucide-react';

interface Signal {
  id: string;
  symbol: string;
  direction: string;
  score: number;
  price: number;
  created_at: string;
  algo: string;
  timeframe: string;
}

interface TradeAccount {
  id: string;
  exchange: string;
  account_type: string;
  is_active: boolean;
}

export const CleanTradingDashboard = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<'idle' | 'running' | 'error'>('idle');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load recent signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (signalsError) throw signalsError;

      // Load trading accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      setSignals(signalsData || []);
      setAccounts(accountsData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTradeExecution = async () => {
    try {
      setSystemStatus('running');
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 10,
          testMode: true
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setSystemStatus('idle');
        alert('Test trade executed successfully!');
      } else {
        throw new Error(data?.error || 'Trade execution failed');
      }
    } catch (err: any) {
      setSystemStatus('error');
      setError(err.message);
    }
  };

  const generateSignals = async () => {
    try {
      setSystemStatus('running');
      const { data, error } = await supabase.functions.invoke('aitradex1-original-scanner', {
        body: {
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
          timeframes: ['1h', '4h'],
          algorithm: 'unirail_core'
        }
      });

      if (error) throw error;
      
      setSystemStatus('idle');
      await loadDashboardData(); // Refresh signals
    } catch (err: any) {
      setSystemStatus('error');
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={systemStatus === 'running' ? 'default' : systemStatus === 'error' ? 'destructive' : 'secondary'}>
              {systemStatus === 'running' ? 'Running' : systemStatus === 'error' ? 'Error' : 'Ready'}
            </Badge>
            <div className="flex gap-2">
              <Button
                onClick={generateSignals}
                disabled={systemStatus === 'running'}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Generate Signals
              </Button>
              <Button
                onClick={testTradeExecution}
                disabled={systemStatus === 'running'}
                variant="outline"
                size="sm"
              >
                Test Trade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Signals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signals.length}</div>
            <p className="text-xs text-muted-foreground">Recent trading signals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Accounts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Connected exchanges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus === 'error' ? 'Error' : 'Good'}
            </div>
            <p className="text-xs text-muted-foreground">Overall status</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="signals" className="w-full">
        <TabsList>
          <TabsTrigger value="signals">Recent Signals</TabsTrigger>
          <TabsTrigger value="accounts">Trading Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trading Signals</CardTitle>
              <CardDescription>Latest signals from the AI trading system</CardDescription>
            </CardHeader>
            <CardContent>
              {signals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No signals available. Click "Generate Signals" to create new ones.
                </div>
              ) : (
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={signal.direction === 'bullish' ? 'default' : 'secondary'}>
                          {signal.symbol}
                        </Badge>
                        <span className="font-medium">{signal.direction}</span>
                        <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono">${signal.price}</span>
                        <Badge variant="outline">Score: {signal.score}</Badge>
                        <span className="text-xs text-muted-foreground">{signal.algo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Accounts</CardTitle>
              <CardDescription>Connected exchange accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trading accounts configured. Set up your exchange connections.
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge>{account.exchange}</Badge>
                        <span className="text-sm">{account.account_type}</span>
                      </div>
                      <Badge variant={account.is_active ? 'default' : 'secondary'}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};