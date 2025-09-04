import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import ComprehensiveScannerDashboard from '../components/ComprehensiveScannerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const Markets = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Market Analysis
          </h1>
          <p className="text-muted-foreground">
            Real-time market data, trends, and comprehensive cryptocurrency analysis
          </p>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Market Cap</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2.34T</div>
              <p className="text-xs text-success">+2.4% (24h)</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Activity className="w-4 h-4 text-warning" />
                <span>24h Volume</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$89.2B</div>
              <p className="text-xs text-muted-foreground">Across all pairs</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-success" />
                <span>Gainers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">847</div>
              <p className="text-xs text-muted-foreground">24h gainers</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span>Losers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">432</div>
              <p className="text-xs text-muted-foreground">24h losers</p>
            </CardContent>
          </Card>
        </div>

        {/* Market Overview */}
        <MarketOverview />

        {/* Comprehensive Scanner */}
        <ComprehensiveScannerDashboard />
      </div>
    </MainLayout>
  );
};

export default Markets;