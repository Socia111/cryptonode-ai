import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Wifi, 
  WifiOff, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  Settings,
  Database,
  Shield,
  Gauge,
  Target
} from 'lucide-react';
import CleanSignalsList from './CleanSignalsList';
import AutoTradingToggle from './AutoTradingToggle';
import PerformancePanel from './PerformancePanel';

const TradingDashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Simplified Header */}
      <div className="glass-card p-6 border border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold brand-display bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              AItradeX1 Advanced
            </h1>
            <p className="text-muted-foreground mt-1">Professional AI-Powered Trading Platform</p>
          </div>
          
          {/* System Health - Single Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-success font-medium">All Systems Online</span>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="surface-elevated p-4 rounded-lg border border-border/50 hover-scale">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-chart-bullish/10">
                <Target className="h-5 w-5 text-chart-bullish" />
              </div>
              <span className="text-2xl font-bold text-chart-bullish">76.8%</span>
            </div>
            <h3 className="font-semibold">Win Rate</h3>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>

          <div className="surface-elevated p-4 rounded-lg border border-border/50 hover-scale">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Gauge className="h-5 w-5 text-warning" />
              </div>
              <span className="text-2xl font-bold text-warning">12.4%</span>
            </div>
            <h3 className="font-semibold">Daily ROI</h3>
            <p className="text-sm text-muted-foreground">Performance today</p>
          </div>

          <div className="surface-elevated p-4 rounded-lg border border-border/50 hover-scale">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-primary">2.5</span>
            </div>
            <h3 className="font-semibold">Avg R:R</h3>
            <p className="text-sm text-muted-foreground">Risk:Reward ratio</p>
          </div>
        </div>
      </div>

      {/* Merged Strategy & Risk Settings */}

      <Card className="border border-primary/20 glow-primary animate-scale-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Strategy Engine & Risk Management</CardTitle>
                <p className="text-sm text-muted-foreground">Advanced AI analysis with risk controls</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-primary to-secondary text-white border-0">
              ACTIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-chart-bearish mb-1">12.4%</div>
              <div className="text-sm text-muted-foreground">Daily ROI</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-chart-bullish mb-1">76.8%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-warning mb-1">2.5</div>
              <div className="text-sm text-muted-foreground">Avg R:R</div>
            </div>
          </div>

          <Separator />

          {/* Unified Strategy & Risk Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Trading Configuration
              </h4>
              <Button variant="outline" size="sm">Configure</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Position Size: 2%</span>
                    <span className="text-sm text-muted-foreground">Per Trade</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Min Confidence: 80%</span>
                    <span className="text-sm text-muted-foreground">Signal Threshold</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Max Positions: 3</span>
                    <span className="text-sm text-muted-foreground">Concurrent Trades</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Daily Loss Cap: 10%</span>
                    <span className="text-sm text-muted-foreground">Risk Limit</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
              </div>
            </div>

            {/* Trading Mode & Features */}
            <div className="pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Deep Protect (ETH/BTC)</span>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compound Profits</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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