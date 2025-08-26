
import React from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const MarketOverview = () => {
  const marketStats = [
    {
      label: 'Total Market Cap',
      value: '$2.1T',
      change: '+2.4%',
      trend: 'up',
      icon: DollarSign
    },
    {
      label: 'Active Signals',
      value: '47',
      change: '+8',
      trend: 'up',
      icon: Activity
    },
    {
      label: '24h Volume',
      value: '$89.2B',
      change: '-1.2%',
      trend: 'down',
      icon: TrendingUp
    },
    {
      label: 'AI Confidence',
      value: '94.2%',
      change: '+0.8%',
      trend: 'up',
      icon: Activity
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {marketStats.map((stat, index) => {
        const Icon = stat.icon;
        const isPositive = stat.trend === 'up';
        
        return (
          <Card key={index} className="glass-card hover:glow-primary transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isPositive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center space-x-1 text-sm ${
                  isPositive ? 'text-success' : 'text-destructive'
                }`}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="trading-mono">{stat.change}</span>
                </div>
              </div>
              
              <div>
                <h3 className="price-display text-2xl mb-1">{stat.value}</h3>
                <p className="metric-label">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MarketOverview;
