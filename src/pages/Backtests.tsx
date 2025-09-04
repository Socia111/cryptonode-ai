import React from 'react';
import MainLayout from '../layouts/MainLayout';
import BacktestEngine from '../components/BacktestEngine';

const Backtests = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Backtest Engine
          </h1>
          <p className="text-muted-foreground">
            Test your trading strategies against historical data
          </p>
        </div>
        
        <BacktestEngine />
      </div>
    </MainLayout>
  );
};

export default Backtests;