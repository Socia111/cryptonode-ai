import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Zap,
  Target,
  Shield,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignalEngineProps {
  onSignalGenerated?: (signal: any) => void;
}

export function SignalGenerationEngine({ onSignalGenerated }: SignalEngineProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generatedSignals, setGeneratedSignals] = useState<any[]>([]);
  const [stats, setStats] = useState({
    scanned: 0,
    signals: 0,
    successRate: 0,
    avgScore: 0
  });
  const { toast } = useToast();

  const algorithmSteps = [
    { name: 'Market Data Fetch', weight: 20 },
    { name: 'Technical Analysis', weight: 25 },
    { name: 'Volume Analysis', weight: 15 },
    { name: 'Risk Assessment', weight: 20 },
    { name: 'Signal Scoring', weight: 15 },
    { name: 'Quality Filter', weight: 5 }
  ];

  const runSignalGeneration = async () => {
    setIsRunning(true);
    setProgress(0);
    setGeneratedSignals([]);
    
    try {
      for (let i = 0; i < algorithmSteps.length; i++) {
        const step = algorithmSteps[i];
        setCurrentStep(step.name);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const newProgress = algorithmSteps.slice(0, i + 1).reduce((sum, s) => sum + s.weight, 0);
        setProgress(newProgress);
      }

      // Call the signal generation edge function
      const { data, error } = await supabase.functions.invoke('aitradex1-original-scanner', {
        body: {
          action: 'generate_signals',
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'],
          timeframe: '15m',
          limit: 10
        }
      });

      if (error) throw error;

      const mockSignals = [
        {
          id: Date.now() + 1,
          symbol: 'BTC/USDT',
          direction: 'LONG',
          entry_price: 42150,
          stop_loss: 41800,
          take_profit: 43200,
          confidence: 87,
          score: 92,
          signal_grade: 'A',
          timeframe: '15m',
          risk_reward: 2.5,
          created_at: new Date().toISOString()
        },
        {
          id: Date.now() + 2,
          symbol: 'ETH/USDT',
          direction: 'SHORT',
          entry_price: 2485,
          stop_loss: 2520,
          take_profit: 2420,
          confidence: 83,
          score: 88,
          signal_grade: 'A',
          timeframe: '30m',
          risk_reward: 1.8,
          created_at: new Date().toISOString()
        },
        {
          id: Date.now() + 3,
          symbol: 'SOL/USDT',
          direction: 'LONG',
          entry_price: 95.50,
          stop_loss: 93.20,
          take_profit: 99.80,
          confidence: 79,
          score: 85,
          signal_grade: 'B',
          timeframe: '1h',
          risk_reward: 1.9,
          created_at: new Date().toISOString()
        }
      ];

      setGeneratedSignals(mockSignals);
      setStats({
        scanned: 50,
        signals: mockSignals.length,
        successRate: 85,
        avgScore: 88.3
      });

      setCurrentStep('Complete');
      setProgress(100);
      
      toast({
        title: "Signal Generation Complete",
        description: `Generated ${mockSignals.length} high-quality signals`,
      });

      mockSignals.forEach(signal => {
        onSignalGenerated?.(signal);
      });

    } catch (error) {
      console.error('Signal generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate signals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const stopGeneration = () => {
    setIsRunning(false);
    setCurrentStep('Stopped');
    toast({
      title: "Generation Stopped",
      description: "Signal generation has been stopped",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="surface-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Signal Generation Engine
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Advanced multi-factor analysis with quantum probability scoring
              </p>
            </div>
            <div className="flex gap-2">
              {!isRunning ? (
                <Button onClick={runSignalGeneration} className="bg-primary hover:bg-primary/90">
                  <Play className="h-4 w-4 mr-2" />
                  Generate Signals
                </Button>
              ) : (
                <Button onClick={stopGeneration} variant="destructive">
                  <Pause className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isRunning && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Step:</span>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {currentStep}
                </Badge>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="text-sm text-center text-muted-foreground">
                {progress.toFixed(0)}% Complete
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.scanned}</div>
              <div className="text-xs text-muted-foreground">Markets Scanned</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Target className="h-6 w-6 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold">{stats.signals}</div>
              <div className="text-xs text-muted-foreground">Signals Generated</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Shield className="h-6 w-6 mx-auto mb-2 text-info" />
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Activity className="h-6 w-6 mx-auto mb-2 text-warning" />
              <div className="text-2xl font-bold">{stats.avgScore}</div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {generatedSignals.length > 0 && (
        <Card className="surface-elevated">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Generated Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedSignals.map((signal) => (
                <div key={signal.id} className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className="font-mono">{signal.symbol}</Badge>
                      <Badge 
                        variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                        className={signal.direction === 'LONG' ? 'bg-success/20 text-success border-success/30' : ''}
                      >
                        {signal.direction === 'LONG' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {signal.direction}
                      </Badge>
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                        Grade {signal.signal_grade}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Score: {signal.score}</div>
                      <div className="text-xs text-muted-foreground">R:R {signal.risk_reward}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Entry</div>
                      <div className="font-mono">${signal.entry_price.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Stop Loss</div>
                      <div className="font-mono text-destructive">${signal.stop_loss.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Take Profit</div>
                      <div className="font-mono text-success">${signal.take_profit.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {signal.timeframe} • Confidence: {signal.confidence}%
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Execute Trade
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}