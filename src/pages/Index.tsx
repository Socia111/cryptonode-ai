
import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { SystemStatus } from '../components/SystemStatus';

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <SystemStatus />
        <TradingDashboard />
      </div>
    </MainLayout>
  );
};

export default Index;
