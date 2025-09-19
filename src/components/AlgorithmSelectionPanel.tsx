import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  Activity,
  BarChart3,
  Zap,
  Target,
  AlertCircle
} from 'lucide-react';
import { TradingAlgorithm, AlgorithmStatus } from '@/types/algorithms';
import { algorithmRegistry } from '@/lib/algorithmRegistry';
import { useToast } from '@/hooks/use-toast';

export function AlgorithmSelectionPanel() {
  const [algorithms, setAlgorithms] = useState<TradingAlgorithm[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to algorithm updates
    algorithmRegistry.subscribe(setAlgorithms);
    
    // Get initial algorithms
    setAlgorithms(algorithmRegistry.getAlgorithms());
  }, []);

  const handleToggleAlgorithm = async (id: string, enabled: boolean) => {
    try {
      await algorithmRegistry.toggleAlgorithm(id, enabled);
      toast({
        title: enabled ? "🚀 Algorithm Started" : "⏸️ Algorithm Stopped",
        description: `${algorithms.find(a => a.id === id)?.name} is now ${enabled ? 'active' : 'inactive'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle algorithm",
        variant: "destructive"
      });
    }
  };

  const handleTriggerAll = async () => {
    try {
      await algorithmRegistry.triggerAllActiveAlgorithms();
      toast({
        title: "🎯 All Algorithms Triggered",
        description: "Active algorithms are now generating fresh signals"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger algorithms",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (algorithm: TradingAlgorithm) => {
    const status = algorithmRegistry.getAlgorithmStatus(algorithm.id);
    const isEnabled = algorithm.config?.enabled;
    
    if (!isEnabled) {
      return <Badge variant="secondary">Stopped</Badge>;
    }
    
    if (status?.status === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    if (status?.status === 'running') {
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    }
    
    return <Badge variant="outline">Ready</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'scanner': return <Activity className="w-4 h-4" />;
      case 'generator': return <Zap className="w-4 h-4" />;
      case 'analyzer': return <BarChart3 className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const selectedAlgo = algorithms.find(a => a.id === selectedAlgorithm);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Algorithm Management
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleTriggerAll} className="bg-primary hover:bg-primary/90">
                <Play className="w-4 h-4 mr-2" />
                Trigger All Active
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {algorithms.filter(a => a.config?.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Algorithms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {algorithms.reduce((sum, a) => sum + (a.performance?.winRate || 0), 0) / algorithms.length || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {algorithms.reduce((sum, a) => sum + (a.signalsGenerated || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${algorithms.reduce((sum, a) => sum + (a.performance?.profit || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Combined Profit</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Algorithm List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Algorithms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {algorithms.map((algorithm) => (
              <div 
                key={algorithm.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAlgorithm === algorithm.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedAlgorithm(algorithm.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(algorithm.category)}
                    <h3 className="font-medium">{algorithm.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(algorithm)}
                    <Switch
                      checked={algorithm.config?.enabled || false}
                      onCheckedChange={(enabled) => handleToggleAlgorithm(algorithm.id, enabled)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {algorithm.description}
                </p>
                
                {algorithm.performance && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-green-600">+${algorithm.performance.profit}</div>
                      <div className="text-muted-foreground">Profit</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{algorithm.performance.winRate}%</div>
                      <div className="text-muted-foreground">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{algorithm.performance.avgScore}</div>
                      <div className="text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Algorithm Configuration */}
        {selectedAlgo && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {selectedAlgo.name} Configuration
                </CardTitle>
                {getStatusBadge(selectedAlgo)}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                </TabsList>
                
                <TabsContent value="settings" className="space-y-4">
                  {selectedAlgo.config && (
                    <div className="space-y-4">
                      <div>
                        <Label>Priority Level</Label>
                        <Slider
                          value={[selectedAlgo.config.priority]}
                          onValueChange={([value]) => 
                            algorithmRegistry.updateAlgorithmConfig(selectedAlgo.id, { priority: value })
                          }
                          max={5}
                          min={1}
                          step={1}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Current: {selectedAlgo.config.priority}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Signal Weight</Label>
                        <Slider
                          value={[selectedAlgo.config.weight * 100]}
                          onValueChange={([value]) => 
                            algorithmRegistry.updateAlgorithmConfig(selectedAlgo.id, { weight: value / 100 })
                          }
                          max={100}
                          min={0}
                          step={5}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Current: {(selectedAlgo.config.weight * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="minScore">Minimum Score</Label>
                        <Input
                          id="minScore"
                          type="number"
                          value={selectedAlgo.config.minScore}
                          onChange={(e) => 
                            algorithmRegistry.updateAlgorithmConfig(selectedAlgo.id, { 
                              minScore: parseInt(e.target.value) 
                            })
                          }
                          min={50}
                          max={100}
                        />
                      </div>
                      
                      <div>
                        <Label>Trading Symbols</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'BNBUSDT'].map(symbol => (
                            <Badge
                              key={symbol}
                              variant={selectedAlgo.config.symbols?.includes(symbol) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const currentSymbols = selectedAlgo.config.symbols || [];
                                const newSymbols = currentSymbols.includes(symbol)
                                  ? currentSymbols.filter(s => s !== symbol)
                                  : [...currentSymbols, symbol];
                                algorithmRegistry.updateAlgorithmConfig(selectedAlgo.id, { symbols: newSymbols });
                              }}
                            >
                              {symbol}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Timeframes</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {['5m', '15m', '30m', '1h', '4h'].map(tf => (
                            <Badge
                              key={tf}
                              variant={selectedAlgo.config.timeframes?.includes(tf) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const currentTf = selectedAlgo.config.timeframes || [];
                                const newTf = currentTf.includes(tf)
                                  ? currentTf.filter(t => t !== tf)
                                  : [...currentTf, tf];
                                algorithmRegistry.updateAlgorithmConfig(selectedAlgo.id, { timeframes: newTf });
                              }}
                            >
                              {tf}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="performance" className="space-y-4">
                  {selectedAlgo.performance && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span>Total Profit</span>
                        </div>
                        <span className="font-bold text-green-600">
                          +${selectedAlgo.performance.profit.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span>Win Rate</span>
                        </div>
                        <span className="font-bold text-blue-600">
                          {selectedAlgo.performance.winRate}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          <span>Average Score</span>
                        </div>
                        <span className="font-bold text-purple-600">
                          {selectedAlgo.performance.avgScore}
                        </span>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="status" className="space-y-4">
                  {(() => {
                    const status = algorithmRegistry.getAlgorithmStatus(selectedAlgo.id);
                    return status ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Status</span>
                          {getStatusBadge(selectedAlgo)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>Last Update</span>
                          <span className="text-sm text-muted-foreground">
                            {status.lastUpdate.toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {status.metrics && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-center p-2 border rounded">
                              <div className="font-medium">{status.metrics.successCount}</div>
                              <div className="text-muted-foreground">Success</div>
                            </div>
                            <div className="text-center p-2 border rounded">
                              <div className="font-medium">{status.metrics.errorCount}</div>
                              <div className="text-muted-foreground">Errors</div>
                            </div>
                          </div>
                        )}
                        
                        {status.error && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-800">{status.error}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>No status information available</div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}