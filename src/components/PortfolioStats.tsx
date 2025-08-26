
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
        <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg border border-success/20">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
            <p className="price-display text-2xl text-success">$24,847.92</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">24h Change</p>
            <p className="text-success trading-mono">+$2,847 (+12.9%)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Active Trades</p>
            <p className="text-lg font-bold trading-mono">12</p>
          </div>
          
          <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
            <Shield className="w-6 h-6 text-warning mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold trading-mono">87.4%</p>
          </div>
        </div>

        <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">AI Performance</span>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="w-full bg-background rounded-full h-2 mb-2">
            <div className="bg-gradient-to-r from-primary to-success h-2 rounded-full" style={{ width: '94.2%' }}></div>
          </div>
          <p className="text-xs text-center trading-mono">94.2% Accuracy</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioStats;
