import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle } from 'lucide-react';

interface Signal {
  id: string;
  symbol: string;
  direction: 'Buy' | 'Sell';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence_score: number;
  timeframe: string;
  status: string;
  generated_at: string;
  signal_strength: string;
  risk_level: string;
}

export function SignalsDashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchSignals = async () => {
    try {
      const response = await fetch(
        'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/signals-api',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'}`
          },
          body: JSON.stringify({ path: '/signals/live' })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSignals(data.signals || []);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch signals',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewSignals = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'}`
          },
          body: JSON.stringify({
            exchange: 'bybit',
            timeframe: '15m',
            relaxed_filters: true,
            symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT']
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: `Generated ${data.signals_found || 0} new signals`
        });
        fetchSignals(); // Refresh signals list
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to generate signals:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate new signals',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchSignals();

    if (autoRefresh) {
      const interval = setInterval(fetchSignals, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getSignalGrade = (confidence: number): string => {
    if (confidence >= 90) return 'A+';
    if (confidence >= 80) return 'A';
    if (confidence >= 70) return 'B';
    if (confidence >= 60) return 'C';
    return 'D';
  };

  const getSignalColor = (direction: string) => {
    return direction === 'Buy' ? 'text-green-600' : 'text-red-600';
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Live Trading Signals
            </CardTitle>
            <CardDescription>
              Real-time cryptocurrency trading signals with AI analysis
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={generateNewSignals}
              disabled={loading}
              size="sm"
            >
              Generate Signals
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button onClick={fetchSignals} disabled={loading} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <p className="text-muted-foreground">No signals found. Click "Generate Signals" to scan the market.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {signals.map((signal) => (
              <Card key={signal.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{signal.symbol}</h3>
                      <div className={`flex items-center gap-1 ${getSignalColor(signal.direction)}`}>
                        {signal.direction === 'Buy' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span className="font-medium">{signal.direction}</span>
                      </div>
                      <Badge variant="outline">
                        Grade {getSignalGrade(signal.confidence_score)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{signal.timeframe}</Badge>
                      <Badge className={getRiskColor(signal.risk_level)}>
                        {signal.risk_level} Risk
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry Price</p>
                      <p className="font-medium">${signal.entry_price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-medium text-red-600">${signal.stop_loss}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-medium text-green-600">${signal.take_profit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="font-medium">{signal.confidence_score}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(signal.generated_at).toLocaleString()}
                    </div>
                    <Badge 
                      variant={signal.status === 'active' ? 'default' : 'secondary'}
                    >
                      {signal.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}