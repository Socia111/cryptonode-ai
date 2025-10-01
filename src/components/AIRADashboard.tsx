import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Award, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AIRARanking {
  id: string;
  symbol: string;
  rank: number;
  score: number;
  volume_24h: number;
  price_change_24h: number;
  aira_indicators: {
    momentum: number;
    volatility: number;
    volume: number;
    trend: number;
    strength: number;
    price: number;
  };
  created_at: string;
}

export default function AIRADashboard() {
  const [rankings, setRankings] = useState<AIRARanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('aira-rankings')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'aira_rankings' },
        () => fetchRankings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRankings = async () => {
    try {
      const { data, error } = await supabase
        .from('aira_rankings')
        .select('*')
        .order('rank', { ascending: true })
        .limit(20);

      if (error) throw error;
      
      // Get latest ranking per symbol
      const latestBySymbol = new Map();
      data?.forEach(ranking => {
        const existing = latestBySymbol.get(ranking.symbol);
        if (!existing || new Date(ranking.created_at) > new Date(existing.created_at)) {
          latestBySymbol.set(ranking.symbol, ranking);
        }
      });
      
      setRankings(Array.from(latestBySymbol.values()).sort((a, b) => a.rank - b.rank));
    } catch (error) {
      console.error('Error fetching AIRA rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 70) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 60) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Poor', variant: 'destructive' as const };
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
            <Award className="w-5 h-5 text-primary" />
            AIRA Token Rankings
          </CardTitle>
          <Badge variant="outline">Top {rankings.length} Tokens</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankings.map((ranking) => {
            const scoreBadge = getScoreBadge(ranking.score);
            const priceChangePositive = ranking.price_change_24h >= 0;
            
            return (
              <div
                key={ranking.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {ranking.rank}
                  </div>
                  <div>
                    <div className="font-semibold">{ranking.symbol.replace('USDT', '')}</div>
                    <div className="text-sm text-muted-foreground">
                      ${ranking.aira_indicators.price.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(ranking.score)}`}>
                      {ranking.score}
                    </div>
                    <Badge variant={scoreBadge.variant} className="text-xs">
                      {scoreBadge.label}
                    </Badge>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">24h Change</div>
                    <div className={`flex items-center gap-1 font-semibold ${priceChangePositive ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChangePositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {Math.abs(ranking.price_change_24h).toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Momentum</div>
                    <div className="font-semibold">
                      {ranking.aira_indicators.momentum.toFixed(0)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Strength</div>
                    <div className="font-semibold">
                      {ranking.aira_indicators.strength.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {rankings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No AIRA rankings available yet</p>
            <p className="text-sm">Rankings will appear shortly</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
