import React from 'react';
import MainLayout from '../layouts/MainLayout';
import AutomatedTradingDashboard from '../components/AutomatedTradingDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Zap, Target, Settings } from 'lucide-react';

const Automation = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Trading Automation
          </h1>
          <p className="text-muted-foreground">
            Automated trading bots powered by AI signals and advanced risk management
          </p>
        </div>

        {/* Automation Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Bot className="w-4 h-4 text-primary" />
                <span>Active Bots</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-success">All running</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Zap className="w-4 h-4 text-warning" />
                <span>Trades Today</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">Automated</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Target className="w-4 h-4 text-success" />
                <span>Success Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">89.4%</div>
              <p className="text-xs text-muted-foreground">24h performance</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Settings className="w-4 h-4 text-accent" />
                <span>P&L Today</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+$1,247.83</div>
              <p className="text-xs text-muted-foreground">Auto trades</p>
            </CardContent>
          </Card>
        </div>

        {/* Automated Trading Dashboard */}
        <AutomatedTradingDashboard />
      </div>
    </MainLayout>
  );
};

export default Automation;