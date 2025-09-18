import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { smartSignalAggregator, AggregatedSignal } from '@/lib/smartSignalAggregator';
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export function SmartSignalDashboard() {
  const [aggregatedSignals, setAggregatedSignals] = useState<AggregatedSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchAggregatedSignals = async () => {
    setLoading(true);
    try {
      const signals = await smartSignalAggregator.aggregateSignals();
      setAggregatedSignals(signals);
    } catch (error) {
      console.error('Failed to fetch aggregated signals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAggregatedSignals();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAggregatedSignals, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getConsensusColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getReliabilityIcon = (reliability: number) => {
    if (reliability >= 0.8) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (reliability >= 0.6) return <Target className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>Smart Signal Aggregation</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Auto Refresh</span>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>
              <Button 
                onClick={fetchAggregatedSignals}
                disabled={loading}
                size="sm"
              >
                {loading ? 'Processing...' : 'Refresh Signals'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {aggregatedSignals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? 'Processing signals...' : 'No aggregated signals available'}
              </div>
            ) : (
              aggregatedSignals.map((signal) => (
                <Card key={signal.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Signal Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{signal.symbol}</h3>
                          <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                            {signal.direction}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Score: {signal.score}
                        </div>
                        <div className="text-sm">
                          Entry: ${signal.entry_price?.toFixed(4)}
                        </div>
                      </div>

                      {/* Consensus Metrics */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Consensus</span>
                          <span className={`text-sm font-bold ${getConsensusColor(signal.consensusScore)}`}>
                            {(signal.consensusScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={signal.consensusScore * 100} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {signal.sources.length} sources
                        </div>
                      </div>

                      {/* Reliability */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getReliabilityIcon(signal.reliability)}
                          <span className="text-sm font-medium">Reliability</span>
                          <span className="text-sm">{(signal.reliability * 100).toFixed(1)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Conflict: {(signal.conflictLevel * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs">
                          Confidence: {signal.aggregatedConfidence}%
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Badge variant="outline" className="text-xs">
                          {signal.signal_type}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Risk: {signal.conflictLevel < 0.3 ? 'LOW' : signal.conflictLevel < 0.6 ? 'MEDIUM' : 'HIGH'}
                        </div>
                        {signal.timeframe && (
                          <div className="text-xs">
                            TF: {signal.timeframe}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Targets */}
                    {(signal.stop_loss || signal.take_profit) && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                        {signal.stop_loss && (
                          <div>
                            <span className="text-red-500">SL:</span> ${signal.stop_loss.toFixed(4)}
                          </div>
                        )}
                        {signal.take_profit && (
                          <div>
                            <span className="text-green-500">TP:</span> ${signal.take_profit.toFixed(4)}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Source Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Signal Sources Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* This would show the status of different signal sources */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Enhanced Scanner</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Reliability</span>
                  <span className="text-green-500">85%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Weight</span>
                  <span>40%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Update</span>
                  <span>2m ago</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Live Scanner</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Reliability</span>
                  <span className="text-yellow-500">78%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Weight</span>
                  <span>30%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Update</span>
                  <span>1m ago</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Quantum Analysis</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Reliability</span>
                  <span className="text-green-500">82%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Weight</span>
                  <span>30%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Update</span>
                  <span>3m ago</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}