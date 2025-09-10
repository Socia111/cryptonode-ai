import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import CleanSignalsList from './CleanSignalsList';
import AutoTradingToggle from './AutoTradingToggle';
import PerformancePanel from './PerformancePanel';

const TradingDashboard = () => {
  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Top Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connection</p>
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Bybit Live
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-lg font-semibold">$2,847.32</p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">PnL Today</p>
                <p className="text-lg font-semibold text-green-600">+$127.45</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Trades</p>
                <p className="text-lg font-semibold">3</p>
              </div>
              <Badge variant="secondary">Running</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Live Signals */}
        <div className="lg:col-span-2">
          <CleanSignalsList />
        </div>

        {/* Right Panel - Controls & Performance */}
        <div className="space-y-6">
          <AutoTradingToggle />
          <PerformancePanel />
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard;