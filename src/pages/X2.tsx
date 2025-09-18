import React from 'react';
import MainLayout from '../layouts/MainLayout';
import UnireliSystemDashboard from '../components/UnireliSystemDashboard';
import SignalsList from '../components/SignalsList';
import LivePrice from '../components/LivePrice';
import TradingChart from '../components/TradingChart';
import MarketOverview from '../components/MarketOverview';
import ComprehensiveScannerDashboard from '../components/ComprehensiveScannerDashboard';

import UnireliStrategyPanel from '../components/UnireliStrategyPanel';
import DatabaseSetup from '../components/DatabaseSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Target, Activity, TrendingUp } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';

const X2 = () => {
  // Initialize API connection for live data
  const { signals, loading } = useSignals();
  
  // Apply Innovation Zone filtering and other signal filters
  const rankedSignals = useRankedSignals(signals, {
    hideWideSpreads: true,
    excludeInnovationZone: true,
    hide1MinSignals: true
  });
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Unireli X2 Advanced System
          </h1>
          <p className="text-muted-foreground">
            Next-generation AI trading system with live data feeds, advanced signals, and comprehensive market analysis
          </p>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Zap className="w-4 h-4 text-primary" />
                <span>Live Signals</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-success">+12 in last hour</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Target className="w-4 h-4 text-success" />
                <span>Success Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">91.2%</div>
              <p className="text-xs text-muted-foreground">24h performance</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Activity className="w-4 h-4 text-warning" />
                <span>Active Pairs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">Being monitored</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span>Avg ROI</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+18.7%</div>
              <p className="text-xs text-muted-foreground">Per signal</p>
            </CardContent>
          </Card>
        </div>

        {/* Live Price Feed */}
        <LivePrice />

        {/* Trading Chart and Strategy Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TradingChart />
          <UnireliStrategyPanel />
        </div>

        {/* Market Overview */}
        <MarketOverview />

        {/* Live Signals */}
        <SignalsList />

        {/* Comprehensive Scanner */}
        <ComprehensiveScannerDashboard />

        {/* Automated Trading */}
        
        
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* AItradeX1 System Dashboard */}
        <UnireliSystemDashboard />
      </div>
    </MainLayout>
  );
};

export default X2;