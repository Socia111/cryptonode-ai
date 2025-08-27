
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

const Index = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Database Setup */}
        <DatabaseSetup />
        
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

export default Index;
