import React from 'react';
import MainLayout from '../layouts/MainLayout';
import LiveSignalsDisplay from '../components/LiveSignalsDisplay';
import SignalsList from '../components/SignalsList';

const Signals = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Trading Signals
          </h1>
          <p className="text-muted-foreground">
            AI-powered trading signals with real-time analysis
          </p>
        </div>
        
        <LiveSignalsDisplay />
        <SignalsList />
      </div>
    </MainLayout>
  );
};

export default Signals;