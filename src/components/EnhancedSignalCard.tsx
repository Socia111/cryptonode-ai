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
    risk?: { atr: number; rr: number; hvp: number; spread_bps: number };
    indicators?: { rsi: number; ema21: number; ema50: number; sma200: number; hvp: number; atr: number };
    diagnostics?: { reasons: string[]; metrics: any };
    grade?: 'A+' | 'A' | 'B' | 'C';
    signal_source?: string;
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
            <span>Entry: ${formatPrice(signal.entry_price)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>SL: ${formatPrice(signal.stop_loss)}</span>
          </div>
          <div>TP: ${formatPrice(signal.take_profit_1)}</div>
          <div className={`font-medium ${(signal.risk?.rr || signal.r_r_ratio) >= 1.8 ? 'text-green-600' : 'text-amber-600'}`}>
            R:R {(signal.risk?.rr || signal.r_r_ratio || 0).toFixed(1)}:1
          </div>
          {signal.risk?.spread_bps && (
            <span className={`text-xs ${signal.risk.spread_bps < 20 ? 'text-green-600' : 'text-amber-600'}`}>
              {signal.risk.spread_bps.toFixed(1)}bps
            </span>
          )}
          <Badge variant="outline" className="text-xs">
            {signal.signal_source || signal.source}
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Signal Analysis</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Grade:</span>
                      <Badge variant={
                        (signal.grade || signal._grade) === 'A+' ? 'default' :
                        (signal.grade || signal._grade) === 'A' ? 'secondary' :
                        (signal.grade || signal._grade) === 'B' ? 'outline' : 'destructive'
                      }>
                        {signal.grade || signal._grade || 'C'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeframe:</span>
                      <span className="text-muted-foreground">{signal.timeframe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Source:</span>
                      <span className="text-muted-foreground text-xs">
                        {signal.signal_source || signal.source}
                      </span>
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
                  <h4 className="text-sm font-medium mb-2">Risk Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>R:R Ratio:</span>
                      <span className={(signal.risk?.rr || signal.r_r_ratio) >= 1.8 ? 'text-green-600' : 'text-amber-600'}>
                        {(signal.risk?.rr || signal.r_r_ratio || 0).toFixed(1)}:1
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ATR:</span>
                      <span className="text-muted-foreground">
                        {signal.risk?.atr ? signal.risk.atr.toFixed(4) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>HVP:</span>
                      <span className={`${signal.risk?.hvp > 60 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {signal.risk?.hvp ? `${signal.risk.hvp.toFixed(0)}th` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spread:</span>
                      <span className={`${signal.risk?.spread_bps > 25 ? 'text-amber-600' : 'text-green-600'}`}>
                        {signal.risk?.spread_bps ? `${signal.risk.spread_bps.toFixed(1)}bps` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Indicators</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>RSI:</span>
                      <span className={`${signal.indicators?.rsi > 70 ? 'text-red-600' : signal.indicators?.rsi < 30 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {signal.indicators?.rsi ? signal.indicators.rsi.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>EMA21:</span>
                      <span className="text-muted-foreground">
                        {signal.indicators?.ema21 ? formatPrice(signal.indicators.ema21) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>EMA50:</span>
                      <span className="text-muted-foreground">
                        {signal.indicators?.ema50 ? formatPrice(signal.indicators.ema50) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>SMA200:</span>
                      <span className="text-muted-foreground">
                        {signal.indicators?.sma200 ? formatPrice(signal.indicators.sma200) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnostics Section */}
              {signal.diagnostics && signal.diagnostics.reasons && signal.diagnostics.reasons.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-amber-600">Rejection Reasons (Soft-Accepted)</h4>
                  <div className="flex flex-wrap gap-1">
                    {signal.diagnostics.reasons.map((reason, index) => (
                      <Badge key={index} variant="outline" className="text-xs text-amber-700">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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