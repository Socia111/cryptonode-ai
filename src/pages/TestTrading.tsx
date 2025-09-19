import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { EnhancedFakeTradeTest } from '@/components/EnhancedFakeTradeTest';
import { ProfessionalTradingDashboard } from '@/components/ProfessionalTradingDashboard';

const TestTrading = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">🧪 Trading System Testing</h1>
          <p className="text-muted-foreground">Test fake trades and validate system functionality</p>
        </div>
        
        <EnhancedFakeTradeTest />
        
        <div className="border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">📊 Professional Trading Dashboard</h2>
          <ProfessionalTradingDashboard />
        </div>
      </div>
    </MainLayout>
  );
};

export default TestTrading;