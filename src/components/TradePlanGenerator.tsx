import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Target, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Zap,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';

interface TradePlan {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  timeframe: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  positionSize: number;
  riskAmount: number;
  expectedROI: number;
  confidence: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  sessionTime: string;
}

const TradePlanGenerator = () => {
  const { signals } = useSignals();
  const [tradePlans, setTradePlans] = useState<TradePlan[]>([]);
  const [sessionTarget, setSessionTarget] = useState(15); // 15% daily target
  const [accountBalance] = useState(10000);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    generateTomorrowTradePlan();
  }, [signals]);

  const generateTomorrowTradePlan = () => {
    // Filter high-quality signals for tomorrow's session
    const qualifiedSignals = signals
      .filter(signal => 
        signal.confidence_score >= 80 && 
        calculateRiskReward(signal) >= 2.0
      )
      .sort((a, b) => {
        // Sort by confidence and ROI potential
        const scoreA = a.confidence_score + (a.roi_projection || 0);
        const scoreB = b.confidence_score + (b.roi_projection || 0);
        return scoreB - scoreA;
      })
      .slice(0, 8); // Max 8 trades per session

    const plans: TradePlan[] = qualifiedSignals.map((signal, index) => {
      const leverage = getLeverageForSignal(signal);
      const riskAmount = (accountBalance * 2) / 100; // 2% risk per trade
      const positionSize = calculatePositionSize(signal, riskAmount, leverage);
      const expectedROI = calculateExpectedROI(signal, leverage);
      
      return {
        id: `plan-${index + 1}`,
        symbol: signal.token,
        direction: signal.direction === 'BUY' ? 'LONG' : 'SHORT',
        timeframe: signal.timeframe,
        entry: signal.entry_price,
        stopLoss: signal.stop_loss || 0,
        takeProfit: signal.exit_target || 0,
        leverage,
        positionSize,
        riskAmount,
        expectedROI,
        confidence: signal.confidence_score,
        priority: index < 3 ? 'HIGH' : index < 6 ? 'MEDIUM' : 'LOW',
        sessionTime: getOptimalExecutionTime(signal.timeframe, index)
      };
    });

    setTradePlans(plans);
  };

  const calculateRiskReward = (signal: any) => {
    if (!signal.stop_loss || !signal.exit_target) return 0;
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    const reward = Math.abs(signal.exit_target - signal.entry_price);
    return reward / risk;
  };

  const getLeverageForSignal = (signal: any) => {
    const timeframe = signal.timeframe?.toLowerCase();
    const isHighLiquidity = ['btc', 'eth', 'sol', 'matic'].some(coin => 
      signal.token.toLowerCase().includes(coin)
    );

    if (timeframe?.includes('5m')) return isHighLiquidity ? 10 : 5;
    if (timeframe?.includes('15m')) return isHighLiquidity ? 8 : 5;
    if (timeframe?.includes('1h')) return isHighLiquidity ? 5 : 3;
    return 3;
  };

  const calculatePositionSize = (signal: any, riskAmount: number, leverage: number) => {
    const stopDistance = Math.abs(signal.entry_price - (signal.stop_loss || 0));
    if (stopDistance === 0) return 0;
    return (riskAmount / stopDistance) * leverage;
  };

  const calculateExpectedROI = (signal: any, leverage: number) => {
    const priceMove = Math.abs((signal.exit_target || 0) - signal.entry_price);
    const percentMove = (priceMove / signal.entry_price) * 100;
    return percentMove * leverage;
  };

  const getOptimalExecutionTime = (timeframe: string, index: number) => {
    const baseTime = 9; // 9 AM start
    const interval = timeframe.includes('5m') ? 0.5 : timeframe.includes('15m') ? 1 : 2;
    const executionTime = baseTime + (index * interval);
    
    const hour = Math.floor(executionTime);
    const minute = Math.floor((executionTime % 1) * 60);
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'LOW': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const totalExpectedROI = tradePlans.reduce((sum, plan) => sum + plan.expectedROI, 0);
  const totalRisk = tradePlans.reduce((sum, plan) => sum + (plan.riskAmount / accountBalance * 100), 0);

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Tomorrow's Trading Session Plan</span>
            </div>
            <Badge variant="secondary">
              {tradePlans.length} Trades Planned
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{totalExpectedROI.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Expected ROI</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{totalRisk.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Total Risk</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{sessionTarget}%</p>
              <p className="text-xs text-muted-foreground">Daily Target</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{tradePlans.filter(p => p.priority === 'HIGH').length}</p>
              <p className="text-xs text-muted-foreground">Priority Trades</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Session Progress</span>
              <span className="text-sm">{((totalExpectedROI / sessionTarget) * 100).toFixed(0)}% of target</span>
            </div>
            <Progress 
              value={Math.min((totalExpectedROI / sessionTarget) * 100, 100)} 
              className="h-3"
            />
            <p className="text-xs text-muted-foreground">
              {totalExpectedROI >= sessionTarget 
                ? "🎯 Target achievable with current plan" 
                : `Need ${(sessionTarget - totalExpectedROI).toFixed(1)}% more ROI to hit target`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trade Plan List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Detailed Trade Plans</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {tradePlans.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No qualified signals for tomorrow's session
              </p>
              <p className="text-xs text-muted-foreground">
                Generate new signals or lower confidence threshold
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={generateTomorrowTradePlan}
                className="mt-2"
              >
                Refresh Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tradePlans.map((plan, index) => (
                <div 
                  key={plan.id}
                  className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                    plan.direction === 'LONG' 
                      ? 'bg-success/10 border-success/20' 
                      : 'bg-destructive/10 border-destructive/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg font-bold">#{index + 1}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{plan.symbol}</h4>
                          <Badge 
                            variant={plan.direction === 'LONG' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {plan.direction === 'LONG' ? <TrendingUp className="w-3 h-3 mr-1" /> : ''}
                            {plan.direction}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(plan.priority)}`}
                          >
                            {plan.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {plan.sessionTime}
                          </span>
                          <span>{plan.timeframe}</span>
                          <span>{plan.confidence.toFixed(1)}% confidence</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">+{plan.expectedROI.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">{plan.leverage}x leverage</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-mono">${plan.entry.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-mono text-destructive">${plan.stopLoss.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-mono text-success">${plan.takeProfit.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Position Size</p>
                      <p className="font-mono">${plan.positionSize.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risk</p>
                      <p className="font-mono">${plan.riskAmount.toFixed(0)}</p>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-muted/20 rounded text-xs">
                    <p className="font-medium mb-1">Execution Plan:</p>
                    <p className="text-muted-foreground">
                      • Execute at {plan.sessionTime} with {plan.leverage}x leverage
                      • Risk {((plan.riskAmount / accountBalance) * 100).toFixed(1)}% of account
                      • Target R:R ratio: {(plan.expectedROI / ((plan.riskAmount / accountBalance) * 100 * plan.leverage)).toFixed(1)}:1
                      • If target hit: close 80%, trail stop on 20%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Summary */}
      <Card className="glass-card border-warning/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-warning" />
            <span>AItradeX1 Strategy Summary</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Winning Formula:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Focus on 15m timeframe for balance</li>
                <li>• Use 5-10x leverage based on liquidity</li>
                <li>• Strict 2% risk per trade, max 3 positions</li>
                <li>• Only trade 80%+ confidence signals</li>
                <li>• Minimum 2:1 risk-reward ratio</li>
                <li>• Daily target: 10-20% ROI</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Risk Controls:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Emergency stop available</li>
                <li>• Daily 5% loss limit</li>
                <li>• 3-trade losing streak = stop</li>
                <li>• Perp protect for ETH/BTC longs</li>
                <li>• Compound profits for growth</li>
                <li>• Trail stops on winners</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-primary">
                Ready to execute {tradePlans.length} trades with {totalExpectedROI.toFixed(1)}% expected ROI
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradePlanGenerator;