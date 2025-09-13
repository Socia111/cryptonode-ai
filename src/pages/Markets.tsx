import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import ComprehensiveScannerDashboard from '../components/ComprehensiveScannerDashboard';
import SignalsWidget from '@/components/SignalsWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const Markets = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Market Analysis
          </h1>
          <p className="text-muted-foreground">
            Real-time market data, trends, and comprehensive cryptocurrency analysis
          </p>
        </div>


        {/* Live Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MarketOverview />
          </div>
          <div>
            <SignalsWidget maxItems={6} />
          </div>
        </div>

        {/* Comprehensive Scanner */}
        <ComprehensiveScannerDashboard />
      </div>
    </MainLayout>
  );
};

export default Markets;