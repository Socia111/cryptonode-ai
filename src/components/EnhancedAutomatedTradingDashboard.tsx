import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Activity,
  Target,
  TrendingUp,
  BarChart3,
  Zap,
  Settings
} from 'lucide-react';
import { useAutomatedTrading } from '@/hooks/useAutomatedTrading';
import { AlgorithmSelectionPanel } from './AlgorithmSelectionPanel';
import { AutomatedTradingDashboard } from './AutomatedTradingDashboard';
import { algorithmRegistry } from '@/lib/algorithmRegistry';
import { TradingAlgorithm } from '@/types/algorithms';
import { useToast } from '@/hooks/use-toast';

export function EnhancedAutomatedTradingDashboard() {
  const { status, loading, startTrading, stopTrading } = useAutomatedTrading();
  const [algorithms, setAlgorithms] = useState<TradingAlgorithm[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    algorithmRegistry.subscribe(setAlgorithms);
    setAlgorithms(algorithmRegistry.getAlgorithms());
  }, []);

  const handleToggleTrading = async () => {
    try {
      if (status?.isRunning) {
        await stopTrading();
        toast({
          title: "🛑 Automated Trading Stopped",
          description: "All automated trading has been paused"
        });
      } else {
        // Start trading and trigger all active algorithms
        await startTrading();
        await algorithmRegistry.triggerAllActiveAlgorithms();
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

  const activeAlgorithms = algorithms.filter(a => a.config?.enabled);
  const totalSignals = algorithms.reduce((sum, a) => sum + (a.signalsGenerated || 0), 0);
  const avgWinRate = algorithms.length > 0 
    ? algorithms.reduce((sum, a) => sum + (a.performance?.winRate || 0), 0) / algorithms.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Enhanced Automated Trading System
            </CardTitle>
            <Badge className={status?.isRunning ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
              {status?.isRunning ? (
                <>
                  <Activity className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 mr-1" />
                  Stopped
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {activeAlgorithms.length}
              </div>
              <div className="text-sm text-muted-foreground">Active Algorithms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalSignals}
              </div>
              <div className="text-sm text-muted-foreground">Total Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {avgWinRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {status?.activePositions || 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Positions</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${status?.todaysPnL && status.todaysPnL > 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${status?.todaysPnL?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-muted-foreground">Today's P&L</div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleToggleTrading}
              disabled={loading}
              className={status?.isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {status?.isRunning ? (
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
              onClick={() => algorithmRegistry.triggerAllActiveAlgorithms()}
            >
              <Zap className="w-4 h-4 mr-2" />
              Trigger Algorithms
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeAlgorithms.slice(0, 3).map((algorithm) => (
          <Card key={algorithm.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                {algorithm.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-sm font-medium">{algorithm.performance?.winRate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Profit</span>
                  <span className="text-sm font-medium text-green-600">
                    +${algorithm.performance?.profit?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Score</span>
                  <span className="text-sm font-medium">{algorithm.performance?.avgScore || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="algorithms" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="algorithms">Algorithm Management</TabsTrigger>
          <TabsTrigger value="dashboard">Trading Dashboard</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="algorithms" className="space-y-6">
          <AlgorithmSelectionPanel />
        </TabsContent>
        
        <TabsContent value="dashboard" className="space-y-6">
          <AutomatedTradingDashboard />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Algorithm Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Algorithm Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {algorithms.map((algorithm) => (
                    <div key={algorithm.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{algorithm.name}</span>
                        <Badge variant={algorithm.config?.enabled ? "default" : "secondary"}>
                          {algorithm.config?.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-medium text-green-600">
                            +${algorithm.performance?.profit?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-muted-foreground">Profit</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-medium text-blue-600">
                            {algorithm.performance?.winRate || 0}%
                          </div>
                          <div className="text-muted-foreground">Win Rate</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="font-medium text-purple-600">
                            {algorithm.performance?.avgScore || 0}
                          </div>
                          <div className="text-muted-foreground">Avg Score</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Signal Generation</span>
                    <Badge className="bg-green-500 text-white">Healthy</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Trade Execution</span>
                    <Badge className="bg-green-500 text-white">Operational</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Risk Management</span>
                    <Badge className="bg-green-500 text-white">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Market Data Feed</span>
                    <Badge className="bg-green-500 text-white">Connected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}