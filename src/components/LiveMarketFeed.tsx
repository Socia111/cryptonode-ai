import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Volume2,
  Zap,
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
  lastUpdate: Date;
  trend: 'up' | 'down' | 'stable';
}

interface ExchangeStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing: number;
  symbolsTracked: number;
}

export function LiveMarketFeed() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeStatus[]>([
    { name: 'Bybit', status: 'connected', lastPing: 12, symbolsTracked: 245 },
    { name: 'Binance', status: 'connected', lastPing: 8, symbolsTracked: 312 },
    { name: 'OKX', status: 'connected', lastPing: 15, symbolsTracked: 189 },
    { name: 'Coinbase', status: 'disconnected', lastPing: 0, symbolsTracked: 0 }
  ]);
  const [feedActive, setFeedActive] = useState(true);
  const [updateCount, setUpdateCount] = useState(0);

  // Simulate real-time market data updates
  useEffect(() => {
    const generateMarketData = (): MarketData[] => {
      const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT'];
      
      return symbols.map(symbol => {
        const basePrice = symbol.startsWith('BTC') ? 42000 : 
                         symbol.startsWith('ETH') ? 2500 :
                         symbol.startsWith('SOL') ? 95 :
                         symbol.startsWith('ADA') ? 0.45 :
                         symbol.startsWith('DOT') ? 7.2 :
                         symbol.startsWith('AVAX') ? 38 :
                         symbol.startsWith('MATIC') ? 0.85 : 14.5;
        
        const variance = 0.02; // 2% variance
        const price = basePrice * (1 + (Math.random() - 0.5) * variance);
        const change24h = (Math.random() - 0.5) * 10; // -5% to +5%
        
        return {
          symbol,
          price,
          change24h,
          volume: Math.random() * 1000000,
          high24h: price * 1.03,
          low24h: price * 0.97,
          lastUpdate: new Date(),
          trend: change24h > 1 ? 'up' : change24h < -1 ? 'down' : 'stable'
        };
      });
    };

    setMarketData(generateMarketData());

    if (!feedActive) return;

    const interval = setInterval(() => {
      setMarketData(generateMarketData());
      setUpdateCount(prev => prev + 1);
      
      // Randomly update exchange ping times
      setExchanges(prev => prev.map(exchange => ({
        ...exchange,
        lastPing: exchange.status === 'connected' ? Math.floor(Math.random() * 30) + 5 : 0
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [feedActive]);

  const toggleFeed = () => {
    setFeedActive(!feedActive);
  };

  const totalVolume = marketData.reduce((sum, data) => sum + data.volume, 0);
  const gainers = marketData.filter(data => data.change24h > 0).length;
  const losers = marketData.filter(data => data.change24h < 0).length;

  return (
    <div className="space-y-6">
      {/* Feed Controls */}
      <Card className="surface-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Live Market Feed
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time multi-exchange market data streaming
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={feedActive ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'}>
                {feedActive ? (
                  <>
                    <Activity className="h-3 w-3 mr-1" />
                    LIVE
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    PAUSED
                  </>
                )}
              </Badge>
              <Button 
                onClick={toggleFeed}
                variant={feedActive ? "destructive" : "default"}
                size="sm"
              >
                {feedActive ? 'Pause Feed' : 'Resume Feed'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Volume2 className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-lg font-bold">${(totalVolume / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-muted-foreground">24h Volume</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-success" />
              <div className="text-lg font-bold">{gainers}</div>
              <div className="text-xs text-muted-foreground">Gainers</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingDown className="h-5 w-5 mx-auto mb-2 text-destructive" />
              <div className="text-lg font-bold">{losers}</div>
              <div className="text-xs text-muted-foreground">Losers</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 mx-auto mb-2 text-warning" />
              <div className="text-lg font-bold">{updateCount}</div>
              <div className="text-xs text-muted-foreground">Updates</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Status */}
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Exchange Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {exchanges.map((exchange) => (
              <div key={exchange.name} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{exchange.name}</span>
                  {exchange.status === 'connected' ? (
                    <Wifi className="h-4 w-4 text-success" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge 
                      variant="outline" 
                      className={
                        exchange.status === 'connected' 
                          ? 'bg-success/20 text-success border-success/30'
                          : 'bg-destructive/20 text-destructive border-destructive/30'
                      }
                    >
                      {exchange.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ping</span>
                    <span>{exchange.lastPing}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Symbols</span>
                    <span>{exchange.symbolsTracked}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Data Table */}
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Live Market Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {marketData.map((data) => (
              <div key={data.symbol} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Badge className="font-mono min-w-[80px]">{data.symbol}</Badge>
                  <div className="flex items-center gap-1">
                    {data.trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
                    {data.trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
                    {data.trend === 'stable' && <Activity className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-mono font-medium">${data.price.toFixed(data.price > 100 ? 0 : 3)}</div>
                    <div className="text-xs text-muted-foreground">Price</div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-medium ${data.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">24h Change</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-mono text-sm">${(data.volume / 1000000).toFixed(1)}M</div>
                    <div className="text-xs text-muted-foreground">Volume</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      H: ${data.high24h.toFixed(data.high24h > 100 ? 0 : 3)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      L: ${data.low24h.toFixed(data.low24h > 100 ? 0 : 3)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}