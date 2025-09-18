import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketData {
  symbol: string;
  price: number;
  change_24h: number;
  change_24h_percent: number;
  volume: number;
  high_24h: number;
  low_24h: number;
  bid: number;
  ask: number;
  exchange: string;
  updated_at: string;
}

interface MarketStats {
  totalMarkets: number;
  gainers: number;
  losers: number;
  avgVolume: number;
  topGainer: MarketData | null;
  topLoser: MarketData | null;
}

export function useMarketData(symbols: string[] = []) {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query for live market data
      let query = supabase
        .from('live_market_data')
        .select('*')
        .order('volume', { ascending: false })
        .limit(100);

      // Filter by symbols if provided
      if (symbols.length > 0) {
        query = query.in('symbol', symbols);
      }

      const { data, error: marketError } = await query;

      if (marketError) throw marketError;

      const formattedData: MarketData[] = (data || []).map(item => ({
        symbol: item.symbol,
        price: Number(item.price),
        change_24h: Number(item.change_24h || 0),
        change_24h_percent: Number(item.change_24h_percent || 0),
        volume: Number(item.volume || 0),
        high_24h: Number(item.high_24h || 0),
        low_24h: Number(item.low_24h || 0),
        bid: Number(item.bid || 0),
        ask: Number(item.ask || 0),
        exchange: item.exchange || 'bybit',
        updated_at: item.updated_at
      }));

      setMarketData(formattedData);
      calculateStats(formattedData);
      setLastUpdate(new Date());

    } catch (err: any) {
      console.error('Failed to load market data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: MarketData[]) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const gainers = data.filter(m => m.change_24h_percent > 0).length;
    const losers = data.filter(m => m.change_24h_percent < 0).length;
    const avgVolume = data.reduce((sum, m) => sum + m.volume, 0) / data.length;

    const topGainer = data.reduce((max, current) => 
      current.change_24h_percent > (max?.change_24h_percent || -Infinity) ? current : max
    , null as MarketData | null);

    const topLoser = data.reduce((min, current) => 
      current.change_24h_percent < (min?.change_24h_percent || Infinity) ? current : min
    , null as MarketData | null);

    setStats({
      totalMarkets: data.length,
      gainers,
      losers,
      avgVolume,
      topGainer,
      topLoser
    });
  };

  // Set up real-time subscriptions
  useEffect(() => {
    loadMarketData();

    const channel = supabase
      .channel('market-data-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_market_data'
        },
        (payload) => {
          console.log('📊 Market data updated:', payload.new);
          
          if (payload.new) {
            setMarketData(prev => {
              const updated = prev.map(item => 
                item.symbol === payload.new.symbol 
                  ? {
                      symbol: payload.new.symbol,
                      price: Number(payload.new.price),
                      change_24h: Number(payload.new.change_24h || 0),
                      change_24h_percent: Number(payload.new.change_24h_percent || 0),
                      volume: Number(payload.new.volume || 0),
                      high_24h: Number(payload.new.high_24h || 0),
                      low_24h: Number(payload.new.low_24h || 0),
                      bid: Number(payload.new.bid || 0),
                      ask: Number(payload.new.ask || 0),
                      exchange: payload.new.exchange || 'bybit',
                      updated_at: payload.new.updated_at
                    }
                  : item
              );
              
              calculateStats(updated);
              setLastUpdate(new Date());
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(loadMarketData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [symbols.join(',')]);

  return {
    marketData,
    stats,
    loading,
    error,
    lastUpdate,
    refreshData: loadMarketData
  };
}

// Hook for getting specific symbol data
export function useSymbolPrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;

    const loadPrice = async () => {
      try {
        const { data, error } = await supabase
          .from('live_market_data')
          .select('price, change_24h_percent')
          .eq('symbol', symbol)
          .single();

        if (error) throw error;

        if (data) {
          setPrice(Number(data.price));
          setChange24h(Number(data.change_24h_percent || 0));
        }
      } catch (err) {
        console.error(`Failed to load price for ${symbol}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadPrice();

    const channel = supabase
      .channel(`price-${symbol}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_market_data',
          filter: `symbol=eq.${symbol}`
        },
        (payload) => {
          if (payload.new) {
            setPrice(Number(payload.new.price));
            setChange24h(Number(payload.new.change_24h_percent || 0));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol]);

  return {
    price,
    change24h,
    loading
  };
}