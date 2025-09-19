import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Activity, Database, TrendingUp, AlertCircle } from 'lucide-react';

interface ExchangeStatus {
  exchange: string;
  status: 'active' | 'error' | 'disabled';
  last_update: string;
  symbols_tracked: number;
  error_count: number;
  last_error?: string;
}

interface LiveMarketData {
  id: string;
  exchange: string;
  symbol: string;
  price: number;
  volume: number;
  change_24h_percent: number;
  ema21: number;
  sma200: number;
  rsi_14: number;
  adx: number;
  created_at: string;
}

export function LiveExchangeFeed() {
  const [exchangeStatuses, setExchangeStatuses] = useState<ExchangeStatus[]>([]);
  const [marketData, setMarketData] = useState<LiveMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchExchangeStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_feed_status')
        .select('*')
        .order('exchange');

      if (error) throw error;
      setExchangeStatuses((data || []).map(item => ({
        ...item,
        status: (item.status as 'active' | 'error' | 'disabled') || 'disabled'
      })));
    } catch (err) {
      console.error('Error fetching exchange statuses:', err);
      setError('Failed to fetch exchange statuses');
    }
  };

  const fetchMarketData = async () => {
    try {
      const { data, error } = await supabase
        .from('live_market_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMarketData(data || []);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to fetch market data');
    }
  };

  const triggerLiveFeed = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('live-feed-trigger');
      
      if (error) throw error;
      
      setLastUpdate(new Date().toISOString());
      await fetchExchangeStatuses();
      await fetchMarketData();
      
    } catch (err) {
      console.error('Error triggering live feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger live feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeStatuses();
    fetchMarketData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchExchangeStatuses();
      fetchMarketData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'error': return 'destructive';
      case 'disabled': return 'secondary';
      default: return 'outline';
    }
  };

  const formatPrice = (price: number) => {
    if (price > 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(4)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getPercentColor = (percent: number) => {
    return percent >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Exchange Feed Control
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-sm text-muted-foreground">
                Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
            <Button 
              onClick={triggerLiveFeed} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {isLoading ? 'Fetching...' : 'Trigger Live Feed'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="exchanges" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="exchanges">Exchange Status</TabsTrigger>
              <TabsTrigger value="market">Market Data</TabsTrigger>
              <TabsTrigger value="signals">Signal Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="exchanges" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exchangeStatuses.map((exchange) => (
                  <Card key={exchange.exchange}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base capitalize">
                          {exchange.exchange}
                        </CardTitle>
                        <Badge variant={getStatusBadgeVariant(exchange.status)}>
                          {exchange.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Symbols:</span>
                        <span className="font-medium">{exchange.symbols_tracked}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Errors:</span>
                        <span className={exchange.error_count > 0 ? 'text-red-600' : 'text-green-600'}>
                          {exchange.error_count}
                        </span>
                      </div>
                      {exchange.last_update && (
                        <div className="text-xs text-muted-foreground">
                          Updated: {new Date(exchange.last_update).toLocaleString()}
                        </div>
                      )}
                      {exchange.last_error && (
                        <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                          {exchange.last_error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="market" className="space-y-4">
              <div className="grid gap-4">
                {marketData.slice(0, 20).map((data) => (
                  <Card key={data.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-center">
                        <div>
                          <div className="font-medium">{data.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {data.exchange}
                          </div>
                        </div>
                        
                        <div>
                          <div className="font-medium">{formatPrice(data.price)}</div>
                          <div className={`text-sm ${getPercentColor(data.change_24h_percent || 0)}`}>
                            {formatPercent(data.change_24h_percent || 0)}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Volume</div>
                          <div className="font-medium">
                            {data.volume ? data.volume.toLocaleString() : 'N/A'}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">RSI</div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {data.rsi_14 ? data.rsi_14.toFixed(1) : 'N/A'}
                            </span>
                            {data.rsi_14 && (
                              <Progress 
                                value={data.rsi_14} 
                                className="w-12 h-2"
                              />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">ADX</div>
                          <div className="font-medium">
                            {data.adx ? data.adx.toFixed(1) : 'N/A'}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Updated</div>
                          <div className="text-xs">
                            {new Date(data.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="signals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Signal Generation Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {marketData.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Live Market Points
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {exchangeStatuses.filter(e => e.status === 'active').length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Active Exchanges
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {exchangeStatuses.reduce((sum, e) => sum + e.symbols_tracked, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Symbols Tracked
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">CCXT Integration Status</h4>
                    <p className="text-sm text-muted-foreground">
                      The live exchange feed is now powered by CCXT library, providing unified access to:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Binance, Bybit, OKX, Coinbase, Kraken, KuCoin</li>
                      <li>• Real-time price data and technical indicators</li>
                      <li>• Volume analysis and volatility calculations</li>
                      <li>• Complete signal algorithm with confidence scoring</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}