import React from 'react';
import MainLayout from '../layouts/MainLayout';
import AItradeX1SystemDashboard from '../components/AItradeX1SystemDashboard';
import SignalsList from '../components/SignalsList';
import LivePrice from '../components/LivePrice';
import TradingChart from '../components/TradingChart';
import MarketOverview from '../components/MarketOverview';
import ComprehensiveScannerDashboard from '../components/ComprehensiveScannerDashboard';
import AutomatedTradingDashboard from '../components/AutomatedTradingDashboard';
import AItradeX1StrategyPanel from '../components/AItradeX1StrategyPanel';
import DatabaseSetup from '../components/DatabaseSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Target, Activity, TrendingUp } from 'lucide-react';

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


        {/* Live Price Feed */}
        <LivePrice />

        {/* Trading Chart and Strategy Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TradingChart />
          <AItradeX1StrategyPanel />
        </div>

        {/* Market Overview */}
        <MarketOverview />

        {/* Live Signals */}
        <SignalsList />

        {/* Comprehensive Scanner */}
        <ComprehensiveScannerDashboard />

        {/* Automated Trading */}
        <AutomatedTradingDashboard />
        
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* AItradeX1 System Dashboard */}
        <AItradeX1SystemDashboard />
      </div>
    </MainLayout>
  );
};

export default X2;