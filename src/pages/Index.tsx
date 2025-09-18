import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { ProfessionalTradingDashboard } from '@/components/ProfessionalTradingDashboard';

export default function Index() {
  return (
    <MainLayout>
      <ProfessionalTradingDashboard />
    </MainLayout>
  );
}