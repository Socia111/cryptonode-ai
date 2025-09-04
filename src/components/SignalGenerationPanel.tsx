import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SignalGenerationPanelProps {
  onSignalsGenerated?: (count: number) => void;
}

const SignalGenerationPanel: React.FC<SignalGenerationPanelProps> = ({ onSignalsGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { toast } = useToast();

  const generateSignals = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    try {
      toast({
        title: "🔄 Generating Signals",
        description: "Scanning all crypto markets for trading opportunities..."
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Generate signals using multiple scanner functions
      const scanPromises = [
        supabase.functions.invoke('live-scanner-production', {
          body: { 
            exchange: 'bybit',
            timeframe: '5m',
            relaxed_filters: true,
            scan_all_coins: true
          }
        }),
        supabase.functions.invoke('live-scanner-production', {
          body: { 
            exchange: 'bybit',
            timeframe: '15m',
            relaxed_filters: true,
            scan_all_coins: true
          }
        }),
        supabase.functions.invoke('live-scanner-production', {
          body: { 
            exchange: 'bybit',
            timeframe: '1h',
            relaxed_filters: false,
            scan_all_coins: true
          }
        })
      ];

      const results = await Promise.allSettled(scanPromises);
      clearInterval(progressInterval);
      setProgress(100);

      let totalSignals = 0;
      results.forEach((result, index) => {
        const timeframes = ['5m', '15m', '1h'];
        if (result.status === 'fulfilled' && result.value.data) {
          const signalsFound = result.value.data.signals_found || 0;
          totalSignals += signalsFound;
          console.log(`[SignalGen] ${timeframes[index]} scan: ${signalsFound} signals`);
        } else if (result.status === 'rejected') {
          console.error(`[SignalGen] ${timeframes[index]} scan failed:`, result.reason);
        }
      });

      setLastGenerated(new Date());
      onSignalsGenerated?.(totalSignals);

      toast({
        title: "✅ Signals Generated",
        description: `Successfully generated ${totalSignals} new trading signals`
      });

      // Auto-refresh in 5 minutes
      setTimeout(() => {
        if (!isGenerating) {
          generateSignals();
        }
      }, 5 * 60 * 1000);

    } catch (error: any) {
      console.error('[SignalGen] Failed:', error);
      toast({
        title: "❌ Generation Failed",
        description: error?.message || 'Failed to generate signals',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const generateSpynxScores = async () => {
    try {
      toast({
        title: "🔄 Updating SPYNX Scores",
        description: "Calculating market scores for all tokens..."
      });

      const { data, error } = await supabase.functions.invoke('calculate-spynx-scores');
      
      if (error) {
        throw error;
      }

      toast({
        title: "✅ SPYNX Scores Updated",
        description: "Market intelligence scores have been recalculated"
      });
    } catch (error: any) {
      toast({
        title: "❌ Update Failed",
        description: error?.message || 'Failed to update SPYNX scores',
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Signal Generation
        </CardTitle>
        <CardDescription>
          Generate real-time trading signals from market analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isGenerating ? "default" : "secondary"}>
              {isGenerating ? "Generating..." : "Ready"}
            </Badge>
            {lastGenerated && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last: {lastGenerated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Scanning markets... {progress}%
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={generateSignals}
            disabled={isGenerating}
            className="w-full"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Signals"}
          </Button>
          
          <Button 
            onClick={generateSpynxScores}
            variant="outline"
            disabled={isGenerating}
            className="w-full"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Update SPYNX Scores
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Multi-timeframe analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Real-time market data</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>High-confidence filtering</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalGenerationPanel;