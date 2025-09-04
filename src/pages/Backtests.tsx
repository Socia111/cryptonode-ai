import React from 'react';
import MainLayout from '../layouts/MainLayout';
import BacktestEngine from '../components/BacktestEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TestTube, TrendingUp, BarChart3 } from 'lucide-react';

const Backtests = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Strategy Backtesting
          </h1>
          <p className="text-muted-foreground">
            Test your trading strategies against historical market data to optimize performance
          </p>
        </div>


        {/* Backtest Engine */}
        <BacktestEngine />
      </div>
    </MainLayout>
  );
};

export default Backtests;