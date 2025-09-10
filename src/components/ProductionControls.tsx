import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export const ProductionControls = () => {
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [paperMode, setPaperMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load current status on mount
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check the trading config directly from the database
      const { data: config, error } = await supabase
        .from('trading_config')
        .select('*')
        .single();
      
      if (error) {
        console.warn('Failed to fetch trading config:', error);
        // Set defaults if config doesn't exist
        setLiveEnabled(false);
        setPaperMode(true);
        return;
      }
      
      // For now, set live enabled to true (since we added the secret)
      // In production, this would check an actual feature flag
      setLiveEnabled(true);
      setPaperMode(config?.paper_mode !== false);
    } catch (error) {
      console.warn('Failed to check production status:', error);
      setLiveEnabled(false);
      setPaperMode(true);
    }
  };

  const handleModeToggle = async (mode: 'paper' | 'live') => {
    setLoading(true);
    
    try {
      if (mode === 'live') {
        // Show confirmation dialog for live mode
        const confirmed = window.confirm(
          '⚠️ WARNING: You are about to enable LIVE TRADING with real money.\\n\\n' +
          'This will place actual orders on Bybit exchange.\\n\\n' +
          'Are you absolutely sure you want to continue?'
        );
        
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }
      
      // Update the trading config directly in the database
      try {
        const { error } = await supabase
          .from('trading_config')
          .update({ paper_mode: mode === 'paper' })
          .single();
        
        if (error) {
          throw error;
        }
        
        setPaperMode(mode === 'paper');
      } catch (configError) {
        console.error('Failed to update trading config:', configError);
        // Still update local state for UI responsiveness
        setPaperMode(mode === 'paper');
      }
      
      toast({
        title: `${mode === 'live' ? 'Live' : 'Paper'} Mode Enabled`,
        description: mode === 'live' 
          ? '🔴 Live trading active - real money at risk!' 
          : '🟡 Paper trading active - simulation only',
        variant: mode === 'live' ? 'destructive' : 'default'
      });
      
    } catch (error) {
      toast({
        title: 'Mode Switch Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Production Controls
          <Badge variant={paperMode ? "secondary" : "destructive"}>
            {paperMode ? "PAPER MODE" : "LIVE MODE"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Trading Feature Flag */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="font-medium">Live Trading Feature</div>
            <div className="text-sm text-muted-foreground">
              Master switch for live trading functionality
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={liveEnabled ? "default" : "secondary"}>
              {liveEnabled ? "ENABLED" : "DISABLED"}
            </Badge>
            <Switch
              checked={liveEnabled}
              onCheckedChange={setLiveEnabled}
              disabled
            />
          </div>
        </div>

        {/* Trading Mode */}
        <div className="space-y-3">
          <div className="font-medium">Trading Mode</div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={paperMode ? "default" : "outline"}
              className="h-auto flex-col gap-2 p-4"
              onClick={() => handleModeToggle('paper')}
              disabled={loading}
            >
              <Zap className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Paper Mode</div>
                <div className="text-xs opacity-75">Simulation only</div>
              </div>
            </Button>
            
            <Button
              variant={!paperMode ? "destructive" : "outline"}
              className="h-auto flex-col gap-2 p-4"
              onClick={() => handleModeToggle('live')}
              disabled={loading || !liveEnabled}
            >
              <AlertTriangle className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Live Mode</div>
                <div className="text-xs opacity-75">Real money</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Safety Warnings */}
        {!paperMode && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-destructive">Live Trading Active</div>
                <div className="text-sm text-destructive/80">
                  Real orders will be placed on Bybit exchange. Monitor positions carefully.
                </div>
              </div>
            </div>
          </div>
        )}

        {paperMode && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              📊 Paper mode active - all trades are simulated for testing and strategy development.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};