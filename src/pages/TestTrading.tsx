import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { ProfessionalTradingDashboard } from '@/components/ProfessionalTradingDashboard';

const TestTrading = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8">
        <ProfessionalTradingDashboard />
      </div>
    </MainLayout>
  );
};

export default TestTrading;