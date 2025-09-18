import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { LiveTradingDashboard } from '@/components/LiveTradingDashboard';

export default function Index() {
  return (
    <MainLayout>
      <LiveTradingDashboard />
    </MainLayout>
  );
}