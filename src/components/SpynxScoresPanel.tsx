import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, TrendingUp, Activity, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SpynxScore {
  id: string;
  symbol: string;
  timeframe: string;
  score: number;
  confidence: number;
  momentum: number;
  volatility: number;
  volume_profile: number;
  trend_strength: number;
  created_at: string;
}

export default function SpynxScoresPanel() {
  const [scores, setScores] = useState<SpynxScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');

  useEffect(() => {
    fetchScores();
    
    const channel = supabase
      .channel('spynx-scores')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spynx_scores' },
        () => fetchScores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTimeframe]);

  const fetchScores = async () => {
    try {
      const { data, error } = await supabase
        .from('spynx_scores')
        .select('*')
        .eq('timeframe', selectedTimeframe)
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get latest score per symbol
      const latestBySymbol = new Map();
      data?.forEach(score => {
        const existing = latestBySymbol.get(score.symbol);
        if (!existing || new Date(score.created_at) > new Date(existing.created_at)) {
          latestBySymbol.set(score.symbol, score);
        }
      });

      setScores(Array.from(latestBySymbol.values()).sort((a, b) => b.score - a.score));
    } catch (error) {
      console.error('Error fetching Spynx scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPerformancePrediction = (score: number) => {
    if (score >= 80) return { label: 'Excellent Performance', emoji: '🚀' };
    if (score >= 70) return { label: 'Strong Performance', emoji: '💪' };
    if (score >= 60) return { label: 'Good Performance', emoji: '👍' };
    if (score >= 40) return { label: 'Moderate Performance', emoji: '😐' };
    return { label: 'Weak Performance', emoji: '⚠️' };
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <Activity className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Spynx Performance Scores
          </CardTitle>
          <div className="flex gap-2">
            {['15m', '1h', '4h'].map(tf => (
              <Badge
                key={tf}
                variant={selectedTimeframe === tf ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scores.map((score, index) => {
            const prediction = getPerformancePrediction(score.score);
            
            return (
              <div
                key={score.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {score.symbol.replace('USDT', '')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {prediction.emoji} {prediction.label}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {score.score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(score.confidence * 100).toFixed(0)}% Confidence
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Momentum
                    </span>
                    <span className="font-semibold">{score.momentum.toFixed(0)}</span>
                  </div>
                  <Progress value={score.momentum} className="h-1" />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Trend Strength
                    </span>
                    <span className="font-semibold">{score.trend_strength.toFixed(0)}</span>
                  </div>
                  <Progress value={score.trend_strength} className="h-1" />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Volume Profile
                    </span>
                    <span className="font-semibold">{score.volume_profile.toFixed(0)}</span>
                  </div>
                  <Progress value={score.volume_profile} className="h-1" />
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Volatility: {score.volatility.toFixed(1)}</span>
                  <span>{new Date(score.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {scores.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No Spynx scores available yet</p>
            <p className="text-sm">Scores will appear shortly</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
