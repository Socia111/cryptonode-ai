
import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { TradingTest } from '@/components/TradingTest';
import { BalanceChecker } from '@/components/BalanceChecker';

const Index = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Balance Information */}
        <div className="mb-6">
          <BalanceChecker />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <TradingDashboard />
          </div>
          <div className="lg:w-96">
            <TradingTest />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
