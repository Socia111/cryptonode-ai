
import React from 'react';
import TradingHeader from '../components/TradingHeader';
import MarketOverview from '../components/MarketOverview';
import SignalsList from '../components/SignalsList';
import TradingChart from '../components/TradingChart';
import PortfolioStats from '../components/PortfolioStats';
import DatabaseSetup from '../components/DatabaseSetup';
import SpynxScoreCard from '../components/SpynxScoreCard';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TradingHeader />
      
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* Market Overview */}
        <MarketOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trading Chart */}
          <div className="lg:col-span-2">
            <TradingChart />
          </div>
          
          {/* Signals Panel */}
          <div className="space-y-6">
            <PortfolioStats />
            <SpynxScoreCard />
            <SignalsList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
