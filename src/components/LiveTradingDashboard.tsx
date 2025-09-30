import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Zap,
  Eye,
  Activity,
  DollarSign,
  Target
} from 'lucide-react';

interface Signal {
  id: string;
  symbol: string;
  direction: string;
  price: number;
  score: number;
  confidence: number;
  timeframe: string;
  created_at: string;
  metadata: any;
  stop_loss?: number;
  take_profit?: number;
}

interface SystemStatus {
  signals_generator: boolean;
  auto_trading: boolean;
  bybit_connection: boolean;
  scanner: boolean;
}

const LiveTradingDashboard = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    signals_generator: false,
    auto_trading: false,
    bybit_connection: false,
    scanner: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const { toast } = useToast();

  // Real-time signals subscription
  useEffect(() => {
    fetchSignals();
    checkSystemStatus();
    
    const channel = supabase
      .channel('signals-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'signals',
          filter: 'is_active.eq.true'
        }, 
        (payload) => {
          console.log('New signal:', payload);
          fetchSignals();
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "🚨 New Trading Signal",
              description: `${payload.new.symbol} ${payload.new.direction} - Score: ${payload.new.score}%`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSignals = async () => {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gte('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .order('score', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching signals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch signals",
        variant: "destructive"
      });
    } else {
      setSignals(data || []);
    }
  };

  const checkSystemStatus = async () => {
    try {
      // Check signals generator
      const { data: debugStatus } = await supabase.functions.invoke('debug-trading-status');
      
      // Check Bybit connection
      const { data: connectionTest } = await supabase.functions.invoke('bybit-live-trading', {
        body: { action: 'test_connection' }
      });

      setSystemStatus({
        signals_generator: debugStatus?.success || false,
        auto_trading: debugStatus?.environment?.auto_trading_enabled || false,
        bybit_connection: connectionTest?.success || false,
        scanner: true // Scanner is always active
      });

    } catch (error) {
      console.error('Error checking system status:', error);
    }
  };

  const generateSignals = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('live-signals-generator');
      
      if (error) throw error;
      
      toast({
        title: "✅ Signals Generated",
        description: `Generated ${data.signals_generated} new signals`,
      });
      
      fetchSignals();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate signals",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const runFullCycle = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('signals-scheduler', {
        body: { mode: 'full_cycle' }
      });
      
      if (error) throw error;
      
      toast({
        title: "🚀 Full Cycle Complete",
        description: `Generated signals and processed trading opportunities`,
      });
      
      fetchSignals();
      checkSystemStatus();
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to run full cycle",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const executeSignal = async (signal: Signal) => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-live-trading', {
        body: {
          action: 'execute_trade',
          signal: signal
        }
      });

      if (error) throw error;

      toast({
        title: data.success ? "✅ Trade Executed" : "❌ Trade Failed",
        description: `${signal.symbol} ${signal.direction} - ${data.success ? 'Successful' : 'Failed'}`,
        variant: data.success ? "default" : "destructive"
      });

    } catch (error) {
      toast({
        title: "Execution Error",
        description: "Failed to execute trade",
        variant: "destructive"
      });
    }
  };

  const checkBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-live-trading', {
        body: { action: 'balance' }
      });

      if (error) throw error;
      setBalance(data.balance);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch balance",
        variant: "destructive"
      });
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500 text-white';
      case 'B': return 'bg-blue-500 text-white';
      case 'C': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatPrice = (price: number) => {
    return price?.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
  };

  const formatRR = (signal: Signal) => {
    if (!signal.stop_loss || !signal.take_profit) return 'N/A';
    
    const risk = Math.abs(signal.price - signal.stop_loss);
    const reward = Math.abs(signal.take_profit - signal.price);
    const ratio = reward / risk;
    
    return `1:${ratio.toFixed(2)}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Trading Dashboard</h1>
          <p className="text-muted-foreground">Real-time signal generation and automated trading</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={generateSignals} disabled={isGenerating} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate Signals
          </Button>
          
          <Button onClick={runFullCycle} disabled={isGenerating}>
            <Zap className="h-4 w-4 mr-2" />
            Full Cycle
          </Button>
          
          <Button onClick={checkBalance} variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Check Balance
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${systemStatus.signals_generator ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">Signal Generator</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${systemStatus.bybit_connection ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">Bybit Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${systemStatus.auto_trading ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm">Auto Trading</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${systemStatus.scanner ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">Market Scanner</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Signals</p>
                <p className="text-2xl font-bold">{signals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Long Signals</p>
                <p className="text-2xl font-bold">{signals.filter(s => s.direction === 'LONG').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Short Signals</p>
                <p className="text-2xl font-bold">{signals.filter(s => s.direction === 'SHORT').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">
                  {signals.length > 0 
                    ? Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Trading Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <Alert>
              <AlertDescription>
                No active signals found. Click "Generate Signals" to create new trading opportunities.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {signals.map((signal) => (
                <div key={signal.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{signal.symbol}</h3>
                      <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                        {signal.direction === 'LONG' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {signal.direction}
                      </Badge>
                      <Badge className={getGradeColor(signal.metadata?.grade || 'C')}>
                        Grade {signal.metadata?.grade || 'C'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
                      <Button 
                        onClick={() => executeSignal(signal)}
                        size="sm"
                        className="ml-2"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Execute
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry Price</p>
                      <p className="font-medium">${formatPrice(signal.price)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-medium">${formatPrice(signal.stop_loss || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-medium">${formatPrice(signal.take_profit || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">R:R Ratio</p>
                      <p className="font-medium">{formatRR(signal)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-medium">{signal.score}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="font-medium">{Math.round(signal.confidence * 100)}%</p>
                    </div>
                  </div>

                  {signal.metadata?.rsi && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>RSI: {signal.metadata.rsi}</span>
                      <span>SMA20: ${formatPrice(signal.metadata.sma20 || 0)}</span>
                      <span>Volume Ratio: {signal.metadata.volume_ratio}x</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveTradingDashboard;