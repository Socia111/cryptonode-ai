import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2, 
  Activity, 
  BarChart3, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Shield
} from 'lucide-react';
import { EnhancedSignal, assessSignalQuality } from '@/lib/enhancedSignalAnalyzer';
import { useToast } from '@/hooks/use-toast';

interface EnhancedSignalDashboardProps {
  signals: EnhancedSignal[];
  onExecuteTrade?: (signal: EnhancedSignal) => void;
  isLoading?: boolean;
}

export function EnhancedSignalDashboard({ 
  signals, 
  onExecuteTrade, 
  isLoading = false 
}: EnhancedSignalDashboardProps) {
  const [selectedSignal, setSelectedSignal] = useState<EnhancedSignal | null>(null);
  const [filter, setFilter] = useState<'all' | 'A+' | 'A' | 'B' | 'C'>('all');
  const { toast } = useToast();

  const filteredSignals = signals.filter(signal => 
    filter === 'all' || signal.grade === filter
  );

  const gradeStats = {
    'A+': signals.filter(s => s.grade === 'A+').length,
    'A': signals.filter(s => s.grade === 'A').length,
    'B': signals.filter(s => s.grade === 'B').length,
    'C': signals.filter(s => s.grade === 'C').length,
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-500';
      case 'A': return 'bg-blue-500';
      case 'B': return 'bg-yellow-500';
      case 'C': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 85) return 'text-blue-600';
    if (confidence >= 80) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleExecuteTrade = (signal: EnhancedSignal) => {
    if (onExecuteTrade) {
      onExecuteTrade(signal);
      toast({
        title: "Trade Executed",
        description: `${signal.direction} ${signal.symbol} at ${formatPrice(signal.entryPrice)}`,
      });
    }
  };

  const renderSignalCard = (signal: EnhancedSignal) => {
    const quality = assessSignalQuality(signal);
    const isExpired = new Date() > new Date(signal.expiresAt);

    return (
      <Card 
        key={signal.id} 
        className={`cursor-pointer transition-all hover:shadow-lg ${
          selectedSignal?.id === signal.id ? 'ring-2 ring-primary' : ''
        } ${isExpired ? 'opacity-60' : ''}`}
        onClick={() => setSelectedSignal(signal)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {signal.direction === 'LONG' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <CardTitle className="text-lg">{signal.symbol}</CardTitle>
              <Badge 
                variant="outline" 
                className={`${getGradeColor(signal.grade)} text-white border-0`}
              >
                {signal.grade}
              </Badge>
            </div>
            <div className="text-right">
              <div className={`font-bold ${getConfidenceColor(signal.confidence)}`}>
                {signal.confidence}%
              </div>
              <div className="text-sm text-muted-foreground">
                {signal.timeframe}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Price Information */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Entry</div>
              <div className="font-medium">{formatPrice(signal.entryPrice)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Target</div>
              <div className="font-medium text-green-600">{formatPrice(signal.takeProfit)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Stop</div>
              <div className="font-medium text-red-600">{formatPrice(signal.stopLoss)}</div>
            </div>
          </div>

          {/* Risk/Reward */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm">
              <Target className="h-4 w-4" />
              <span>R:R {signal.riskRewardRatio.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Activity className="h-4 w-4" />
              <span>Quality {quality.qualityScore}</span>
            </div>
          </div>

          {/* Key Confirmations */}
          <div className="flex flex-wrap gap-2">
            {signal.primaryConditions.trendCrossover && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                Trend Cross
              </Badge>
            )}
            {signal.primaryConditions.volumeSurge && (
              <Badge variant="outline" className="text-xs">
                <Volume2 className="h-3 w-3 mr-1 text-blue-500" />
                Volume Spike
              </Badge>
            )}
            {signal.optionalConfirmations.stochasticConfirm && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1 text-purple-500" />
                Momentum
              </Badge>
            )}
          </div>

          {/* Expiry Warning */}
          {isExpired && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Signal expired at {new Date(signal.expiresAt).toLocaleTimeString()}
              </AlertDescription>
            </Alert>
          )}

          {/* Execute Button */}
          {!isExpired && onExecuteTrade && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleExecuteTrade(signal);
              }}
              disabled={isLoading}
            >
              Execute {signal.direction} Trade
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSignalDetails = (signal: EnhancedSignal) => {
    const quality = assessSignalQuality(signal);
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {signal.direction === 'LONG' ? (
              <TrendingUp className="h-6 w-6 text-green-500" />
            ) : (
              <TrendingDown className="h-6 w-6 text-red-500" />
            )}
            <div>
              <h3 className="text-xl font-bold">{signal.symbol}</h3>
              <p className="text-muted-foreground">{signal.direction} Signal • {signal.timeframe}</p>
            </div>
          </div>
          <Badge className={`${getGradeColor(signal.grade)} text-white text-lg px-3 py-1`}>
            {signal.grade}
          </Badge>
        </div>

        {/* Confidence Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Confidence Analysis ({signal.confidence}%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Base Confidence</span>
                <span>{signal.confidenceBreakdown.baseConfidence}%</span>
              </div>
              <Progress value={signal.confidenceBreakdown.baseConfidence} className="h-2" />
            </div>
            
            {signal.confidenceBreakdown.volumeBonus > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Volume Bonus</span>
                  <span>+{signal.confidenceBreakdown.volumeBonus}%</span>
                </div>
                <Progress value={signal.confidenceBreakdown.volumeBonus} max={15} className="h-2" />
              </div>
            )}
            
            {signal.confidenceBreakdown.volatilityBonus > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Volatility Bonus</span>
                  <span>+{signal.confidenceBreakdown.volatilityBonus}%</span>
                </div>
                <Progress value={signal.confidenceBreakdown.volatilityBonus} max={10} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Conditions */}
            <div>
              <h4 className="font-semibold mb-2">Primary Conditions (Mandatory)</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {signal.primaryConditions.trendCrossover ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    EMA21/SMA200 Crossover {signal.direction === 'LONG' ? '(Golden Cross)' : '(Death Cross)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {signal.primaryConditions.volumeSurge ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    Volume Surge ({(signal.indicators.volumeRatio * 100).toFixed(0)}% of average)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {signal.primaryConditions.highVolatility ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    High Volatility Regime (HVP: {signal.indicators.hvp.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Confirmations */}
            <div>
              <h4 className="font-semibold mb-2">Optional Confirmations</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {signal.optionalConfirmations.stochasticConfirm ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="text-sm">Stochastic Momentum Alignment</span>
                </div>
                <div className="flex items-center gap-2">
                  {signal.optionalConfirmations.dmiConfirm ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="text-sm">
                    DMI Trend Strength (ADX: {signal.indicators.adx.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Stop Loss</div>
                <div className="font-bold text-red-600">{formatPrice(signal.stopLoss)}</div>
                <div className="text-xs text-muted-foreground">
                  {signal.riskManagement.atrMultiplierSL}x ATR
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Take Profit</div>
                <div className="font-bold text-green-600">{formatPrice(signal.takeProfit)}</div>
                <div className="text-xs text-muted-foreground">
                  {signal.riskManagement.atrMultiplierTP}x ATR
                </div>
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Risk:Reward Ratio</div>
              <div className="text-2xl font-bold">{signal.riskRewardRatio.toFixed(1)}:1</div>
            </div>
          </CardContent>
        </Card>

        {/* Quality Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Signal Quality Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Overall Quality Score:</span>
              <Badge variant="outline" className="font-bold">
                {quality.qualityScore}/100
              </Badge>
            </div>
            
            {quality.strengths.length > 0 && (
              <div>
                <h5 className="font-semibold text-green-600 mb-2">Strengths</h5>
                <ul className="space-y-1">
                  {quality.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {quality.warnings.length > 0 && (
              <div>
                <h5 className="font-semibold text-orange-600 mb-2">Considerations</h5>
                <ul className="space-y-1">
                  {quality.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Enhanced Signal Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive trading signals with multi-factor confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{signals.length}</div>
              <div className="text-sm text-muted-foreground">Total Signals</div>
            </div>
            {Object.entries(gradeStats).map(([grade, count]) => (
              <div key={grade} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">Grade {grade}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="signals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signals">Signal List</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedSignal}>
            Signal Details
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="signals" className="space-y-4">
          {/* Filter Controls */}
          <div className="flex gap-2">
            {(['all', 'A+', 'A', 'B', 'C'] as const).map((grade) => (
              <Button
                key={grade}
                variant={filter === grade ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(grade)}
              >
                {grade === 'all' ? 'All' : `Grade ${grade}`}
                {grade !== 'all' && ` (${gradeStats[grade]})`}
              </Button>
            ))}
          </div>

          {/* Signal Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSignals.map(renderSignalCard)}
          </div>

          {filteredSignals.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No signals match the current filter</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="details">
          {selectedSignal ? (
            renderSignalDetails(selectedSignal)
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Select a signal to view details</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedSignalDashboard;