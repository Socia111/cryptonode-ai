import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import SignalsList from '../components/SignalsList';
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
import { useSignals } from '@/hooks/useSignals';

const X1 = () => {
  // Initialize API connection for live data
  const { signals, loading } = useSignals();
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AItradeX1 Confluence Platform
          </h1>
          <p className="text-muted-foreground">
            Multi-indicator confluence model with EMA stack, ADX/DMI, Stochastic, HVP, and weighted scoring system
          </p>
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
            <SignalsList />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default X1;