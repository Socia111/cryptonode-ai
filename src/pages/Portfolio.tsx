import React from 'react';
import MainLayout from '../layouts/MainLayout';
import PortfolioStats from '../components/PortfolioStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const Portfolio = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Portfolio Management
          </h1>
          <p className="text-muted-foreground">
            Track your trading performance and manage your crypto portfolio
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <DollarSign className="w-4 h-4 text-primary" />
                <span>Total Value</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,547.83</div>
              <p className="text-xs text-success">+$847.32 (7.2%)</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-success" />
                <span>Realized P&L</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+$2,394.67</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span>Unrealized P&L</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">-$156.42</div>
              <p className="text-xs text-muted-foreground">Open positions</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Wallet className="w-4 h-4 text-warning" />
                <span>Available</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$3,892.15</div>
              <p className="text-xs text-muted-foreground">USDT balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Stats Component */}
        <PortfolioStats />
      </div>
    </MainLayout>
  );
};

export default Portfolio;