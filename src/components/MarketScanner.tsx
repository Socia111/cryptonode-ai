import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Volume2,
  Activity,
  Star,
  PlayCircle,
  RefreshCw
} from 'lucide-react';
import { useMarketData } from '@/hooks/useMarketData';
import { useToast } from '@/hooks/use-toast';

interface ScannerFilters {
  minVolume: number;
  minChange: number;
  maxChange: number;
  sortBy: 'volume' | 'change_24h_percent' | 'price';
  sortOrder: 'asc' | 'desc';
  exchange: string;
}

export function MarketScanner() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ScannerFilters>({
    minVolume: 0,
    minChange: -100,
    maxChange: 100,
    sortBy: 'volume',
    sortOrder: 'desc',
    exchange: 'all'
  });
  const [scanning, setScanning] = useState(false);

  const { marketData, stats, loading, error, refreshData } = useMarketData();
  const { toast } = useToast();

  const filteredMarkets = marketData
    .filter(market => {
      if (searchTerm && !market.symbol.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (market.volume < filters.minVolume) return false;
      if (market.change_24h_percent < filters.minChange) return false;
      if (market.change_24h_percent > filters.maxChange) return false;
      if (filters.exchange !== 'all' && market.exchange !== filters.exchange) return false;
      return true;
    })
    .sort((a, b) => {
      const multiplier = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'volume':
          return (a.volume - b.volume) * multiplier;
        case 'change_24h_percent':
          return (a.change_24h_percent - b.change_24h_percent) * multiplier;
        case 'price':
          return (a.price - b.price) * multiplier;
        default:
          return 0;
      }
    });

  const runQuickScan = async () => {
    setScanning(true);
    try {
      toast({
        title: "🔍 Running Market Scan",
        description: "Scanning for trading opportunities..."
      });

      await refreshData();
      
      toast({
        title: "✅ Scan Complete",
        description: `Found ${filteredMarkets.length} markets matching criteria`
      });

    } catch (error) {
      toast({
        title: "❌ Scan Failed",
        description: "Failed to complete market scan",
        variant: "destructive"
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Controls */}
      <Card className="surface-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Market Scanner</CardTitle>
            <Button 
              onClick={runQuickScan}
              disabled={scanning}
              className="bg-primary hover:bg-primary/90"
            >
              {scanning ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              {scanning ? 'Scanning...' : 'Quick Scan'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.sortBy} onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="change_24h_percent">24h Change</SelectItem>
                <SelectItem value="price">Price</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.sortOrder} onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortOrder: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.exchange} onValueChange={(value) => setFilters(prev => ({ ...prev, exchange: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exchanges</SelectItem>
                <SelectItem value="bybit">Bybit</SelectItem>
                <SelectItem value="binance">Binance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="metric-label">Min Volume (USDT)</label>
              <Input
                type="number"
                value={filters.minVolume}
                onChange={(e) => setFilters(prev => ({ ...prev, minVolume: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="metric-label">Min 24h Change (%)</label>
              <Input
                type="number"
                value={filters.minChange}
                onChange={(e) => setFilters(prev => ({ ...prev, minChange: Number(e.target.value) }))}
                placeholder="-100"
              />
            </div>

            <div className="space-y-2">
              <label className="metric-label">Max 24h Change (%)</label>
              <Input
                type="number"
                value={filters.maxChange}
                onChange={(e) => setFilters(prev => ({ ...prev, maxChange: Number(e.target.value) }))}
                placeholder="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="metric-label">Total Markets</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {stats.totalMarkets}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="metric-label">Gainers</span>
              </div>
              <div className="text-2xl font-bold text-success mt-2">
                {stats.gainers}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="metric-label">Losers</span>
              </div>
              <div className="text-2xl font-bold text-destructive mt-2">
                {stats.losers}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="metric-label">Avg Volume</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                ${(stats.avgVolume / 1000000).toFixed(1)}M
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Markets List */}
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Markets ({filteredMarkets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Error loading market data: {error}</p>
              <Button onClick={refreshData} className="mt-4">
                Retry
              </Button>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No markets match your criteria</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMarkets.slice(0, 50).map((market) => (
                <div key={market.symbol} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {market.symbol.replace('USDT', '/USDT')}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {market.exchange}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Vol: ${(market.volume / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${market.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1">
                        {market.change_24h_percent >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={`text-sm font-medium ${
                          market.change_24h_percent >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {market.change_24h_percent >= 0 ? '+' : ''}{market.change_24h_percent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <Button size="sm" variant="outline">
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}