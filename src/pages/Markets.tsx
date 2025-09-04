import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import ScannerDashboard from '../components/ScannerDashboard';

const Markets = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Market Overview
          </h1>
          <p className="text-muted-foreground">
            Real-time market data and cryptocurrency analysis
          </p>
        </div>
        
        <MarketOverview />
        <ScannerDashboard />
      </div>
    </MainLayout>
  );
};

export default Markets;