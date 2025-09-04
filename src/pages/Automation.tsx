import React from 'react';
import MainLayout from '../layouts/MainLayout';
import AutomatedTradingDashboard from '../components/AutomatedTradingDashboard';

const Automation = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Trading Automation
          </h1>
          <p className="text-muted-foreground">
            Automated trading strategies and bot management
          </p>
        </div>
        
        <AutomatedTradingDashboard />
      </div>
    </MainLayout>
  );
};

export default Automation;