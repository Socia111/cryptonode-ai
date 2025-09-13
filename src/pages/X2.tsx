import React from 'react';
import MainLayout from '../layouts/MainLayout';
import AItradeX1SystemDashboard from '../components/AItradeX1SystemDashboard';
import SignalsList from '../components/SignalsList';
import LivePrice from '../components/LivePrice';
import TradingChart from '../components/TradingChart';
import MarketOverview from '../components/MarketOverview';
import ComprehensiveScannerDashboard from '../components/ComprehensiveScannerDashboard';

import AItradeX1StrategyPanel from '../components/AItradeX1StrategyPanel';
import DatabaseSetup from '../components/DatabaseSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Target, Activity, TrendingUp } from 'lucide-react';
import { GlobalTradeBar } from '../components/GlobalTradeBar';
import { useAutoPilot } from '../hooks/useAutoPilot';

const X2 = () => {
  const { autoTradeSettings } = useAutoPilot();
  
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8 pb-20">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AItradeX2 Advanced System
          </h1>
          <p className="text-muted-foreground">
            Next-generation AI trading system with live data feeds, advanced signals, and comprehensive market analysis
          </p>
          {autoTradeSettings.enabled && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm">
              🤖 Auto Pilot Active (A+/A signals)
            </div>
          )}
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
          <AItradeX1StrategyPanel />
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
        <AItradeX1SystemDashboard />
      </div>
      <GlobalTradeBar />
    </MainLayout>
  );
};

export default X2;