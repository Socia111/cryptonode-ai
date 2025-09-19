import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ErrorRecoveryPanelProps {
  onRecoveryComplete?: () => void;
}

export const ErrorRecoveryPanel: React.FC<ErrorRecoveryPanelProps> = ({ onRecoveryComplete }) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryResults, setRecoveryResults] = useState<any>(null);
  const { toast } = useToast();

  const handleSystemRecovery = async () => {
    setIsRecovering(true);
    setRecoveryResults(null);

    try {
      console.log('[Error Recovery] Starting comprehensive system recovery...');

      // Step 1: Test database connectivity
      const { data: dbTest, error: dbError } = await supabase
        .from('signals')
        .select('count', { count: 'exact', head: true });

      if (dbError) {
        throw new Error(`Database connectivity failed: ${dbError.message}`);
      }

      // Step 2: Trigger comprehensive trading pipeline
      const { data: pipelineData, error: pipelineError } = await supabase.functions.invoke('comprehensive-trading-pipeline', {
        body: { mode: 'full', recovery: true }
      });

      if (pipelineError) {
        console.error('[Error Recovery] Pipeline error:', pipelineError);
      }

      // Step 3: Test signal generation
      const { data: signalData, error: signalError } = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { recovery_test: true }
      });

      if (signalError) {
        console.error('[Error Recovery] Signal generation error:', signalError);
      }

      // Step 4: Verify trading system
      const { data: tradingData, error: tradingError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status', recovery_check: true }
      });

      if (tradingError) {
        console.error('[Error Recovery] Trading system error:', tradingError);
      }

      const results = {
        database_connectivity: !dbError,
        pipeline_status: !pipelineError,
        signal_generation: !signalError,
        trading_system: !tradingError,
        pipeline_data: pipelineData,
        signal_data: signalData,
        trading_data: tradingData,
        timestamp: new Date().toISOString()
      };

      setRecoveryResults(results);

      const successCount = Object.values(results).slice(0, 4).filter(Boolean).length;
      const isFullyRecovered = successCount === 4;

      toast({
        title: isFullyRecovered ? "System Recovery Complete" : "Partial Recovery",
        description: `${successCount}/4 systems operational`,
        variant: isFullyRecovered ? "default" : "destructive"
      });

      if (isFullyRecovered && onRecoveryComplete) {
        onRecoveryComplete();
      }

    } catch (error: any) {
      console.error('[Error Recovery] Recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive"
      });
      setRecoveryResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const getStatusBadge = (status: boolean) => (
    <Badge variant={status ? "default" : "destructive"}>
      {status ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
      {status ? "Operational" : "Error"}
    </Badge>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          System Error Recovery
        </CardTitle>
        <CardDescription>
          Diagnose and fix system-wide errors automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recoveryResults && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will test and repair all system components including database, signals, and trading functions.
            </AlertDescription>
          </Alert>
        )}

        {recoveryResults && (
          <div className="space-y-3">
            <h4 className="font-semibold">Recovery Results:</h4>
            
            {recoveryResults.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{recoveryResults.error}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  {getStatusBadge(recoveryResults.database_connectivity)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Pipeline</span>
                  {getStatusBadge(recoveryResults.pipeline_status)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Signals</span>
                  {getStatusBadge(recoveryResults.signal_generation)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Trading</span>
                  {getStatusBadge(recoveryResults.trading_system)}
                </div>
              </div>
            )}

            {recoveryResults.pipeline_data && (
              <div className="text-sm text-muted-foreground">
                Pipeline: {recoveryResults.pipeline_data.signals_generated || 0} signals generated
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleSystemRecovery}
          disabled={isRecovering}
          className="w-full"
          variant="default"
        >
          {isRecovering ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Recovering System...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Start Recovery
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};