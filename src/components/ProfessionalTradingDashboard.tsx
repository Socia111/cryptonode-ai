import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Play,
  Star,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useRealTimeSignals } from '@/hooks/useRealTimeSignals';
import type { Signal as TradingSignal } from '@/types/trading';

interface AlgorithmStats {
  activeSignals: number;
  avgConfidence: number;
  avgRR: number;
  totalSignals: number;
}

interface TradePosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  pnl: number;
  status: 'profitable' | 'pending' | 'loss';
  entry: number;
  current: number;
}

export function ProfessionalTradingDashboard() {
  const { signals } = useSignals();
  const { signals: liveSignals } = useRealTimeSignals();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [tradeAmount, setTradeAmount] = useState('100');

  // Mock data for demonstration - in real app this would come from your trading API
  const portfolioValue = 12345.67;
  const dailyPnL = 234.56;
  const pnlPercent = 1.93;
  
  const activePositions: TradePosition[] = [
    { id: '1', symbol: 'BTC/USDT', side: 'buy', pnl: 150.25, status: 'profitable', entry: 42000, current: 42150 },
    { id: '2', symbol: 'ETH/USDT', side: 'sell', pnl: 84.31, status: 'profitable', entry: 2500, current: 2484 },
    { id: '3', symbol: 'SOL/USDT', side: 'buy', pnl: 0, status: 'pending', entry: 95.50, current: 95.48 }
  ];

  const algorithmStats: AlgorithmStats = {
    activeSignals: signals?.length || 0,
    avgConfidence: signals?.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / (signals?.length || 1) || 0,
    avgRR: 1.5,
    totalSignals: signals?.length || 0
  };

  const signalGrades = [
    { grade: 'A+', label: 'Exceptional signals', confidence: '>90, RR >1.4', count: 0, color: 'bg-success' },
    { grade: 'A', label: 'Strong signals', confidence: '≥85, RR ≥1.3', count: 0, color: 'bg-primary' },
    { grade: 'B', label: 'Good signals', confidence: '≥80', count: 0, color: 'bg-warning' },
    { grade: 'C', label: 'Fair signals', confidence: '60-80', count: 0, color: 'bg-muted-foreground' }
  ];

  const algorithmComponents = [
    { name: 'Golden Cross / Death Cross (21 EMA x 200 SMA)', status: 'active', type: 'primary' },
    { name: 'Volume Surge (≥1.5x average)', status: 'active', type: 'primary' },
    { name: 'High Volatility Regime (HVP > 50)', status: 'active', type: 'primary' },
    { name: 'Stochastic Momentum Filter', status: 'optional', type: 'secondary' },
    { name: 'DMI/ADX Trend Strength (ADX > 20)', status: 'optional', type: 'secondary' },
    { name: 'ATR-Based Risk Management', status: 'optional', type: 'secondary' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground brand-display">
                Unireli Professional Trading Platform
              </h1>
              <p className="text-muted-foreground">
                Advanced Multi-Exchange Signal Detection with Real-Time Analytics & Risk Management
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="signals" className="w-full">
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-6">
            <TabsList className="h-12 bg-transparent grid w-full grid-cols-6">
              <TabsTrigger value="signals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                📊 Signals
              </TabsTrigger>
              <TabsTrigger value="live-feed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                📡 Live Feed
              </TabsTrigger>
              <TabsTrigger value="trading" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                ⚡ Trading
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                🔧 System
              </TabsTrigger>
              <TabsTrigger value="controls" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                🎯 Controls
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                📈 Dashboard
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Overview */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="surface-elevated">
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        <p className="metric-label">Portfolio Value</p>
                        <p className="price-display text-foreground">${portfolioValue.toLocaleString()}</p>
                        <p className="text-sm text-success">+2.4% from last hour</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="surface-elevated">
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        <p className="metric-label">Active Trades</p>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-foreground">{activePositions.length}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activePositions.filter(p => p.status === 'profitable').length} profitable, {activePositions.filter(p => p.status === 'pending').length} pending
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="surface-elevated">
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        <p className="metric-label">Daily P&L</p>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-success" />
                          <span className="price-display text-success">+${dailyPnL}</span>
                        </div>
                        <p className="text-sm text-success">+{pnlPercent}% today</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Execute Trade Section */}
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Execute Trade</CardTitle>
                    <p className="text-sm text-muted-foreground">Test the trading system with a simulated order</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="metric-label">Symbol</label>
                        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                            <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                            <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="metric-label">Side</label>
                        <Select defaultValue="Buy">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Buy">Buy</SelectItem>
                            <SelectItem value="Sell">Sell</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="metric-label">Amount (USD)</label>
                        <Input
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button className="bg-primary hover:bg-primary/90 flex-1">
                        Execute Test Trade
                      </Button>
                      <Button variant="outline">
                        Check Status
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-info/10 border border-info/20 rounded-md">
                      <Badge variant="secondary" className="bg-info/20 text-info border-info/30">
                        Test Mode
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        This is a simulated trade execution for testing purposes
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Positions */}
              <div className="space-y-6">
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Active Trades</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activePositions.map((position) => (
                      <div key={position.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{position.symbol}</span>
                          <Badge 
                            variant={position.status === 'profitable' ? 'default' : 'secondary'}
                            className={position.status === 'profitable' ? 'bg-success/20 text-success border-success/30' : ''}
                          >
                            {position.status === 'profitable' ? 'Profitable' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {position.side === 'buy' ? '↗️' : '↘️'} {position.side.toUpperCase()}
                          </span>
                          <span className={position.pnl >= 0 ? 'text-success' : 'text-destructive'}>
                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="surface-elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold">Complete Trading Signal Algorithm</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Advanced multi-layered signal scoring using Golden Cross, HVP filtering, and ATR-based risk management
                        </p>
                      </div>
                      <Button className="bg-primary hover:bg-primary/90">
                        <Play className="h-4 w-4 mr-2" />
                        Generate Signals
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{algorithmStats.activeSignals}</div>
                        <div className="metric-label">Active Signals</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-success">{algorithmStats.avgConfidence.toFixed(0)}</div>
                        <div className="metric-label">Avg Confidence</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground">{algorithmStats.avgRR.toFixed(1)}</div>
                        <div className="metric-label">Avg R:R</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-muted-foreground">{algorithmStats.totalSignals}</div>
                        <div className="metric-label">All Signals</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Algorithm Components</h3>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                          Primary Conditions (Mandatory)
                        </h4>
                        {algorithmComponents.filter(c => c.type === 'primary').map((component, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="text-sm">{component.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                          Secondary Filters (Optional)
                        </h4>
                        {algorithmComponents.filter(c => c.type === 'secondary').map((component, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                            <AlertCircle className="h-4 w-4 text-warning" />
                            <span className="text-sm">{component.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Recent Complete Algorithm Signals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <Star className="h-12 w-12 text-muted-foreground mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-muted-foreground">No complete algorithm signals generated yet</p>
                          <p className="text-sm text-muted-foreground">
                            Click 'Generate Signals' to run the complete trading signal algorithm.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Signal Grade Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {signalGrades.map((grade, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {grade.grade}
                            </Badge>
                            <span className="text-sm font-medium">{grade.label}</span>
                          </div>
                          <span className="text-sm font-medium">{grade.count} signals</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{grade.confidence}</div>
                        <Progress value={grade.count > 0 ? (grade.count / algorithmStats.totalSignals) * 100 : 0} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Other tabs content would go here */}
          <TabsContent value="live-feed" className="mt-0">
            <Card className="surface-elevated">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Live Market Feed</h3>
                  <p className="text-muted-foreground">Real-time market data and signal updates will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trading" className="mt-0">
            <Card className="surface-elevated">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Trading Interface</h3>
                  <p className="text-muted-foreground">Advanced trading tools and order management</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="mt-0">
            <Card className="surface-elevated">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">System Status</h3>
                  <p className="text-muted-foreground">Monitor system health and performance metrics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="mt-0">
            <Card className="surface-elevated">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Trading Controls</h3>
                  <p className="text-muted-foreground">Configure auto-trading and risk management settings</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Bottom Live Signals Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className="bg-success/20 text-success border-success/30">
                ⚡ Live Signals
              </Badge>
              <span className="text-sm text-muted-foreground">
                38 Active (15m-4h)
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">BUY</Badge>
                <span>22 $BTC</span>
                <Badge variant="outline" className="bg-success/20 text-success border-success/30">$92.1K+</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">BUY</Badge>
                <span>DOGE/USDT</span>
                <Badge variant="outline" className="bg-success/20 text-success border-success/30">$0.424</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">SELL</Badge>
                <span>SHIB</span>
                <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">-3% 4h</Badge>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Generate
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
