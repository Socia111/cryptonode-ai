import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingPanel from '../components/TradingPanel';
import TradingChart from '../components/TradingChart';
import SignalsList from '../components/SignalsList';
import LivePrice from '../components/LivePrice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Zap, Target } from 'lucide-react';

const Trade = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Live Trading
          </h1>
          <p className="text-muted-foreground">
            Execute trades with AI-powered signals and real-time market analysis
          </p>
        </div>

        {/* Live Price Ticker */}
        <LivePrice />

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Chart - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <TradingChart />
          </div>

          {/* Trading Panel */}
          <div>
            <TradingPanel />
          </div>
        </div>

        {/* Signals */}
        <SignalsList />
      </div>
    </MainLayout>
  );
};

export default Trade;