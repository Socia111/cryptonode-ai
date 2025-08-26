import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Star, RefreshCw } from 'lucide-react';
import { useSpynxScores } from '@/hooks/useSignals';
import { useToast } from '@/hooks/use-toast';

const SpynxScoreCard = () => {
  const { scores, loading, updateSpynxScores } = useSpynxScores();
  const { toast } = useToast();

  const handleUpdateScores = async () => {
    try {
      await updateSpynxScores();
      toast({
        title: "Spynx Scores Updated",
        description: "Token rankings have been refreshed",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update Spynx scores",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    return 'C';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-primary" />
            <span>Spynx Scores™</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUpdateScores}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Update
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-6">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Loading scores...</p>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-6">
            <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No scores available</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleUpdateScores}
              className="mt-2"
            >
              Calculate Scores
            </Button>
          </div>
        ) : (
          scores.slice(0, 8).map((token, index) => (
            <div 
              key={token.token}
              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 bg-primary/20 rounded-full text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold trading-mono text-sm">{token.token}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>MC: ${(token.market_cap / 1000000).toFixed(0)}M</span>
                    <span className={token.price_change_24h >= 0 ? 'text-success' : 'text-destructive'}>
                      {token.price_change_24h >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                      {Math.abs(token.price_change_24h).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getScoreColor(token.score)}`}
                  >
                    {getScoreBadge(token.score)}
                  </Badge>
                  <span className={`font-bold trading-mono ${getScoreColor(token.score)}`}>
                    {token.score.toFixed(0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ROI: {token.roi_forecast.toFixed(1)}%
                </p>
              </div>
            </div>
          ))
        )}

        <Button variant="outline" className="w-full mt-4 text-xs">
          View Full Rankings
        </Button>
      </CardContent>
    </Card>
  );
};

export default SpynxScoreCard;