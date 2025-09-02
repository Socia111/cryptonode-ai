
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Clock, Target, Volume2, RefreshCw, Activity, Zap, AlertTriangle, Coins } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SignalsList = () => {
  const { signals, loading, generateSignals } = useSignals();
  const { toast } = useToast();
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [orderSize, setOrderSize] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [useLeverage, setUseLeverage] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [bulkExecuteMode, setBulkExecuteMode] = useState(false);
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  const [executedSignals, setExecutedSignals] = useState(new Set());

  // Calculate priority signals immediately after hooks
  const prioritySignals = signals.filter(signal => {
    const roiValues = signals.map(s => s.roi_projection).sort((a, b) => b - a);
    const top1PercentThreshold = roiValues[Math.floor(roiValues.length * 0.01)];
    const top5PercentThreshold = roiValues[Math.floor(roiValues.length * 0.05)];
    const top10PercentThreshold = roiValues[Math.floor(roiValues.length * 0.10)];
    
    return signal.roi_projection >= top1PercentThreshold || 
           signal.roi_projection >= top5PercentThreshold || 
           signal.roi_projection >= top10PercentThreshold;
  });

  // Determine which signals to display
  const displayedSignals = showAllSignals ? signals : prioritySignals;

  const handleGenerateSignals = async () => {
    try {
      await generateSignals();
      toast({
        title: "Signals Generated",
        description: "New AI signals have been generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate signals",
        variant: "destructive",
      });
    }
  };

  // Auto-execute when order size changes or new signals arrive
  useEffect(() => {
    if (autoExecute && signals.length > 0 && !isExecutingOrder) {
      const topSignal = signals[0];
      if (!executedSignals.has(topSignal.id)) {
        console.log('🤖 Auto-executing new signal:', topSignal.token);
        executeOrder(topSignal);
        setExecutedSignals(prev => new Set([...prev, topSignal.id]));
      }
    }
  }, [signals, autoExecute, orderSize]);

  // Bulk execute all signals when in bulk mode
  const executeAllSignals = async () => {
    if (bulkExecuteMode && displayedSignals.length > 0) {
      setIsExecutingOrder(true);
      console.log('🚀 Bulk executing all signals:', displayedSignals.length);
      
      for (const signal of displayedSignals) {
        try {
          await executeOrder(signal);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between orders
        } catch (error) {
          console.error('❌ Bulk execution error for:', signal.token, error);
        }
      }
      setIsExecutingOrder(false);
    }
  };

  const executeOrder = async (signal: any) => {
    try {
      setIsExecutingOrder(true);
      
      console.log('🚀 Executing LIVE Bybit v5 order:', {
        token: signal.token,
        direction: signal.direction,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        exit_target: signal.exit_target,
        confidence: signal.confidence_score,
        leverage: useLeverage ? leverage : 1
      });
      
      const { data, error } = await supabase.functions.invoke('bybit-order-execution', {
        body: { 
          signal,
          orderSize,
          leverage: useLeverage ? leverage : 1,
          category: useLeverage ? 'linear' : 'spot', // Use linear for leverage trading
          testMode: false
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: `🎯 LIVE ${signal.direction} Order Executed!`,
          description: `${signal.token} on Bybit - ${useLeverage ? `${leverage}x Leverage` : 'Spot'} | Order ID: ${data.orderId} | Size: $${orderSize}`,
        });
        console.log('✅ Bybit v5 API order result:', data);
      } else {
        throw new Error(data.error || 'Failed to execute live order');
      }

    } catch (error: any) {
      console.error('❌ Bybit v5 API error:', error);
      toast({
        title: "Live Trading Error",
        description: error.message || 'Failed to execute live order on Bybit v5',
        variant: "destructive",
      });
    } finally {
      if (!bulkExecuteMode) {
        setIsExecutingOrder(false);
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getPriorityIndicator = (signal: any) => {
    const roiValues = signals.map(s => s.roi_projection).sort((a, b) => b - a);
    const top1PercentThreshold = roiValues[Math.floor(roiValues.length * 0.01)];
    const top5PercentThreshold = roiValues[Math.floor(roiValues.length * 0.05)];
    const top10PercentThreshold = roiValues[Math.floor(roiValues.length * 0.10)];
    
    if (signal.roi_projection >= top1PercentThreshold) return '☄️';
    if (signal.roi_projection >= top5PercentThreshold) return '☢️';
    if (signal.roi_projection >= top10PercentThreshold) return '🦾';
    return '';
  };

  const getTimeframeIndicator = (signal: any) => {
    const timeframe = signal.timeframe?.toLowerCase();
    if (timeframe?.includes('min') || timeframe?.includes('m')) {
      const minutes = parseInt(timeframe.replace(/\D/g, ''));
      if (minutes >= 5 && minutes <= 30) return '🪤';
    }
    if (timeframe?.includes('hour') || timeframe?.includes('h')) {
      const hours = parseInt(timeframe.replace(/\D/g, ''));
      if (hours >= 1 && hours <= 4) return '👍';
    }
    return '';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-primary" />
            <span>Live Signals</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSignals}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Generate
            </Button>
            <Badge variant="secondary" className="pulse-glow bg-primary/20 text-primary">
              {showAllSignals ? `${signals.length} Total` : `${prioritySignals.length} Priority (☄️☢️🦾)`}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Loading signals...</p>
          </div>
        ) : displayedSignals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {showAllSignals ? 'No signals available' : 'No priority signals (☄️☢️🦾)'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {showAllSignals ? 'Generate new signals' : 'Generate new signals to find high-priority opportunities'}
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleGenerateSignals}
              className="mt-2"
            >
              Generate First Signals
            </Button>
          </div>
        ) : (
          displayedSignals.map((signal) => {
            const isBuy = signal.direction === 'BUY';
            const TrendIcon = isBuy ? TrendingUp : TrendingDown;

            return (
              <div 
                key={signal.id} 
                className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${
                  isBuy 
                    ? 'bg-success/10 border-success/20 hover:glow-success' 
                    : 'bg-destructive/10 border-destructive/20 hover:glow-danger'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isBuy ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                    }`}>
                      <TrendIcon className="w-4 h-4" />
                    </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold trading-mono">{signal.token}</h4>
                          {getPriorityIndicator(signal) && (
                            <span className="text-lg" title={
                              getPriorityIndicator(signal) === '☄️' ? 'Top 1% ROI' :
                              getPriorityIndicator(signal) === '☢️' ? 'Top 5% ROI' : 'Top 10% ROI'
                            }>
                              {getPriorityIndicator(signal)}
                            </span>
                          )}
                          {getTimeframeIndicator(signal) && (
                            <span className="text-lg" title={
                              getTimeframeIndicator(signal) === '🪤' ? '5-30 min signal' : '1-4 hour signal'
                            }>
                              {getTimeframeIndicator(signal)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{signal.signal_type}</p>
                      </div>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${isBuy ? 'border-success text-success' : 'border-destructive text-destructive'}`}
                  >
                    {signal.direction}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Entry Price</p>
                    <p className="font-semibold trading-mono">${signal.entry_price.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Confidence</p>
                    <p className="font-semibold trading-mono">{signal.confidence_score.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timeframe</p>
                    <p className="font-semibold trading-mono">{signal.timeframe}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ROI Target</p>
                    <p className="font-semibold trading-mono text-success">{signal.roi_projection}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Stop Loss</p>
                    <p className="font-semibold trading-mono text-destructive">${signal.stop_loss?.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-semibold trading-mono text-success">${signal.exit_target?.toFixed(4)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(signal.created_at)}</span>
                    <span className="text-primary">{signal.trend_projection}</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant={isBuy ? "default" : "destructive"}
                    className="text-xs"
                    onClick={() => executeOrder(signal)}
                    disabled={isExecutingOrder}
                  >
                    {isExecutingOrder ? 'Executing...' : 'Execute Trade'}
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {/* Advanced Trading Controls */}
        {signals.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border space-y-4">
            {/* Trading Mode Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-execute"
                  checked={autoExecute}
                  onCheckedChange={setAutoExecute}
                />
                <Label htmlFor="auto-execute" className="text-xs font-medium">
                  🤖 Auto-Execute New Signals
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="bulk-mode"
                  checked={bulkExecuteMode}
                  onCheckedChange={setBulkExecuteMode}
                />
                <Label htmlFor="bulk-mode" className="text-xs font-medium">
                  🚀 Bulk Execute All Signals
                </Label>
              </div>
            </div>

            {/* Order Configuration */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <Label htmlFor="orderSize" className="text-xs font-medium">
                  Order Size (USDT)
                </Label>
                <Input
                  id="orderSize"
                  type="number"
                  value={orderSize}
                  onChange={(e) => setOrderSize(e.target.value)}
                  className="w-24 h-8 text-xs"
                  min="1"
                  step="1"
                />
              </div>

              {/* Leverage Controls */}
              <div className="flex items-center gap-2">
                <Switch
                  id="use-leverage"
                  checked={useLeverage}
                  onCheckedChange={setUseLeverage}
                />
                <Label htmlFor="use-leverage" className="text-xs font-medium">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Use Leverage
                </Label>
              </div>

              {useLeverage && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="leverage" className="text-xs font-medium">
                    Leverage
                  </Label>
                  <Select value={leverage.toString()} onValueChange={(value) => setLeverage(parseInt(value))}>
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 10, 20, 25, 50, 100].map(lev => (
                        <SelectItem key={lev} value={lev.toString()}>
                          {lev}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Status and Warnings */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <p className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Execute trades directly on Bybit v5 API
                </p>
                <p className="text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Real money trading - use carefully!
                </p>
                {useLeverage && (
                  <p className="text-destructive flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {leverage}x Leverage - High Risk!
                  </p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {bulkExecuteMode && (
                  <Button
                    onClick={executeAllSignals}
                    disabled={isExecutingOrder || displayedSignals.length === 0}
                    className="gap-2"
                    variant="destructive"
                    size="sm"
                  >
                    <Zap className="w-4 h-4" />
                    Execute All ({displayedSignals.length})
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    if (signals.length > 0) {
                      executeOrder(signals[0]);
                    }
                  }}
                  disabled={isExecutingOrder || signals.length === 0}
                  className="gap-2"
                  variant="outline"
                  size="sm"
                >
                  <Activity className="w-4 h-4" />
                  {isExecutingOrder ? 'Executing...' : 'Execute Top Signal'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={() => setShowAllSignals(!showAllSignals)}
        >
          {showAllSignals ? 'Show Priority Only (☄️☢️🦾)' : 'View All Signals'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SignalsList;
