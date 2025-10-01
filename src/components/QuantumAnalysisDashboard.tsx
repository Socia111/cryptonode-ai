import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, Activity, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuantumAnalysis {
  symbol: string;
  timeframe: string;
  quantum_score: number;
  momentum: number;
  volatility: number;
  volume_profile: number;
  trend_strength: number;
  market_phase: string;
  wave_pattern: string;
  recommendation: string;
  confidence: number;
  analyzed_at: string;
}

export default function QuantumAnalysisDashboard() {
  const [analyses, setAnalyses] = useState<QuantumAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runQuantumAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quantum-analysis', {
        body: { 
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
          timeframe: '1h'
        }
      });

      if (error) throw error;

      setAnalyses(data.analyses);
      toast({
        title: "Quantum Analysis Complete",
        description: `Analyzed ${data.analyses_count} tokens with quantum algorithms`,
      });
    } catch (error: any) {
      console.error('Quantum analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.includes('STRONG_BUY')) return 'bg-green-500';
    if (rec.includes('BUY')) return 'bg-green-400';
    if (rec.includes('HOLD')) return 'bg-yellow-500';
    if (rec.includes('SELL')) return 'bg-red-400';
    return 'bg-red-500';
  };

  const getPhaseEmoji = (phase: string) => {
    const emojis: Record<string, string> = {
      'ACCUMULATION': '📈',
      'MARKUP': '🚀',
      'DISTRIBUTION': '📉',
      'MARKDOWN': '⚠️',
      'CONSOLIDATION': '⏸️'
    };
    return emojis[phase] || '📊';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Quantum Market Analysis
          </CardTitle>
          <Button 
            onClick={runQuantumAnalysis} 
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {analyses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="mb-2">No quantum analysis available</p>
            <p className="text-sm">Click "Run Analysis" to start quantum market analysis</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {analyses.map((analysis) => (
              <div
                key={analysis.symbol}
                className="p-4 rounded-lg border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {analysis.symbol.replace('USDT', '')}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{analysis.timeframe}</Badge>
                      <span className="text-2xl">{getPhaseEmoji(analysis.market_phase)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {analysis.quantum_score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Quantum Score
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Momentum</span>
                    <span className="font-semibold">{analysis.momentum.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trend Strength</span>
                    <span className="font-semibold">{analysis.trend_strength.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Volume Profile</span>
                    <span className="font-semibold">{analysis.volume_profile.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Volatility</span>
                    <span className="font-semibold">{analysis.volatility.toFixed(1)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Market Phase:</span>
                    <Badge variant="secondary">{analysis.market_phase}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Wave Pattern:</span>
                    <Badge variant="outline">{analysis.wave_pattern}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Recommendation:</span>
                    <Badge className={getRecommendationColor(analysis.recommendation)}>
                      {analysis.recommendation}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Confidence: {(analysis.confidence * 100).toFixed(0)}% • {new Date(analysis.analyzed_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
