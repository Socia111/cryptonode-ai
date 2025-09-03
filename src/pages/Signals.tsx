import React from 'react';
import MainLayout from '../layouts/MainLayout';
import SignalsList from '../components/SignalsList';
import AItradeX1StrategyPanel from '../components/AItradeX1StrategyPanel';
import TradePlanGenerator from '../components/TradePlanGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Target, Activity } from 'lucide-react';

const Signals = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Trading Signals
          </h1>
          <p className="text-muted-foreground">
            Advanced AI-powered signals with 80%+ confidence and real-time market analysis
          </p>
        </div>

        {/* Signal Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Zap className="w-4 h-4 text-primary" />
                <span>Active Signals</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">80%+ confidence</p>
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
              <div className="text-2xl font-bold text-success">84.7%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Activity className="w-4 h-4 text-warning" />
                <span>Avg ROI</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12.3%</div>
              <p className="text-xs text-muted-foreground">Per signal</p>
            </CardContent>
          </Card>
        </div>

        {/* Strategy Panel */}
        <AItradeX1StrategyPanel />

        {/* Trade Plan Generator */}
        <TradePlanGenerator />

        {/* Signals List */}
        <SignalsList />
      </div>
    </MainLayout>
  );
};

export default Signals;