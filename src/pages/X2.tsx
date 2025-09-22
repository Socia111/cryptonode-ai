import React from 'react';
import MainLayout from '../layouts/MainLayout';
// AItradeX1SystemDashboard removed
import SignalsList from '../components/SignalsList';
import LivePrice from '../components/LivePrice';
import TradingChart from '../components/TradingChart';
import MarketOverview from '../components/MarketOverview';
import ComprehensiveScannerDashboard from '../components/ComprehensiveScannerDashboard';

import SystemStatusSummary from '../components/SystemStatusSummary';
import AItradeX1StrategyPanel from '../components/AItradeX1StrategyPanel';
import DatabaseSetup from '../components/DatabaseSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const X2 = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AItradeX2 Advanced System
          </h1>
          <p className="text-muted-foreground">
            Next-generation AI trading system with live data feeds, advanced signals, and comprehensive market analysis
          </p>
        </div>

        {/* Real System Status */}
        <SystemStatusSummary />

        {/* Live Price Feed */}
        <LivePrice />

        {/* Trading Strategy Panel */}
        <AItradeX1StrategyPanel />

        {/* Market Overview */}
        <MarketOverview />

        {/* Live Signals */}
        <SignalsList />

        {/* Comprehensive Scanner */}
        <ComprehensiveScannerDashboard />

        {/* Automated Trading */}
        
        
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* AItradeX1SystemDashboard removed */}
      </div>
    </MainLayout>
  );
};

export default X2;