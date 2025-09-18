import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import SignalsList from '../components/SignalsList';
import TradingChart from '../components/TradingChart';
import PortfolioStats from '../components/PortfolioStats';
import DatabaseSetup from '../components/DatabaseSetup';
import SpynxScoreCard from '../components/SpynxScoreCard';
// TelegramIntegration, BacktestEngine, QuantumAnalysis removed - unused components
import ScannerDashboard from '../components/ScannerDashboard';
import UnireliScannerChart from '../components/UnireliScannerChart';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';

const X = () => {
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
            Unireli Advanced Platform
          </h1>
          <p className="text-muted-foreground">
            Real-time crypto trading system with trend, momentum, volatility, and adaptive AI weighting
          </p>
        </div>
        
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* AItradeX1 Scanner Chart */}
        <UnireliScannerChart />
        
        {/* AItradeX1 Scanner Dashboard */}
        <ScannerDashboard />
        
        {/* Market Overview */}
        <MarketOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trading Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Components removed for simplification */}
            <div className="text-center py-8 text-muted-foreground">
              <p>Some components have been removed to simplify the interface.</p>
            </div>
          </div>
          
          {/* Signals Panel */}
          <div className="space-y-6">
            {/* Components removed for simplification */}
            <div className="text-center py-8 text-muted-foreground">
              <p>Some components have been removed to simplify the interface.</p>
            </div>
            <SignalsList />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default X;