import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import { SignalFeedAdvanced } from '../components/SignalFeedAdvanced';
import { useSignals } from '@/hooks/useSignals';
import TradingChart from '../components/TradingChart';
import PortfolioStats from '../components/PortfolioStats';
import DatabaseSetup from '../components/DatabaseSetup';
import SpynxScoreCard from '../components/SpynxScoreCard';
import TelegramIntegration from '../components/TelegramIntegration';
import TradingPanel from '../components/TradingPanel';
import BacktestEngine from '../components/BacktestEngine';
import QuantumAnalysis from '../components/QuantumAnalysis';
import ScannerDashboard from '../components/ScannerDashboard';
import AItradeX1ScannerChart from '../components/AItradeX1ScannerChart';
import { GlobalTradeBar } from '../components/GlobalTradeBar';
import { useAutoPilot } from '../hooks/useAutoPilot';

const X = () => {
  const { autoTradeSettings } = useAutoPilot();
  const { signals } = useSignals();
  
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8 pb-20">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AItradeX1 Advanced Platform
          </h1>
          <p className="text-muted-foreground">
            Real-time crypto trading system with trend, momentum, volatility, and adaptive AI weighting
          </p>
          {autoTradeSettings.enabled && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm">
              🤖 Auto Pilot Active (A+/A signals)
            </div>
          )}
        </div>
        
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* AItradeX1 Scanner Chart */}
        <AItradeX1ScannerChart />
        
        {/* AItradeX1 Scanner Dashboard */}
        <ScannerDashboard />
        
        {/* Market Overview */}
        <MarketOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trading Chart */}
          <div className="lg:col-span-2 space-y-6">
            <TradingChart />
            <BacktestEngine />
          </div>
          
          {/* Signals Panel */}
          <div className="space-y-6">
            <PortfolioStats />
            <TradingPanel />
            <TelegramIntegration />
            <QuantumAnalysis />
            <SpynxScoreCard />
            <SignalFeedAdvanced signals={signals} algorithm="advanced" />
          </div>
        </div>
      </div>
      <GlobalTradeBar />
    </MainLayout>
  );
};

export default X;