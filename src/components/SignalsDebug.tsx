import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, RefreshCw } from 'lucide-react';

export const SignalsDebug = () => {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[SignalsDebug] Fetching signals...');
      
      // Get all signals (no filters)
      const { data: allSignals, error: allError } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (allError) {
        throw new Error(`All signals query failed: ${allError.message}`);
      }

      // Get high confidence signals (80%+)
      const { data: highConfidenceSignals, error: highError } = await supabase
        .from('signals')
        .select('*')
        .gte('score', 80)
        .order('created_at', { ascending: false })
        .limit(50);

      if (highError) {
        throw new Error(`High confidence signals query failed: ${highError.message}`);
      }

      // Get recent signals (last 24 hours)
      const { data: recentSignals, error: recentError } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentError) {
        throw new Error(`Recent signals query failed: ${recentError.message}`);
      }

      // Calculate stats
      const stats = {
        total: allSignals?.length || 0,
        highConfidence: highConfidenceSignals?.length || 0,
        recent24h: recentSignals?.length || 0,
        scoreDistribution: {}
      };

      // Score distribution
      if (allSignals) {
        const scores = allSignals.map(s => Math.floor((s.score || 0) / 10) * 10);
        scores.forEach(score => {
          stats.scoreDistribution[score] = (stats.scoreDistribution[score] || 0) + 1;
        });
      }

      setStats(stats);
      setSignals(allSignals || []);
      
      console.log('[SignalsDebug] Results:', {
        total: stats.total,
        highConfidence: stats.highConfidence,
        recent24h: stats.recent24h,
        firstFew: allSignals?.slice(0, 3)
      });

    } catch (err: any) {
      console.error('[SignalsDebug] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span>🔍 Signals Debug Console</span>
          </div>
          <Button
            onClick={fetchSignals}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing signals database...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            <p className="font-medium">Error loading signals</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Signals</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.highConfidence}</div>
                  <div className="text-xs text-muted-foreground">High Confidence (80%+)</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.recent24h}</div>
                  <div className="text-xs text-muted-foreground">Last 24 Hours</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(stats.scoreDistribution).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Score Ranges</div>
                </div>
              </div>
            )}

            {/* Score Distribution */}
            {stats?.scoreDistribution && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Score Distribution:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.scoreDistribution)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([score, count]) => (
                      <Badge key={score} variant="outline" className="text-xs">
                        {score}%+: {count as number}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Signals Preview */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recent Signals Preview:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {signals.slice(0, 10).map((signal, index) => (
                  <div key={signal.id || index} className="p-2 border rounded text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{signal.symbol || 'Unknown'}</span>
                        <Badge 
                          variant={signal.direction === 'LONG' ? "default" : "destructive"} 
                          className="text-xs"
                        >
                          {signal.direction || 'Unknown'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {signal.timeframe || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <span>Score: {signal.score || 0}%</span>
                        <span>{formatTimeAgo(signal.created_at)}</span>
                      </div>
                    </div>
                    {signal.price && (
                      <div className="mt-1 text-muted-foreground">
                        Entry: ${Number(signal.price).toFixed(4)}
                        {signal.take_profit && ` → TP: $${Number(signal.take_profit).toFixed(4)}`}
                        {signal.stop_loss && ` | SL: $${Number(signal.stop_loss).toFixed(4)}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Why No Signals? */}
            {stats && stats.total === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Why no signals?</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• No signals have been generated yet</li>
                  <li>• Run the signal generation process</li>
                  <li>• Check if the scanner functions are working</li>
                </ul>
              </div>
            )}

            {stats && stats.total > 0 && stats.highConfidence === 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Signals exist but not displaying?</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Found {stats.total} total signals</li>
                  <li>• But {stats.highConfidence} are high confidence (80%+)</li>
                  <li>• App only shows 80%+ confidence signals</li>
                  <li>• Try lowering the confidence threshold</li>
                </ul>
              </div>
            )}

            {stats && stats.highConfidence > 0 && stats.recent24h === 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">High confidence signals exist but are old</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Found {stats.highConfidence} high confidence signals</li>
                  <li>• But only {stats.recent24h} are from last 24 hours</li>
                  <li>• App filters to recent signals only</li>
                  <li>• Generate fresh signals or extend time window</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};