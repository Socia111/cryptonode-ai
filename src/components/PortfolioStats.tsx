
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, Shield, Zap } from 'lucide-react';

const PortfolioStats = () => {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="w-5 h-5 text-primary" />
          <span>Portfolio</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Portfolio data will be displayed here</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioStats;
