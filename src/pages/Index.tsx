
import React, { useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { TradingTest } from '@/components/TradingTest';

const Index = () => {
  useEffect(() => {
    // Check if rebuild command was triggered
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRebuild = urlParams.get('rebuild') === 'true' || 
                         localStorage.getItem('rebuildCommand') === 'true';
    
    if (shouldRebuild) {
      localStorage.removeItem('rebuildCommand');
      window.location.href = '/rebuild';
    }
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
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
