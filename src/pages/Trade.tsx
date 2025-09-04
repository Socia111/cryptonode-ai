import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingPanel from '../components/TradingPanel';
import TradingChart from '../components/TradingChart';
import LivePrice from '../components/LivePrice';

const Trade = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Trading Terminal
          </h1>
          <p className="text-muted-foreground">
            Execute trades with advanced charting and real-time market data
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TradingChart />
          </div>
          <div className="space-y-6">
            <LivePrice />
            <TradingPanel />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Trade;