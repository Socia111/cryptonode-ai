import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { TradingSystemDashboard } from '@/components/TradingSystemDashboard';

const TestTrading = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8">
        <TradingSystemDashboard />
      </div>
    </MainLayout>
  );
};

export default TestTrading;