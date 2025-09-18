import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';
import { TradingSignal } from '@/types/trading';

interface EnhancedSignalCardProps {
  signal: TradingSignal & { 
    _score?: number; 
    _grade?: 'A+' | 'A' | 'B' | 'C';
    isNew?: boolean;
  };
  onTrade: (signal: TradingSignal) => void;
  onDetails?: (signal: TradingSignal) => void;
}

export function EnhancedSignalCard({ signal, onTrade, onDetails }: EnhancedSignalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatPrice = (price: number) => price.toFixed(4);
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-emerald-600';
    if (confidence >= 75) return 'text-blue-600';
    if (confidence >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getVolatilityBadge = (volatility?: string) => {
    const variants = {
      'Low': 'secondary',
      'Medium': 'default', 
      'High': 'destructive'
    } as const;
    return variants[volatility as keyof typeof variants] || 'outline';
  };

  const getTrendBadge = (strength?: string) => {
    const variants = {
      'Weak': 'outline',
      'Moderate': 'secondary',
      'Strong': 'default'
    } as const;
    return variants[strength as keyof typeof variants] || 'outline';
  };

  const timeAgo = signal.generated_at ? 
    Math.floor((Date.now() - new Date(signal.generated_at).getTime()) / 60000) : 0;

  return (
    <Card className={`transition-all ${signal.isNew ? 'ring-2 ring-primary animate-pulse' : ''}`}>
      <CardHeader className="pb-3">
        {/* Compact View */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{signal.symbol}</h3>
              <Badge variant="outline" className="text-xs">
                {signal.timeframe}
              </Badge>
              <div className="flex items-center gap-1">
                {signal.side === 'LONG' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`font-medium ${signal.side === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
                  {signal.side}
                </span>
              </div>
            </div>
            
            {signal._grade && (
              <Badge variant={
                signal._grade === 'A+' ? 'default' :
                signal._grade === 'A' ? 'secondary' :
                signal._grade === 'B' ? 'outline' : 'destructive'
              }>
                {signal._grade}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getConfidenceColor(signal.confidence_score)}`}>
              {signal.confidence_score.toFixed(0)}%
            </span>
            <Button
              size="sm"
              onClick={() => onTrade(signal)}
              className="bg-primary hover:bg-primary/90"
            >
              TRADE
            </Button>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>Price: ${formatPrice(signal.entry_price)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>SL: ${formatPrice(signal.stop_loss)}</span>
          </div>
          <div>TP1: ${formatPrice(signal.take_profit_1)}</div>
          {signal.take_profit_2 && <div>TP2: ${formatPrice(signal.take_profit_2)}</div>}
          <div className={`font-medium ${signal.r_r_ratio >= 2 ? 'text-green-600' : 'text-amber-600'}`}>
            R:R = {signal.r_r_ratio}
          </div>
          <Badge variant={getVolatilityBadge(signal.volatility)}>
            {signal.volatility || 'Medium'}
          </Badge>
        </div>

        {/* Expand/Collapse Trigger */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 h-8 w-full justify-center">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Less Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  More Details
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Expanded View */}
          <CollapsibleContent>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Signal Analysis</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Trend Strength:</span>
                      <Badge variant={getTrendBadge(signal.trend_strength)}>
                        {signal.trend_strength || 'Moderate'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Source:</span>
                      <span className="text-muted-foreground">{signal.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Generated:</span>
                      <span className="text-muted-foreground">
                        {timeAgo < 1 ? 'now' : `${timeAgo}m ago`}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Risk Management</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Stop Loss:</span>
                      <span className="text-red-600">${formatPrice(signal.stop_loss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Take Profit 1:</span>
                      <span className="text-green-600">${formatPrice(signal.take_profit_1)}</span>
                    </div>
                    {signal.take_profit_2 && (
                      <div className="flex justify-between">
                        <span>Take Profit 2:</span>
                        <span className="text-green-600">${formatPrice(signal.take_profit_2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Risk:Reward:</span>
                      <span className={signal.r_r_ratio >= 2 ? 'text-green-600' : 'text-amber-600'}>
                        1:{signal.r_r_ratio}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {onDetails && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onDetails(signal)}
                  className="w-full mt-3"
                >
                  View Technical Analysis
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}