import React from 'react';
import MainLayout from '../layouts/MainLayout';
import SignalsList from '../components/SignalsList';
import AItradeX1StrategyPanel from '../components/AItradeX1StrategyPanel';
import TradePlanGenerator from '../components/TradePlanGenerator';
import LiveTradeExecutor from '../components/LiveTradeExecutor';
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


        {/* Strategy Panel */}
        <AItradeX1StrategyPanel />

        {/* Trade Plan Generator */}
        <TradePlanGenerator />

        {/* Live Trade Executor */}
        <LiveTradeExecutor />

        {/* Signals List */}
        <SignalsList />
      </div>
    </MainLayout>
  );
};

export default Signals;