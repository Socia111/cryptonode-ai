
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Volume2, Target } from 'lucide-react';
import { useLivePrice } from '@/hooks/useLivePrice';

const TradingChart = () => {
  const { price: livePrice, exchange, change24h, isConnected } = useLivePrice();
  
  // Historical candle data (would come from Supabase candles_1m table)
  const chartData = [
    { time: '09:00', price: 42500, volume: 1200 },
    { time: '10:00', price: 43200, volume: 1400 },
    { time: '11:00', price: 41800, volume: 1100 },
    { time: '12:00', price: 44100, volume: 1600 },
    { time: '13:00', price: 45300, volume: 1800 },
    { time: '14:00', price: 44800, volume: 1500 },
    { time: '15:00', price: livePrice || 46200, volume: 2000 }, // Use live price for current candle
  ];

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

          <div className="flex space-x-3">
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-lg mb-2">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">AI Signal</p>
              <p className="text-sm font-semibold text-success">BUY</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-chart-volume/20 rounded-lg mb-2">
                <Volume2 className="w-5 h-5 text-chart-volume" />
              </div>
              <p className="text-xs text-muted-foreground">Volume</p>
              <p className="text-sm font-semibold trading-mono">1.2M</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              hide
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--success))" 
              strokeWidth={3}
              dot={false}
              strokeLinecap="round"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TradingChart;
