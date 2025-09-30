import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  PlayCircle, 
  StopCircle, 
  RefreshCw, 
  TrendingUp, 
  Activity, 
  Settings,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';

interface SystemStatus {
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastUpdate?: string;
  details?: any;
}

interface Signal {
  id: string;
  symbol: string;
  direction: string;
  price: number;
  score: number;
  timeframe: string;
  created_at: string;
  metadata?: any;
  indicators?: any;
}

export default function SystemActivation() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSystemStatus();
    fetchRecentSignals();
    
    // Set up real-time subscription
    const signalSubscription = supabase
      .channel('signals-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'signals' },
        (payload) => {
          setSignals(prev => [payload.new as Signal, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalSubscription);
    };
  }, []);

  const checkSystemStatus = async () => {
    try {
      const functions = [
        'enhanced-signal-generation',
        'live-scanner-production', 
        'bybit-live-trading',
        'auto-trading-engine',
        'crypto-scheduler'
      ];

      const statuses: SystemStatus[] = [];

      for (const func of functions) {
        try {
          const { data, error } = await supabase.functions.invoke(func, {
            body: { mode: 'activation' }
          });

          statuses.push({
            name: func,
            status: error ? 'error' : 'active',
            lastUpdate: new Date().toISOString(),
            details: data
          });
        } catch (err) {
          statuses.push({
            name: func,
            status: 'error',
            lastUpdate: new Date().toISOString(),
            details: { error: err }
          });
        }
      }

      setSystemStatus(statuses);
    } catch (error) {
      console.error('Error checking system status:', error);
      toast({
        title: "System Check Failed",
        description: "Unable to verify system status",
        variant: "destructive"
      });
    }
  };

  const fetchRecentSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .gte('score', 70)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSignals(data || []);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const generateSignals = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { 
          mode: 'generate',
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT']
        }
      });

      if (error) throw error;

      toast({
        title: "Signals Generated",
        description: `Generated ${data.signals_generated} new signals using EMA21/SMA200 strategy`,
      });

      await fetchRecentSignals();
    } catch (error) {
      console.error('Error generating signals:', error);
      toast({
        title: "Signal Generation Failed",
        description: "Unable to generate signals",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const activateSystem = async () => {
    setIsActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('crypto-scheduler', {
        body: { automated: true }
      });

      if (error) throw error;

      toast({
        title: "System Activated",
        description: "Full trading system cycle initiated",
      });

      await checkSystemStatus();
      await fetchRecentSignals();
    } catch (error) {
      console.error('Error activating system:', error);
      toast({
        title: "Activation Failed",
        description: "Unable to activate trading system",
        variant: "destructive"
      });
    } finally {
      setIsActivating(false);
    }
  };

  const executeSignal = async (signal: Signal) => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-live-trading', {
        body: {
          action: 'execute_trade',
          signal: {
            symbol: signal.symbol,
            side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
            amount: 50, // Default amount in USD
            leverage: 1
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Trade Executed",
        description: `${signal.direction} order placed for ${signal.symbol}`,
      });
    } catch (error) {
      console.error('Error executing trade:', error);
      toast({
        title: "Execution Failed",
        description: "Unable to execute trade",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AItradeX1 System Activation</h1>
          <p className="text-muted-foreground">EMA21/SMA200 + Volatility Expansion Strategy</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkSystemStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={generateSignals} 
            disabled={isGenerating}
            variant="outline"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Signals'}
          </Button>
          <Button 
            onClick={activateSystem} 
            disabled={isActivating}
            className="bg-green-600 hover:bg-green-700"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            {isActivating ? 'Activating...' : 'Activate System'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="signals">Live Signals</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Details</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Components
              </CardTitle>
              <CardDescription>
                Status of all trading system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemStatus.map((component) => (
                  <Card key={component.name} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{component.name}</h3>
                      {getStatusIcon(component.status)}
                    </div>
                    <Badge 
                      variant={component.status === 'active' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {component.status}
                    </Badge>
                    {component.lastUpdate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last: {new Date(component.lastUpdate).toLocaleTimeString()}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Live Trading Signals
              </CardTitle>
              <CardDescription>
                Recent signals from EMA21/SMA200 + Volatility Expansion strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signals.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No active signals found. Generate new signals to begin trading.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <Card key={signal.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{signal.symbol}</h3>
                            <p className="text-sm text-muted-foreground">{signal.timeframe}</p>
                          </div>
                          <Badge 
                            variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                          >
                            {signal.direction}
                          </Badge>
                          <div className="text-right">
                            <p className="font-mono text-sm">${signal.price.toFixed(4)}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">Score: {signal.score}</span>
                              {signal.metadata?.grade && (
                                <Badge 
                                  className={`text-xs ${getGradeColor(signal.metadata.grade)}`}
                                >
                                  {signal.metadata.grade}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => executeSignal(signal)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Execute
                          </Button>
                        </div>
                      </div>
                      {signal.indicators && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <span>EMA21: {signal.indicators.ema21?.toFixed(2)}</span>
                          <span>SMA200: {signal.indicators.sma200?.toFixed(2)}</span>
                          <span>StochRSI: {signal.indicators.stoch_rsi_k?.toFixed(1)}</span>
                          <span>ADX: {signal.indicators.adx?.toFixed(1)}</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Strategy Configuration
              </CardTitle>
              <CardDescription>
                EMA21/SMA200 + Volatility Expansion Strategy Details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Entry Conditions</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>LONG:</strong> EMA21 {'>'} SMA200 + Vol Expansion + StochRSI {'<'} 20 + ADX {'>'} 25</div>
                    <div><strong>SHORT:</strong> EMA21 {'<'} SMA200 + Vol Expansion + StochRSI {'>'} 80 + ADX {'>'} 25</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Risk Management</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Stop Loss:</strong> 1.5 × ATR(14)</div>
                    <div><strong>Take Profit:</strong> 2.0 × ATR(14)</div>
                    <div><strong>Position Size:</strong> Risk-based (1% account risk)</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Technical Indicators</h3>
                  <div className="space-y-2 text-sm">
                    <div>• EMA(21) - Short-term trend</div>
                    <div>• SMA(200) - Long-term trend</div>
                    <div>• StochRSI(14,3,3) - Momentum</div>
                    <div>• ADX(14) - Trend strength</div>
                    <div>• ATR(14) - Volatility/Risk</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Signal Grading</h3>
                  <div className="space-y-2 text-sm">
                    <div><Badge className="bg-green-500 mr-2">A</Badge>Score ≥ 85 (ADX {'>'} 30)</div>
                    <div><Badge className="bg-blue-500 mr-2">B</Badge>Score ≥ 78 (Strong confluence)</div>
                    <div><Badge className="bg-yellow-500 mr-2">C</Badge>Score ≥ 70 (Basic signal)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}