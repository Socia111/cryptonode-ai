import React from 'react';
import MainLayout from '../layouts/MainLayout';
import PortfolioStats from '../components/PortfolioStats';
import SignalsWidget from '@/components/SignalsWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const Portfolio = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Portfolio Management
          </h1>
          <p className="text-muted-foreground">
            Track your trading performance and manage your crypto portfolio
          </p>
        </div>


        {/* Portfolio and Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioStats />
          </div>
          <div>
            <SignalsWidget maxItems={8} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Portfolio;