import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target, 
  Zap, 
  AlertTriangle, 
  DollarSign,
  Clock,
  Activity,
  Settings,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSignals } from '@/hooks/useSignals';

interface StrategySettings {
  timeframe: '5m' | '15m' | '1h' | '4h';
  leverage: number;
  riskPerTrade: number;
  maxOpenTrades: number;
  minConfidence: number;
  dailyRiskLimit: number;
  autoExecute: boolean;
  perpProtect: boolean;
  compounding: boolean;
}

interface TradeMetrics {
  dailyROI: number;
  winRate: number;
  avgRiskReward: number;
  totalTrades: number;
  openPositions: number;
  currentStreak: number;
}

const AItradeX1StrategyPanel = () => {
  const { signals } = useSignals();
  const { toast } = useToast();
  
  const [strategy, setStrategy] = useState<StrategySettings>({
    timeframe: '15m',
    leverage: 5,
    riskPerTrade: 2,
    maxOpenTrades: 3,
    minConfidence: 80,
    dailyRiskLimit: 5,
    autoExecute: false,
    perpProtect: false,
    compounding: true
  });

  const [metrics, setMetrics] = useState<TradeMetrics>({
    dailyROI: 12.4,
    winRate: 76.8,
    avgRiskReward: 2.3,
    totalTrades: 28,
    openPositions: 3,
    currentStreak: 7
  });

  const [accountBalance] = useState(10000);
  const [isActive, setIsActive] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);

  // Define helper functions before using them in filter operations
  const calculateRiskReward = (signal: any) => {
    if (!signal.stop_loss || !signal.exit_target) return 0;
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    const reward = Math.abs(signal.exit_target - signal.entry_price);
    return reward / risk;
  };

  // Filter signals based on strategy settings
  const filteredSignals = signals.filter(signal => {
    return (
      signal.confidence_score >= strategy.minConfidence &&
      signal.timeframe === strategy.timeframe &&
      calculateRiskReward(signal) >= 2.0 // Minimum 2:1 R:R
    );
  });

  const calculatePositionSize = (signal: any) => {
    const riskAmount = (accountBalance * strategy.riskPerTrade) / 100;
    const stopDistance = Math.abs(signal.entry_price - signal.stop_loss);
    const baseSize = riskAmount / stopDistance;
    return baseSize * strategy.leverage;
  };

  const getOptimalLeverage = (timeframe: string, liquidity: 'high' | 'medium' | 'low') => {
    if (timeframe === '5m') return liquidity === 'high' ? 10 : 5;
    if (timeframe === '15m') return liquidity === 'high' ? 8 : 5;
    if (timeframe === '1h') return liquidity === 'high' ? 5 : 3;
    return 3;
  };

  const executeStrategy = async (signal: any) => {
    if (emergencyStop) {
      toast({
        title: "Emergency Stop Active",
        description: "All trading suspended",
        variant: "destructive"
      });
      return;
    }

    if (metrics.openPositions >= strategy.maxOpenTrades) {
      toast({
        title: "Max Positions Reached",
        description: `Already at ${strategy.maxOpenTrades} open trades`,
        variant: "destructive"
      });
      return;
    }

    const positionSize = calculatePositionSize(signal);
    const riskReward = calculateRiskReward(signal);
    
    toast({
      title: `🚀 AItradeX1 Strategy Executing`,
      description: `${signal.token} ${signal.direction} | ${strategy.leverage}x | R:R ${riskReward.toFixed(1)} | Size: $${positionSize.toFixed(0)}`,
    });
  };

  const toggleStrategy = () => {
    setIsActive(!isActive);
    toast({
      title: isActive ? "Strategy Stopped" : "AItradeX1 Strategy Active",
      description: isActive 
        ? "Manual mode resumed" 
        : `Auto-executing ${strategy.timeframe} signals with ${strategy.leverage}x leverage`,
    });
  };

  const activateEmergencyStop = () => {
    setEmergencyStop(true);
    setIsActive(false);
    toast({
      title: "🚨 Emergency Stop Activated",
      description: "All trading suspended. Close positions manually.",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      {/* Strategy Status Header */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>AItradeX1 Strategy Engine</span>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "ACTIVE" : "STANDBY"}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={toggleStrategy}
                variant={isActive ? "destructive" : "default"}
                size="sm"
              >
                {isActive ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isActive ? "Stop" : "Start"}
              </Button>
              <Button
                onClick={activateEmergencyStop}
                variant="destructive"
                size="sm"
                disabled={emergencyStop}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Emergency
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{metrics.dailyROI}%</p>
              <p className="text-xs text-muted-foreground">Daily ROI</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{metrics.winRate}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{metrics.avgRiskReward}</p>
              <p className="text-xs text-muted-foreground">Avg R:R</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{metrics.openPositions}</p>
              <p className="text-xs text-muted-foreground">Open Trades</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Configuration */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Strategy Settings</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Timeframe Selection */}
            <div>
              <Label>Timeframe Strategy</Label>
              <Select 
                value={strategy.timeframe} 
                onValueChange={(value: any) => setStrategy(prev => ({...prev, timeframe: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5min - Scalping (High Risk)</SelectItem>
                  <SelectItem value="15m">15min - Balanced (Recommended)</SelectItem>
                  <SelectItem value="1h">1hour - Swing (Lower Risk)</SelectItem>
                  <SelectItem value="4h">4hour - Position (Lowest Risk)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {strategy.timeframe === '5m' && "⚡ Fast scalps, 5-10x leverage, 0.5-2% moves"}
                {strategy.timeframe === '15m' && "🎯 Optimal balance, 5-8x leverage, 1-3% moves"}
                {strategy.timeframe === '1h' && "📈 Swing trades, 3-5x leverage, 3-8% moves"}
                {strategy.timeframe === '4h' && "🏔️ Position trades, 2-3x leverage, 5-15% moves"}
              </p>
            </div>

            {/* Leverage Control */}
            <div>
              <Label>Leverage: {strategy.leverage}x</Label>
              <Slider
                value={[strategy.leverage]}
                onValueChange={(value) => setStrategy(prev => ({...prev, leverage: value[0]}))}
                min={1}
                max={strategy.timeframe === '5m' ? 10 : strategy.timeframe === '15m' ? 8 : 5}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Safe (1x)</span>
                <span>Aggressive ({strategy.timeframe === '5m' ? '10x' : strategy.timeframe === '15m' ? '8x' : '5x'})</span>
              </div>
            </div>

            {/* Risk Management */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Risk Per Trade (%)</Label>
                <Input
                  type="number"
                  value={strategy.riskPerTrade}
                  onChange={(e) => setStrategy(prev => ({...prev, riskPerTrade: parseFloat(e.target.value)}))}
                  min="0.5"
                  max="5"
                  step="0.5"
                />
              </div>
              <div>
                <Label>Max Open Trades</Label>
                <Input
                  type="number"
                  value={strategy.maxOpenTrades}
                  onChange={(e) => setStrategy(prev => ({...prev, maxOpenTrades: parseInt(e.target.value)}))}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            {/* Confidence Filter */}
            <div>
              <Label>Min Confidence: {strategy.minConfidence}%</Label>
              <Slider
                value={[strategy.minConfidence]}
                onValueChange={(value) => setStrategy(prev => ({...prev, minConfidence: value[0]}))}
                min={70}
                max={95}
                step={5}
                className="mt-2"
              />
            </div>

            {/* Advanced Options */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Auto Execute High-Confidence</Label>
                <Switch
                  checked={strategy.autoExecute}
                  onCheckedChange={(checked) => setStrategy(prev => ({...prev, autoExecute: checked}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Perp Protect (ETH/BTC)</Label>
                <Switch
                  checked={strategy.perpProtect}
                  onCheckedChange={(checked) => setStrategy(prev => ({...prev, perpProtect: checked}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Compound Profits</Label>
                <Switch
                  checked={strategy.compounding}
                  onCheckedChange={(checked) => setStrategy(prev => ({...prev, compounding: checked}))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Signals Queue */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Strategy Signals</span>
              </div>
              <Badge variant="secondary">
                {filteredSignals.length} qualified
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {filteredSignals.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No signals meet criteria
                </p>
                <p className="text-xs text-muted-foreground">
                  Waiting for {strategy.minConfidence}%+ confidence on {strategy.timeframe}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSignals.slice(0, 5).map((signal) => {
                  const riskReward = calculateRiskReward(signal);
                  const positionSize = calculatePositionSize(signal);
                  const isBuy = signal.direction === 'BUY';
                  
                  return (
                    <div 
                      key={signal.id} 
                      className={`p-3 rounded-lg border ${
                        isBuy ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                            {isBuy ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {signal.token}
                          </Badge>
                          <span className="text-xs font-mono">{signal.confidence_score.toFixed(1)}%</span>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-medium">R:R {riskReward.toFixed(1)}</p>
                          <p className="text-muted-foreground">${positionSize.toFixed(0)}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Entry</p>
                          <p className="font-mono">${signal.entry_price.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">SL</p>
                          <p className="font-mono text-destructive">${signal.stop_loss?.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">TP</p>
                          <p className="font-mono text-success">${signal.exit_target?.toFixed(4)}</p>
                        </div>
                      </div>
                      
                      {isActive && strategy.autoExecute && (
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => executeStrategy(signal)}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Execute {strategy.leverage}x
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Dashboard */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Risk Dashboard</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Daily Risk Used</span>
                <span className="text-sm">{((metrics.openPositions * strategy.riskPerTrade) / strategy.dailyRiskLimit * 100).toFixed(1)}%</span>
              </div>
              <Progress 
                value={(metrics.openPositions * strategy.riskPerTrade) / strategy.dailyRiskLimit * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {strategy.dailyRiskLimit - (metrics.openPositions * strategy.riskPerTrade)}% remaining
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Position Capacity</span>
                <span className="text-sm">{((metrics.openPositions / strategy.maxOpenTrades) * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={(metrics.openPositions / strategy.maxOpenTrades) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {strategy.maxOpenTrades - metrics.openPositions} slots available
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Win Streak</span>
                <span className="text-sm">{metrics.currentStreak} trades</span>
              </div>
              <Progress 
                value={Math.min((metrics.currentStreak / 10) * 100, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Target: 10+ for tier bonus
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-warning">AItradeX1 Strategy Active</p>
                <p className="text-muted-foreground">
                  • {strategy.leverage}x leverage on {strategy.timeframe} signals
                  • Risk: {strategy.riskPerTrade}% per trade, max {strategy.maxOpenTrades} positions
                  • Auto-execute: {strategy.autoExecute ? 'ON' : 'OFF'} for {strategy.minConfidence}%+ confidence
                  • Emergency stop available at any time
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AItradeX1StrategyPanel;