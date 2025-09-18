import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartSignalDashboard } from './SmartSignalDashboard';
import { LiveTradingControls } from './LiveTradingControls';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Shield
} from 'lucide-react';
import { automatedTradingEngine, AutoTradingConfig, AutoTradingStatus, defaultAutoTradingConfig } from '@/lib/automatedTrading';
import { useToast } from '@/hooks/use-toast';

export function AutomatedTradingDashboard() {
  const [status, setStatus] = useState<AutoTradingStatus | null>(null);
  const [config, setConfig] = useState<AutoTradingConfig>(defaultAutoTradingConfig);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to status updates
    automatedTradingEngine.subscribe(setStatus);
    
    // Get initial status
    setStatus(automatedTradingEngine.getStatus());
  }, []);

  const handleToggleTrading = async () => {
    try {
      if (status?.isRunning) {
        await automatedTradingEngine.stop();
        toast({
          title: "🛑 Automated Trading Stopped",
          description: "All automated trading has been paused"
        });
      } else {
        await automatedTradingEngine.start();
        toast({
          title: "🤖 Automated Trading Started",
          description: "System is now monitoring signals and executing trades"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle automated trading",
        variant: "destructive"
      });
    }
  };

  const handleConfigUpdate = () => {
    automatedTradingEngine.updateConfig(config);
    setIsConfiguring(false);
    toast({
      title: "Configuration Updated",
      description: "Automated trading settings have been saved"
    });
  };

  const getStatusColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusBadge = (isRunning: boolean) => {
    return isRunning ? (
      <Badge className="bg-green-500 text-white">
        <Activity className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Pause className="w-3 h-3 mr-1" />
        Stopped
      </Badge>
    );
  };

  if (!status) {
    return <div>Loading automated trading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Automated Trading System
            </CardTitle>
            {getStatusBadge(status.isRunning)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {status.activePositions}
              </div>
              <div className="text-sm text-muted-foreground">Active Positions</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStatusColor(status.todaysPnL)}`}>
                ${status.todaysPnL.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Today's P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {status.totalTrades}
              </div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(status.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleToggleTrading}
              className={status.isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {status.isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Trading
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Trading
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setIsConfiguring(!isConfiguring)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management Alert */}
      {status.currentDrawdown < -100 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Current drawdown: ${Math.abs(status.currentDrawdown).toFixed(2)}. 
            Consider reviewing your risk management settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Panel */}
      {isConfiguring && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="filters">Signal Filters</TabsTrigger>
                <TabsTrigger value="risk">Risk Management</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxPositions">Max Positions</Label>
                    <Input
                      id="maxPositions"
                      type="number"
                      value={config.maxPositions}
                      onChange={(e) => setConfig({...config, maxPositions: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="positionSize">Position Size (USD)</Label>
                    <Input
                      id="positionSize"
                      type="number"
                      value={config.positionSizeUSD}
                      onChange={(e) => setConfig({...config, positionSizeUSD: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      step="0.1"
                      value={config.stopLossPercent}
                      onChange={(e) => setConfig({...config, stopLossPercent: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="takeProfit">Take Profit (%)</Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      step="0.1"
                      value={config.takeProfitPercent}
                      onChange={(e) => setConfig({...config, takeProfitPercent: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="filters" className="space-y-4">
                <div>
                  <Label htmlFor="minScore">Minimum Signal Score</Label>
                  <Input
                    id="minScore"
                    type="number"
                    value={config.minSignalScore}
                    onChange={(e) => setConfig({...config, minSignalScore: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Allowed Timeframes</Label>
                  <div className="flex gap-2 mt-2">
                    {['5m', '15m', '30m', '1h', '4h'].map(tf => (
                      <Badge
                        key={tf}
                        variant={config.allowedTimeframes.includes(tf) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newTimeframes = config.allowedTimeframes.includes(tf)
                            ? config.allowedTimeframes.filter(t => t !== tf)
                            : [...config.allowedTimeframes, tf];
                          setConfig({...config, allowedTimeframes: newTimeframes});
                        }}
                      >
                        {tf}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="risk" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxDailyLoss">Max Daily Loss ($)</Label>
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      value={config.riskManagement.maxDailyLoss}
                      onChange={(e) => setConfig({
                        ...config, 
                        riskManagement: {
                          ...config.riskManagement,
                          maxDailyLoss: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDrawdown">Max Drawdown ($)</Label>
                    <Input
                      id="maxDrawdown"
                      type="number"
                      value={config.riskManagement.maxDrawdown}
                      onChange={(e) => setConfig({
                        ...config, 
                        riskManagement: {
                          ...config.riskManagement,
                          maxDrawdown: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profitTarget">Daily Profit Target ($)</Label>
                    <Input
                      id="profitTarget"
                      type="number"
                      value={config.riskManagement.dailyProfitTarget || ''}
                      onChange={(e) => setConfig({
                        ...config, 
                        riskManagement: {
                          ...config.riskManagement,
                          dailyProfitTarget: e.target.value ? parseFloat(e.target.value) : undefined
                        }
                      })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handleConfigUpdate}>
                Save Configuration
              </Button>
              <Button variant="outline" onClick={() => setIsConfiguring(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {status.todaysPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`ml-2 text-lg font-bold ${getStatusColor(status.todaysPnL)}`}>
                ${status.todaysPnL.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="ml-2 text-lg font-bold">
                {((config.riskManagement.maxDailyLoss - Math.abs(status.currentDrawdown)) / config.riskManagement.maxDailyLoss * 100).toFixed(0)}%
              </span>
              <span className="ml-1 text-sm text-muted-foreground">Safe</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="ml-2 text-lg font-bold text-purple-600">
                {(status.successRate * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}