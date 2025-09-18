import React from 'react';
import MainLayout from '../layouts/MainLayout';
// BacktestEngine removed - unused component
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <TestTube className="w-4 h-4 text-primary" />
                <span>Tests Run</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
              <p className="text-xs text-muted-foreground">+12 this week</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-success" />
                <span>Best Strategy</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+24.3%</div>
              <p className="text-xs text-muted-foreground">AItradeX1 15m</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <BarChart3 className="w-4 h-4 text-warning" />
                <span>Win Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78.5%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Backtest Engine - Component removed */}
        <div className="text-center py-8 text-muted-foreground">
          <p>Backtest engine has been removed to simplify the interface.</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Backtests;