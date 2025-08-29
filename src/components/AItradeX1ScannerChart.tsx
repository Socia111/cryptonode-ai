import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSignals } from '@/hooks/useSignals';
import { TrendingUp, TrendingDown, Clock, Target, Shield, Zap } from 'lucide-react';

interface Signal {
  id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  entry_price: number;
  confidence_score: number;
  timeframe: string;
  signal_strength: string;
  risk_level: string;
  created_at: string;
  stop_loss?: number;
  exit_target?: number;
}

const AItradeX1ScannerChart: React.FC = () => {
  const { signals } = useSignals();
  const [currentSignalIndex, setCurrentSignalIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isActive, setIsActive] = useState(false);

  // Filter for active AItradeX1 signals
  const activeSignals = signals.filter(signal => 
    signal.status === 'active' && 
    signal.confidence_score >= 70
  );

  // Auto-cycle through signals every 60 seconds
  useEffect(() => {
    if (activeSignals.length === 0) {
      setIsActive(false);
      return;
    }

    setIsActive(true);
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Move to next signal
          setCurrentSignalIndex(prevIndex => 
            (prevIndex + 1) % activeSignals.length
          );
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSignals.length]);

  // Reset when new signals arrive
  useEffect(() => {
    if (activeSignals.length > 0) {
      setCurrentSignalIndex(0);
      setTimeRemaining(60);
    }
  }, [activeSignals.length]);

  if (!isActive || activeSignals.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>AItradeX1 Scanner</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Waiting for signals...</p>
              <p className="text-sm">New trading opportunities will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSignal = activeSignals[currentSignalIndex];
  const progressPercentage = ((60 - timeRemaining) / 60) * 100;

  const formatPrice = (price: number) => {
    return price?.toFixed(4) || '0.0000';
  };

  const getSignalStrengthColor = (strength: string) => {
    switch (strength) {
      case 'STRONG': return 'text-green-500';
      case 'MEDIUM': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>AItradeX1 Scanner</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono">{timeRemaining}s</span>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-1" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Signal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentSignal.direction === 'BUY' ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
            <div>
              <h3 className="text-2xl font-bold">{currentSignal.token}</h3>
              <p className="text-sm text-muted-foreground">{currentSignal.timeframe} timeframe</p>
            </div>
          </div>
          
          <Badge 
            variant={currentSignal.direction === 'BUY' ? 'default' : 'destructive'}
            className="text-lg px-4 py-2"
          >
            {currentSignal.direction}
          </Badge>
        </div>

        {/* Signal Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Entry Price</p>
            <p className="text-lg font-bold">${formatPrice(currentSignal.entry_price)}</p>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="text-lg font-bold text-primary">{currentSignal.confidence_score}%</p>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Strength</p>
            <p className={`text-lg font-bold ${getSignalStrengthColor(currentSignal.signal_strength)}`}>
              {currentSignal.signal_strength}
            </p>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Risk Level</p>
            <p className={`text-lg font-bold ${getRiskLevelColor(currentSignal.risk_level)}`}>
              {currentSignal.risk_level}
            </p>
          </div>
        </div>

        {/* Stop Loss & Target */}
        {(currentSignal.stop_loss || currentSignal.exit_target) && (
          <div className="grid grid-cols-2 gap-4">
            {currentSignal.stop_loss && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <Shield className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Stop Loss</p>
                  <p className="font-medium">${formatPrice(currentSignal.stop_loss)}</p>
                </div>
              </div>
            )}
            
            {currentSignal.exit_target && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <Target className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="font-medium">${formatPrice(currentSignal.exit_target)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signal Counter */}
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <span>Signal {currentSignalIndex + 1} of {activeSignals.length}</span>
          <div className="flex space-x-1">
            {activeSignals.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentSignalIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AItradeX1ScannerChart;