import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Target,
  BarChart3
} from 'lucide-react';
import CleanSignalsList from './CleanSignalsList';
import AutoTradingToggle from './AutoTradingToggle';
import PerformancePanel from './PerformancePanel';
import LiveTradingSetup from './LiveTradingSetup';
import TradingDiagnostics from './TradingDiagnostics';
import { ProductionControls } from './ProductionControls';

const TradingDashboard = () => {
  const [activeTab, setActiveTab] = useState('signals');

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

      {/* Trading Mode Toggle */}
      <div className="flex justify-center mb-6">
        <AutoTradingToggle />
      </div>

      {/* Main Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="signals" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Signals
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Live Setup
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-6">
          <CleanSignalsList />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <PerformancePanel />
        </TabsContent>
        
        <TabsContent value="setup" className="space-y-6">
          <LiveTradingSetup />
        </TabsContent>
        
        <TabsContent value="controls" className="space-y-6">
          <ProductionControls />
        </TabsContent>
        
        <TabsContent value="diagnostics" className="space-y-6">
          <TradingDiagnostics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingDashboard;