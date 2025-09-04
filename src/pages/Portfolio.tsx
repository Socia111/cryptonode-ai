import React from 'react';
import MainLayout from '../layouts/MainLayout';
import PortfolioStats from '../components/PortfolioStats';

const Portfolio = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Portfolio Management
          </h1>
          <p className="text-muted-foreground">
            Track your investments and portfolio performance
          </p>
        </div>
        
        <PortfolioStats />
      </div>
    </MainLayout>
  );
};

export default Portfolio;