
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Volume2, Target } from 'lucide-react';
import { useLivePrice } from '@/hooks/useLivePrice';

const TradingChart = () => {
  const { price: livePrice, exchange, change24h, isConnected } = useLivePrice();
  
  // No mock data - chart will show live data when available

  const currentPrice = livePrice || 46200;
  const priceChange = Math.abs(change24h) * currentPrice / 100;
  const percentChange = change24h;

  return (
    <Card className="glass-card h-[500px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Bitcoin (BTC/USDT)
                {exchange && (
                  <span className="text-xs px-2 py-1 rounded bg-accent/50 text-accent-foreground capitalize">
                    {exchange}
                  </span>
                )}
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
              </CardTitle>
              <div className="flex items-center space-x-4 mt-2">
                <span className="price-display text-3xl text-success">
                  ${currentPrice.toLocaleString()}
                </span>
                <div className="flex items-center space-x-2">
                  {percentChange >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-destructive rotate-180" />
                  )}
                  <span className={`trading-mono ${percentChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {percentChange >= 0 ? '+' : ''}${priceChange.toFixed(0)} ({percentChange.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

        </div>
      </CardHeader>

      <CardContent className="p-0 h-[350px]">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chart data will be displayed here</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingChart;
