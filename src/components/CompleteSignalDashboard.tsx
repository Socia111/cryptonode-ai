import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Volume, Activity, Target, Shield, Star, RefreshCw } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { enhanceSignalWithScoring, assessSignalQuality, UISignal } from '@/lib/signalScoring';

interface CompleteSignalDashboardProps {
  signals: UISignal[];
}

export function CompleteSignalDashboard({ signals }: CompleteSignalDashboardProps) {
  const { generateSignals, loading } = useSignals();
  
  // Filter for complete algorithm signals
  const completeSignals = signals.filter(signal => 
    signal.algorithm?.includes('complete') || 
    signal.algorithm?.includes('v1') ||
    signal.source === 'complete_algorithm'
  );
  
  const enhancedSignals = completeSignals.map(enhanceSignalWithScoring);
  
  // Statistics
  const gradeStats = enhancedSignals.reduce((acc, signal) => {
    const grade = signal.enhancedGrade;
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const avgConfidence = enhancedSignals.length > 0 ? 
    enhancedSignals.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / enhancedSignals.length : 0;
    
  const avgRiskReward = enhancedSignals.length > 0 ?
    enhancedSignals.reduce((sum, s) => sum + (s.risk_reward_ratio || 1.5), 0) / enhancedSignals.length : 1.5;

  const handleGenerateSignals = async () => {
    try {
      // Call the complete algorithm scanner
      const response = await fetch(`https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-advanced-scanner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'],
          generate_signals: true
        })
      });
      
      if (response.ok) {
        // Refresh signals list
        generateSignals();
      }
    } catch (error) {
      console.error('Failed to generate complete algorithm signals:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Complete Trading Signal Algorithm</CardTitle>
              <CardDescription>
                Advanced multi-layered signal detection with Golden Cross, HVP filtering, and ATR-based risk management
              </CardDescription>
            </div>
            <Button 
              onClick={handleGenerateSignals} 
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Generate Signals
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{completeSignals.length}</div>
              <div className="text-sm text-muted-foreground">Active Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{avgConfidence.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{avgRiskReward.toFixed(1)}:1</div>
              <div className="text-sm text-muted-foreground">Avg R:R</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{gradeStats['A+'] || 0}</div>
              <div className="text-sm text-muted-foreground">A+ Signals</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Algorithm Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Primary Conditions (Mandatory)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span>Golden Cross / Death Cross (21 EMA × 200 SMA)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume className="h-4 w-4 text-green-500" />
                  <span>Volume Surge (≥1.5× average)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span>High Volatility Regime (HVP &gt; 50)</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Secondary Filters (Optional)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                  <span>Stochastic Momentum Filter</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  <span>DMI/ADX Trend Strength (ADX &gt; 20)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  <span>ATR-Based Risk Management</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Signal Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['A+', 'A', 'B', 'C'].map(grade => {
              const count = gradeStats[grade] || 0;
              const percentage = completeSignals.length > 0 ? (count / completeSignals.length) * 100 : 0;
              
              return (
                <div key={grade} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {grade}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {grade === 'A+' && 'Exceptional signals (Confidence ≥90, R:R ≥1.4)'}
                        {grade === 'A' && 'Strong signals (Confidence ≥85, R:R ≥1.3)'}
                        {grade === 'B' && 'Good signals (Confidence ≥80)'}
                        {grade === 'C' && 'Fair signals (Confidence &lt;80)'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{count} signals</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Complete Algorithm Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enhancedSignals.slice(0, 5).map((signal, index) => {
              const quality = assessSignalQuality(signal);
              
              return (
                <div key={signal.id || index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {signal.direction === 'LONG' || signal.direction === 'BUY' ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                        <span className="font-semibold">{signal.token}</span>
                      </div>
                      <Badge 
                        variant={signal.enhancedGrade === 'A+' ? 'default' : 'secondary'}
                        className="font-mono"
                      >
                        {signal.enhancedGrade}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {quality.quality}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${signal.entry_price?.toFixed(4)}</div>
                      <div className="text-xs text-muted-foreground">Entry</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Confidence</div>
                      <div className="font-medium">{signal.confidence_score?.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Risk:Reward</div>
                      <div className="font-medium">{signal.risk_reward_ratio?.toFixed(1)}:1</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Volume</div>
                      <div className="font-medium">{signal.volume_ratio?.toFixed(1)}×</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">HVP</div>
                      <div className="font-medium">{signal.hvp_value?.toFixed(0)}th</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Stop Loss</div>
                      <div className="text-red-600 font-medium">${signal.stop_loss?.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Take Profit</div>
                      <div className="text-green-600 font-medium">${signal.take_profit?.toFixed(4)}</div>
                    </div>
                  </div>
                  
                  {/* Signal confirmations */}
                  <div className="flex flex-wrap gap-2">
                    {signal.golden_cross && (
                      <Badge variant="outline" className="text-xs">
                        ✓ Golden Cross
                      </Badge>
                    )}
                    {signal.death_cross && (
                      <Badge variant="outline" className="text-xs">
                        ✓ Death Cross
                      </Badge>
                    )}
                    {signal.volume_surge && (
                      <Badge variant="outline" className="text-xs">
                        ✓ Volume Surge
                      </Badge>
                    )}
                    {signal.high_volatility && (
                      <Badge variant="outline" className="text-xs">
                        ✓ High Volatility
                      </Badge>
                    )}
                    {signal.stochastic_confirmed && (
                      <Badge variant="outline" className="text-xs">
                        ✓ Stochastic
                      </Badge>
                    )}
                    {signal.dmi_confirmed && (
                      <Badge variant="outline" className="text-xs">
                        ✓ DMI/ADX
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            
            {enhancedSignals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No complete algorithm signals generated yet.</p>
                <p className="text-sm">Click "Generate Signals" to run the complete trading signal algorithm.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}