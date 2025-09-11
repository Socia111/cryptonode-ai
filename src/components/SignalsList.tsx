import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Clock, Target, Volume2, RefreshCw, Activity, Zap, AlertTriangle, Coins, Star, Filter } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { TopPicks } from '@/components/TopPicks';
import TradingModal from './TradingModal';
import AutoTradeSettings from './AutoTradeSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TradingGateway } from '@/lib/tradingGateway';
import { FEATURES } from '@/config/featureFlags';

const SignalsList = () => {
  const { signals, loading, generateSignals } = useSignals();
  const { toast } = useToast();
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [showAllSpreads, setShowAllSpreads] = useState(false);
  const [orderSize, setOrderSize] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [useLeverage, setUseLeverage] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  const [bulkExecuteMode, setBulkExecuteMode] = useState(false);
  const [executedSignals, setExecutedSignals] = useState(new Set());
  const [autoExecute, setAutoExecute] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);

  // Use ranked signals with filtering
  const rankedSignals = useRankedSignals(signals, showAllSpreads);
  const topPicks = rankedSignals.slice(0, 3);

  const testBybitConnection = async () => {
    try {
      console.log('🧪 Testing Bybit API connection...');
      const { data, error } = await supabase.functions.invoke('debug-bybit-api');
      
      if (error) {
        console.error('❌ Debug API call failed:', error);
        setDebugInfo({ error: error.message });
        return;
      }
      
      console.log('✅ Debug API response:', data);
      setDebugInfo(data);
      
      toast({
        title: "🔍 API Debug Complete",
        description: `Credentials: ${data.credentials_available?.api_key ? '✅' : '❌'} | Connection: ${data.bybit_connectivity ? '✅' : '❌'}`,
      });
      
    } catch (error: any) {
      console.error('❌ Debug test failed:', error);
      setDebugInfo({ error: error.message });
      toast({
        title: "❌ Debug Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Calculate thresholds based on current signals
  const thresholds = useMemo(() => {
    if (!signals || signals.length === 0) return { top1: 85, top5: 80, top10: 75 };
    
    const sortedROIs = signals
      .map(s => s.confidence_score || 0)
      .sort((a, b) => b - a);
    
    return {
      top1: sortedROIs[0] || 85,
      top5: sortedROIs[Math.min(4, sortedROIs.length - 1)] || 80,
      top10: sortedROIs[Math.min(9, sortedROIs.length - 1)] || 75
    };
  }, [signals]);

  // Filter for priority signals (now using ranked signals)
  const prioritySignals = useMemo(() => {
    if (!rankedSignals) return [];
    return rankedSignals.filter(signal => signal.grade === 'A+' || signal.grade === 'A');
  }, [rankedSignals]);

  // Display signals (priority first by score, then all if requested)
  const displayedSignals = useMemo(() => {
    if (!rankedSignals) return [];
    if (showAllSignals) return rankedSignals;
    return rankedSignals.slice(0, 12); // Show top 12 by score
  }, [rankedSignals, showAllSignals]);

  const executeOrder = async (signal: any) => {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      toast({
        title: "Auto-trading disabled",
        description: "Auto-trading is disabled in this build. Actions are simulated only.",
        variant: "default",
      });
      return;
    }

    const side = signal.direction;
    const res = await TradingGateway.execute({ 
      symbol: signal.token, 
      side, 
      notionalUSD: parseFloat(orderSize)
    });
    
    if (!res.ok && res.code === 'DISABLED') {
      toast({
        title: "Auto-trading disabled", 
        description: res.message,
        variant: "default",
      });
      return;
    }

    // Execute real trade via TradingGateway
    setIsExecutingOrder(true);
    try {
      console.log('🚀 Executing real trade:', {
        token: signal.token,
        direction: signal.direction,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        exit_target: signal.exit_target,
        confidence: signal.confidence_score,
        leverage: useLeverage ? leverage : 1
      });

      if (res.ok) {
        toast({
          title: "✅ Trade Executed Successfully",
          description: `${signal.token} ${signal.direction} - Real order placed on Bybit`,
          variant: "default",
        });
      } else {
        toast({
          title: "❌ Trade Execution Failed", 
          description: res.message || 'Failed to execute trade on Bybit',
          variant: "destructive",
        });
        return;
      }

      // Mark as executed
      setExecutedSignals(prev => new Set(prev).add(signal.id));
    } catch (error: any) {
      console.error('❌ Trade execution error:', error);
      toast({
        title: "Trade Execution Error",
        description: error.message || 'Failed to execute trade',
        variant: "destructive",
      });
    } finally {
      setIsExecutingOrder(false);
    }
  };

  // Auto-execute when order size changes or new signals arrive
  useEffect(() => {
    if (!FEATURES.AUTOTRADE_ENABLED) return;
    
    if (autoExecute && prioritySignals.length > 0 && !isExecutingOrder) {
      // Execute all priority signals that haven't been executed yet
      const newSignals = prioritySignals.filter(signal => !executedSignals.has(signal.id));
      
      if (newSignals.length > 0) {
        console.log(`🤖 Auto-executing ${newSignals.length} new priority signals...`);
        
        // Execute signals one by one with delays
        const executeSequentially = async () => {
          for (const signal of newSignals) {
            if (!executedSignals.has(signal.id)) {
              await executeOrder(signal);
              // Add delay between orders to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        };
        
        executeSequentially();
      }
    }
  }, [prioritySignals, autoExecute, orderSize]);

  const executeAll = async () => {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      toast({
        title: "Auto-trading disabled",
        description: "Auto-trading is disabled in this build.",
        variant: "default",
      });
      return;
    }

    setBulkExecuteMode(true);
    setIsExecutingOrder(true);
    
    try {
      console.log(`🚀 Bulk executing ${displayedSignals.length} signals...`);
      
      for (const signal of displayedSignals) {
        if (!executedSignals.has(signal.id)) {
          await executeOrder(signal);
          // Add delay between orders to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      toast({
        title: "Bulk Execution Complete",
        description: `Executed ${displayedSignals.length} signals`,
      });
      
    } catch (error: any) {
      console.error('❌ Bulk execution error:', error);
      toast({
        title: "Bulk Execution Error",
        description: error.message || 'Failed to execute some orders',
        variant: "destructive",
      });
    } finally {
      setBulkExecuteMode(false);
      setIsExecutingOrder(false);
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
    const score = signal.confidence_score || 0;
    if (score >= thresholds.top1) return '☄️';
    if (score >= thresholds.top5) return '☢️';
    if (score >= thresholds.top10) return '🦾';
    return '';
  };

  const getConfidenceIndicator = (signal: any) => {
    const confidence = signal.confidence_score || 0;
    if (confidence >= 90) return '🔮';
    if (confidence >= 80) return '♥️';
    return '';
  };

  const getTimeframeIndicator = (signal: any) => {
    const timeframe = signal.timeframe?.toLowerCase();
    if (timeframe?.includes('min') || timeframe?.includes('m')) {
      const minutes = parseInt(timeframe.replace(/\\D/g, ''));
      if (minutes >= 5 && minutes <= 30) return '🪤';
    }
    if (timeframe?.includes('hour') || timeframe?.includes('h')) {
      const hours = parseInt(timeframe.replace(/\\D/g, ''));
      if (hours >= 1 && hours <= 4) return '👍';
    }
    return '';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-primary" />
            <span>⭐ Priority Signals (Score-Ranked)</span>
            <Badge variant="outline" className="text-xs">
              {displayedSignals.length} ranked signals
            </Badge>
            {!showAllSpreads && (
              <Badge variant="secondary" className="text-xs">
                <Filter className="w-3 h-3 mr-1" />
                Low spread only
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={generateSignals}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scanning...' : 'Refresh'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Scanning markets for trading opportunities...</p>
          </div>
        ) : (
          <>
            {/* Top Picks Strip */}
            {topPicks.length > 0 && (
              <TopPicks 
                items={topPicks} 
                onExecute={(signal) => setSelectedSignal(signal)}
                isExecuting={isExecutingOrder}
              />
            )}

            {/* Auto-Trade Settings */}
            <AutoTradeSettings />

            {/* Filter Controls */}
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-all-spreads"
                  checked={showAllSpreads}
                  onCheckedChange={setShowAllSpreads}
                />
                <Label htmlFor="show-all-spreads" className="text-xs font-medium">
                  Show high spread signals (&gt;20 bps)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-all-signals"
                  checked={showAllSignals}
                  onCheckedChange={setShowAllSignals}
                />
                <Label htmlFor="show-all-signals" className="text-xs font-medium">
                  Show all signals (not just top ranked)
                </Label>
              </div>
            </div>

            {/* Signals List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {displayedSignals.map((signal) => {
                const isBuy = signal.direction === 'BUY';
                const isExecuted = executedSignals.has(signal.id);
                
                return (
                  <div
                    key={signal.id}
                    className={`p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                      isExecuted ? 'opacity-60 bg-muted/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold">
                            {signal.token}
                          </span>
                          <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                            {signal.direction}
                          </Badge>
                          <Badge 
                            variant={
                              signal.grade === 'A+' ? 'success' :
                              signal.grade === 'A' ? 'default' :
                              signal.grade === 'B' ? 'warning' : 'secondary'
                            }
                            className="text-xs font-bold"
                          >
                            {signal.grade}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {signal.timeframe}
                          </Badge>
                          <span className="text-xs opacity-60 ml-2">
                            score {Math.round(signal.score)}%
                          </span>
                          {signal.spread && signal.spread > 20 && (
                            <Badge variant="warning" className="text-xs">
                              {signal.spread.toFixed(1)} bps
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Entry: ${signal.entry_price?.toFixed(4)}</div>
                          <div>Edge: {signal.edgeScore?.toFixed(1)}%</div>
                          <div>SL: ${signal.stop_loss?.toFixed(4)}</div>
                          <div>TP: ${signal.exit_target?.toFixed(4)}</div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(signal.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {isExecuted && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            ✓ Executed
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant={isBuy ? "default" : "destructive"}
                          className="text-xs"
                          onClick={() => setSelectedSignal(signal)}
                          disabled={isExecutingOrder || isExecuted}
                        >
                          {isExecutingOrder ? 'Executing...' : 'Execute Trade'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border space-y-4">
              {/* Trading Mode Controls */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-execute"
                    checked={autoExecute && FEATURES.AUTOTRADE_ENABLED}
                    onCheckedChange={FEATURES.AUTOTRADE_ENABLED ? setAutoExecute : () => {}}
                    disabled={!FEATURES.AUTOTRADE_ENABLED}
                  />
                  <Label htmlFor="auto-execute" className="text-xs font-medium">
                    🤖 Auto-Execute New Signals {!FEATURES.AUTOTRADE_ENABLED && '(Disabled)'}
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="use-leverage"
                    checked={useLeverage}
                    onCheckedChange={setUseLeverage}
                  />
                  <Label htmlFor="use-leverage" className="text-xs font-medium">
                    💪 Use Leverage
                  </Label>
                </div>
              </div>

              {/* Order Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="order-size" className="text-xs font-medium">Order Size (USD)</Label>
                  <Input
                    id="order-size"
                    type="number"
                    value={orderSize}
                    onChange={(e) => setOrderSize(e.target.value)}
                    placeholder="10"
                    className="text-xs"
                  />
                </div>
                
                {useLeverage && (
                  <div className="space-y-1">
                    <Label htmlFor="leverage" className="text-xs font-medium">Leverage (1-10x)</Label>
                    <Select value={leverage.toString()} onValueChange={(value) => setLeverage(parseInt(value))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10].map(lev => (
                          <SelectItem key={lev} value={lev.toString()}>{lev}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Bulk Actions</Label>
                  <Button
                    onClick={executeAll}
                    variant="outline"
                    size="sm"
                    disabled={isExecutingOrder || displayedSignals.length === 0 || !FEATURES.AUTOTRADE_ENABLED}
                    className="w-full text-xs"
                  >
                    Execute All ({displayedSignals.length})
                  </Button>
                </div>
              </div>

              {/* Status and Warnings */}
              <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {!FEATURES.AUTOTRADE_ENABLED ? (
                  <p className="text-amber-400">
                    Auto-trading is disabled in this build. Actions are simulated only.
                  </p>
                ) : (
                  <>
                    <p className="flex items-center gap-1 text-green-400">
                      <Coins className="w-3 h-3" />
                      ✅ Live trading enabled - executing real orders on Bybit v5 API
                    </p>
                    <p className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Real money trading - use carefully!
                    </p>
                  </>
                )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setShowAllSignals(!showAllSignals)}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    {showAllSignals ? 'Show Priority Only' : 'Show All Signals'}
                  </Button>
                  
                  <Button
                    onClick={testBybitConnection}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    🧪 Test API
                  </Button>
                </div>
              </div>

              {/* Debug Info */}
              {debugInfo && (
                <div className="mt-4 p-3 bg-muted/30 rounded border text-xs">
                  <p className="font-semibold mb-2">🔍 API Debug Results:</p>
                  {debugInfo.error ? (
                    <p className="text-destructive">❌ Error: {debugInfo.error}</p>
                  ) : (
                    <div className="space-y-1">
                      <p>🔑 API Key: {debugInfo.credentials_available?.api_key ? '✅ Present' : '❌ Missing'}</p>
                      <p>🔐 API Secret: {debugInfo.credentials_available?.api_secret ? '✅ Present' : '❌ Missing'}</p>
                      <p>🌐 Bybit Connection: {debugInfo.bybit_connectivity?.retCode === 0 ? '✅ Working' : '❌ Failed'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Trading Modal */}
        <TradingModal
          signal={selectedSignal}
          isOpen={!!selectedSignal}
          onClose={() => setSelectedSignal(null)}
        />
      </CardContent>
    </Card>
  );
};

export default SignalsList;