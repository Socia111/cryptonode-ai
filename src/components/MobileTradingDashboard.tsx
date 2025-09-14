import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  Gauge, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Settings,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { MobileSignalsList } from './MobileSignalsList';
import { useSignals } from '@/hooks/useSignals';

export const MobileTradingDashboard = () => {
  const [liveMode, setLiveMode] = useState(true);
  const [autoExecute, setAutoExecute] = useState(true);
  const [orderSize, setOrderSize] = useState('25');
  const { signals, loading } = useSignals();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AitradeX1 Advanced
            </h1>
            <p className="text-sm text-muted-foreground">Professional AI-Powered Trading Platform</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-success font-medium">All Systems Online</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/20 border">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 text-chart-bullish mr-1" />
            </div>
            <div className="text-2xl font-bold text-chart-bullish">76.8%</div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
            <div className="text-xs text-muted-foreground">Last 30 days</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/20 border">
            <div className="flex items-center justify-center mb-1">
              <Gauge className="h-4 w-4 text-warning mr-1" />
            </div>
            <div className="text-2xl font-bold text-warning">12.4%</div>
            <div className="text-xs text-muted-foreground">Daily ROI</div>
            <div className="text-xs text-muted-foreground">Performance today</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/20 border">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 text-primary mr-1" />
            </div>
            <div className="text-2xl font-bold text-primary">2.5</div>
            <div className="text-xs text-muted-foreground">Avg R:R</div>
            <div className="text-xs text-muted-foreground">Risk:Reward ratio</div>
          </div>
        </div>
      </div>

      {/* Trading Mode Controls */}
      <div className="p-4 bg-card border-b">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Trading Mode</Label>
            <div className="flex items-center gap-2">
              <Badge variant={liveMode ? "default" : "secondary"} className="text-xs">
                {liveMode ? "LIVE TRADING" : "PAPER MODE"}
              </Badge>
              {liveMode && (
                <Badge variant="destructive" className="text-xs">
                  REAL MONEY
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Auto-Execute Signals</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={autoExecute}
                onCheckedChange={setAutoExecute}
              />
              <Badge variant={autoExecute ? "default" : "secondary"} className="text-xs">
                {autoExecute ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Live Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={liveMode}
                onCheckedChange={setLiveMode}
              />
              <Badge variant={liveMode ? "destructive" : "secondary"} className="text-xs">
                {liveMode ? "Live Mode" : "Paper Mode"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="signals" className="flex-1">
        <TabsList className="grid w-full grid-cols-4 sticky top-0 z-10 bg-background border-b">
          <TabsTrigger value="signals" className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3" />
            Signals
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1 text-xs">
            <BarChart3 className="w-3 h-3" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-1 text-xs">
            <Zap className="w-3 h-3" />
            Live Setup
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex items-center gap-1 text-xs">
            <Settings className="w-3 h-3" />
            Controls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="p-0">
          <MobileSignalsList />
        </TabsContent>

        <TabsContent value="performance" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/20 border">
                    <div className="text-lg font-bold text-chart-bullish">+24.5%</div>
                    <div className="text-xs text-muted-foreground">Total Return</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/20 border">
                    <div className="text-lg font-bold text-primary">8.2</div>
                    <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Trading Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="order-size" className="text-sm font-medium">Order Size (USD)</Label>
                  <Input
                    id="order-size"
                    value={orderSize}
                    onChange={(e) => setOrderSize(e.target.value)}
                    className="mt-1"
                    placeholder="25"
                  />
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium text-warning">Use Leverage</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Not available in real money mode at high exchange
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trading Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                  <span className="text-sm">Bulk Actions</span>
                  <Button size="sm" variant="outline">
                    Execute All (12)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};