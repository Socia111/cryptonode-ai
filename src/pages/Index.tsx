import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { SystemStatus } from '../components/SystemStatus';
import AIRADashboard from '../components/AIRADashboard';
import SpynxScoresPanel from '../components/SpynxScoresPanel';
import QuantumAnalysisDashboard from '../components/QuantumAnalysisDashboard';

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <SystemStatus />
        <QuantumAnalysisDashboard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIRADashboard />
          <SpynxScoresPanel />
        </div>
        <TradingDashboard />
      </div>
    </MainLayout>
  );
};

export default Index;
