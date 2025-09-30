import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingPanel from '../components/TradingPanel';
import LivePrice from '../components/LivePrice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Zap } from 'lucide-react';

const Buy = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Execute Trade
          </h1>
          <p className="text-muted-foreground">
            Execute trades with real-time market prices
          </p>
        </div>

        {/* Live Price Display */}
        <LivePrice />

        {/* Trading Interface */}
        <div className="max-w-2xl mx-auto">
          <TradingPanel />
        </div>
      </div>
    </MainLayout>
  );
};

export default Buy;