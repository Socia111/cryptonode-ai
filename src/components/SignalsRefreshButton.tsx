import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SignalsRefreshButton: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSignals = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      console.log('🔄 Triggering signal generation...');
      
      const { data, error } = await supabase.functions.invoke('unified-signal-engine', {
        body: { 
          timeframe: '1h',
          force_generation: true,
          symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT']
        }
      });

      if (error) {
        console.error('Signal generation error:', error);
        toast({
          title: "Error generating signals",
          description: error.message || "Failed to generate new signals",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Signal generation response:', data);
      toast({
        title: "Signals generated",
        description: `Generated ${data?.signals_generated || 'new'} trading signals`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Signal generation failed",
        description: "Unable to generate new signals",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateSignals}
      disabled={isGenerating}
      size="sm"
      className="gap-2"
    >
      {isGenerating ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      {isGenerating ? 'Generating...' : 'Generate Signals'}
    </Button>
  );
};

export default SignalsRefreshButton;