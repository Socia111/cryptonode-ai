import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target, 
  Shield,
  RefreshCw,
  Play,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AItradeX1Signal {
  id: string;
  symbol: string;
  timeframe: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  score: number;
  confidence: number;
  signal_grade: string;
  created_at: string;
  metadata: {
    tags: string[];
    indicators: {
      sma250: number;
      ema21: number;
      atr: number;
      adx: number;
      stochastic_k: number;
    };
    confirmations: number;
    crossover_type: string;
  };
}

export function AItradeX1Dashboard() {
  const [signals, setSignals] = useState<AItradeX1Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    highGrade: 0,
    longSignals: 0,
    shortSignals: 0,
    avgConfidence: 0
  });
  const { toast } = useToast();

  const loadSignals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('source', 'aitradex1_scanner')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedSignals = (data || []).map(signal => ({
        ...signal,
        metadata: signal.metadata as any || {}
      })) as AItradeX1Signal[];
      setSignals(typedSignals);
      
      // Calculate stats
      const total = typedSignals.length;
      const highGrade = typedSignals.filter(s => ['A+', 'A', 'B+'].includes(s.signal_grade)).length;
      const longSignals = typedSignals.filter(s => s.direction === 'LONG').length;
      const shortSignals = typedSignals.filter(s => s.direction === 'SHORT').length;
      const avgConfidence = total > 0 ? typedSignals.reduce((acc, s) => acc + s.score, 0) / total : 0;
      
      setStats({ total, highGrade, longSignals, shortSignals, avgConfidence });
      
    } catch (error) {
      console.error('Error loading AItradeX1 signals:', error);
      toast({
        title: "Error",
        description: "Failed to load AItradeX1 signals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runAItradeX1Scanner = async () => {
    setScanning(true);
    try {
      const { error } = await supabase.functions.invoke('enhanced-signal-generation', {});
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "AItradeX1 scanner completed successfully",
      });
      
      // Reload signals after scan
      setTimeout(loadSignals, 2000);
      
    } catch (error) {
      console.error('Error running AItradeX1 scanner:', error);
      toast({
        title: "Error",
        description: "Failed to run AItradeX1 scanner",
        variant: "destructive"
      });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    loadSignals();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('aitradex1_signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
          filter: 'source=eq.aitradex1_scanner'
        },
        (payload) => {
          console.log('New AItradeX1 signal:', payload.new);
          loadSignals(); // Reload all signals
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-600';
      case 'A': return 'bg-green-500';
      case 'B+': return 'bg-blue-500';
      case 'B': return 'bg-blue-400';
      case 'C': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateRiskReward = (signal: AItradeX1Signal) => {
    const distance = Math.abs(signal.take_profit - signal.entry_price);
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    return risk > 0 ? (distance / risk).toFixed(2) : '0';
  };

  const highGradeSignals = signals.filter(s => ['A+', 'A', 'B+'].includes(s.signal_grade));
  const longSignals = signals.filter(s => s.direction === 'LONG');
  const shortSignals = signals.filter(s => s.direction === 'SHORT');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-500" />
            AItradeX1 Dashboard
          </h1>
          <p className="text-muted-foreground">
            Professional EMA/SMA crossover signals with multi-indicator confirmation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAItradeX1Scanner} disabled={scanning} className="bg-blue-600 hover:bg-blue-700">
            {scanning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Scanner
          </Button>
          <Button onClick={loadSignals} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Signals</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">High Grade</p>
                <p className="text-2xl font-bold">{stats.highGrade}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Long Signals</p>
                <p className="text-2xl font-bold">{stats.longSignals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Short Signals</p>
                <p className="text-2xl font-bold">{stats.shortSignals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{stats.avgConfidence.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signal Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({signals.length})</TabsTrigger>
          <TabsTrigger value="high-grade">High Grade ({highGradeSignals.length})</TabsTrigger>
          <TabsTrigger value="long">Long ({longSignals.length})</TabsTrigger>
          <TabsTrigger value="short">Short ({shortSignals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <SignalsGrid signals={signals} getGradeColor={getGradeColor} getConfidenceColor={getConfidenceColor} calculateRiskReward={calculateRiskReward} />
        </TabsContent>
        
        <TabsContent value="high-grade">
          <SignalsGrid signals={highGradeSignals} getGradeColor={getGradeColor} getConfidenceColor={getConfidenceColor} calculateRiskReward={calculateRiskReward} />
        </TabsContent>
        
        <TabsContent value="long">
          <SignalsGrid signals={longSignals} getGradeColor={getGradeColor} getConfidenceColor={getConfidenceColor} calculateRiskReward={calculateRiskReward} />
        </TabsContent>
        
        <TabsContent value="short">
          <SignalsGrid signals={shortSignals} getGradeColor={getGradeColor} getConfidenceColor={getConfidenceColor} calculateRiskReward={calculateRiskReward} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SignalsGrid({ 
  signals, 
  getGradeColor, 
  getConfidenceColor, 
  calculateRiskReward 
}: { 
  signals: AItradeX1Signal[];
  getGradeColor: (grade: string) => string;
  getConfidenceColor: (score: number) => string;
  calculateRiskReward: (signal: AItradeX1Signal) => string;
}) {
  if (signals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No AItradeX1 signals found</p>
          <p className="text-sm text-muted-foreground mt-2">Run the scanner to generate new signals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {signals.map((signal) => (
        <Card key={signal.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{signal.symbol}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                    {signal.direction === 'LONG' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {signal.direction}
                  </Badge>
                  <Badge variant="outline">{signal.timeframe}</Badge>
                  <Badge className={getGradeColor(signal.signal_grade)}>
                    {signal.signal_grade}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getConfidenceColor(signal.score)}`}>
                  {signal.score}%
                </div>
                <div className="text-xs text-muted-foreground">Confidence</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Price Levels */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">Entry</div>
                <div className="font-semibold">${signal.entry_price.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Stop Loss</div>
                <div className="font-semibold text-red-600">${signal.stop_loss.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Take Profit</div>
                <div className="font-semibold text-green-600">${signal.take_profit.toFixed(4)}</div>
              </div>
            </div>

            {/* Risk/Reward & Indicators */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk/Reward:</span>
                <span className="font-semibold">1:{calculateRiskReward(signal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crossover:</span>
                <span className="font-semibold">{signal.metadata?.crossover_type || 'N/A'}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Confirmations:</span>
                <span className="font-semibold">{signal.metadata?.confirmations || 0}</span>
              </div>
            </div>

            {/* Confidence Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Confidence Level</span>
                <span>{signal.score}%</span>
              </div>
              <Progress value={signal.score} className="h-2" />
            </div>

            {/* Tags */}
            {signal.metadata?.tags && signal.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {signal.metadata.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-muted-foreground">
              {new Date(signal.created_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}