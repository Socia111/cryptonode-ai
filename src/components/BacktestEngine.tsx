import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { TrendingUp, PlayCircle, BarChart3, Target, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { toNum, clampPercent, safePercent } from '@/lib/num';

interface BacktestParams {
  symbol: string
  timeframe: string
  start_date: string
  end_date: string
  initial_capital: number
  strategy_config: {
    indicators: string[]
    leverage: number
    stop_loss_percent: number
    take_profit_percent: number
    confidence_threshold: number
  }
}

interface BacktestResult {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_return: number
  max_drawdown: number
  sharpe_ratio: number
  profit_factor: number
  avg_trade_duration: number
  trades: any[]
}

const BacktestEngine = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [params, setParams] = useState<BacktestParams>({
    symbol: 'BTC/USDT',
    timeframe: '1h',
    start_date: '2024-01-01',
    end_date: '2024-08-01',
    initial_capital: 10000,
    strategy_config: {
      indicators: ['EMA', 'RSI', 'Volume'],
      leverage: 10,
      stop_loss_percent: 7,
      take_profit_percent: 15,
      confidence_threshold: 80
    }
  });
  const { toast } = useToast();

  const runBacktest = async () => {
    setIsRunning(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('backtest-engine', {
        body: params
      });

      if (error) {
        console.error('[Backtest] Error:', error);
        throw new Error(error.message || 'Backtest failed');
      }

      if (!data?.results) {
        throw new Error('No backtest results returned');
      }

      setResults(data.results);
      
      toast({
        title: "Backtest Complete",
        description: `Analyzed ${data.results?.total_trades || 0} trades with ${((data.results?.win_rate || 0) * 100).toFixed(1)}% win rate`,
      });
    } catch (error: any) {
      console.error('[Backtest] Failed:', error);
      const msg = error?.message ?? 'Unexpected error';
      toast({
        title: "Backtest Failed",
        description: msg.includes('RLS') ? 'Permission denied (RLS). Check policies.' : msg,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const updateParam = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setParams(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setParams(prev => ({ ...prev, [key]: value }));
    }
  };

  const performanceData = results?.trades?.map((trade, index) => ({
    trade: index + 1,
    pnl: toNum(trade?.pnl),
    cumulative: results.trades.slice(0, index + 1).reduce((sum, t) => sum + toNum(t?.pnl), 0)
  })) || [];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span>Backtest Engine</span>
          </div>
          {results && (
            <Badge variant={results.win_rate > 0.6 ? "secondary" : "destructive"}>
              {(results.win_rate * 100).toFixed(1)}% Win Rate
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Backtest Parameters */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Symbol</label>
              <Select value={params.symbol} onValueChange={(value) => updateParam('symbol', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground">Timeframe</label>
              <Select value={params.timeframe} onValueChange={(value) => updateParam('timeframe', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="text-xs text-muted-foreground">Start Date</label>
              <Input
                id="start_date"
                type="date"
                value={params.start_date}
                onChange={(e) => updateParam('start_date', e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="end_date" className="text-xs text-muted-foreground">End Date</label>
              <Input
                id="end_date"
                type="date"
                value={params.end_date}
                onChange={(e) => updateParam('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="initial_capital" className="text-xs text-muted-foreground">Initial Capital</label>
              <Input
                id="initial_capital"
                type="number"
                value={params.initial_capital}
                onChange={(e) => updateParam('initial_capital', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <label htmlFor="leverage" className="text-xs text-muted-foreground">Leverage</label>
              <Input
                id="leverage"
                type="number"
                value={params.strategy_config.leverage}
                onChange={(e) => updateParam('strategy_config.leverage', parseInt(e.target.value))}
                min="1"
                max="125"
              />
            </div>
            
            <div>
              <label htmlFor="stop_loss_percent" className="text-xs text-muted-foreground">Stop Loss %</label>
              <Input
                id="stop_loss_percent"
                type="number"
                value={params.strategy_config.stop_loss_percent}
                onChange={(e) => updateParam('strategy_config.stop_loss_percent', parseFloat(e.target.value))}
                step="0.5"
              />
            </div>
          </div>

          <Button 
            onClick={runBacktest}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>Running Backtest...</>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-success/10 rounded-lg border border-success/20">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-lg font-bold text-success">{safePercent(results.total_return * 100)}</p>
                <p className="text-xs text-muted-foreground">Total Return</p>
              </div>
              
              <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold text-primary">{safePercent(results.win_rate * 100)}</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              
              <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-warning" />
                <p className="text-lg font-bold text-warning">{toNum(results.sharpe_ratio).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
              </div>
              
              <div className="text-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <Clock className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-lg font-bold text-destructive">{safePercent(results.max_drawdown * 100)}</p>
                <p className="text-xs text-muted-foreground">Max Drawdown</p>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="h-64">
              <h4 className="font-medium mb-2">Cumulative P&L</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <XAxis 
                    dataKey="trade" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trade Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{results.total_trades}</p>
                <p className="text-sm text-muted-foreground">Total Trades</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{results.winning_trades}</p>
                <p className="text-sm text-muted-foreground">Winners</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{results.losing_trades}</p>
                <p className="text-sm text-muted-foreground">Losers</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BacktestEngine;