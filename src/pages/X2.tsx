import React from 'react';
import MainLayout from '../layouts/MainLayout';
import AItradeX1SystemDashboard from '../components/AItradeX1SystemDashboard';
import DatabaseSetup from '../components/DatabaseSetup';

const X2 = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AItradeX1 Advanced System
          </h1>
          <p className="text-muted-foreground">
            Multi-indicator confluence system with adaptive AI weighting, real-time signal generation, and comprehensive trading logic
          </p>
        </div>
        
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* AItradeX1 System Dashboard */}
        <AItradeX1SystemDashboard />
      </div>
    </MainLayout>
  );
};

export default X2;