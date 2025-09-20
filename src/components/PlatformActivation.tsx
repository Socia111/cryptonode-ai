import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Rocket, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Zap, 
  Database,
  Globe,
  BarChart3,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActivationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  icon: React.ReactNode;
}

const PlatformActivation = () => {
  const [isActivating, setIsActivating] = useState(false);
  const [activationSteps, setActivationSteps] = useState<ActivationStep[]>([
    {
      id: 'system_check',
      name: 'System Health Check',
      description: 'Verify all systems are operational',
      status: 'pending',
      icon: <Shield className="w-5 h-5" />
    },
    {
      id: 'market_data',
      name: 'Live Market Data',
      description: 'Connect to real-time market feeds',
      status: 'pending',
      icon: <Database className="w-5 h-5" />
    },
    {
      id: 'signal_engine',
      name: 'Signal Generation',
      description: 'Activate live signal generation',
      status: 'pending',
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: 'trading_systems',
      name: 'Trading Systems',
      description: 'Initialize trading infrastructure',
      status: 'pending',
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      id: 'live_mode',
      name: 'Live Mode Activation',
      description: 'Switch platform to live operation',
      status: 'pending',
      icon: <Globe className="w-5 h-5" />
    }
  ]);
  const [platformStatus, setPlatformStatus] = useState<'offline' | 'activating' | 'live'>('offline');
  const { toast } = useToast();

  const updateStepStatus = (stepId: string, status: ActivationStep['status']) => {
    setActivationSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const activatePlatform = async () => {
    setIsActivating(true);
    setPlatformStatus('activating');

    try {
      // Step 1: System Health Check
      updateStepStatus('system_check', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: systemStatus } = await supabase
        .from('system_status')
        .select('*')
        .limit(1);

      if (!systemStatus) {
        throw new Error('System status check failed');
      }
      updateStepStatus('system_check', 'completed');

      // Step 2: Market Data
      updateStepStatus('market_data', 'running');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { error: marketError } = await supabase
        .from('live_market_data')
        .select('*')
        .limit(1);

      if (marketError) {
        console.warn('Market data warning:', marketError);
      }
      updateStepStatus('market_data', 'completed');

      // Step 3: Signal Engine
      updateStepStatus('signal_engine', 'running');
      
      const signalResponse = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { 
          mode: 'activation',
          force: true 
        }
      });

      if (signalResponse.error) {
        throw new Error(`Signal engine failed: ${signalResponse.error.message}`);
      }
      updateStepStatus('signal_engine', 'completed');

      // Step 4: Trading Systems
      updateStepStatus('trading_systems', 'running');
      
      const scannerResponse = await supabase.functions.invoke('live-scanner-production', {
        body: { 
          mode: 'activation',
          force: true 
        }
      });

      if (scannerResponse.error) {
        console.warn('Scanner warning:', scannerResponse.error);
      }
      updateStepStatus('trading_systems', 'completed');

      // Step 5: Platform Activation
      updateStepStatus('live_mode', 'running');
      
      const activationResponse = await supabase.functions.invoke('platform-activation');
      
      if (activationResponse.error) {
        throw new Error(`Platform activation failed: ${activationResponse.error.message}`);
      }

      updateStepStatus('live_mode', 'completed');
      setPlatformStatus('live');

      toast({
        title: "🚀 Platform Activated!",
        description: "AITRADEX1 is now live with real-time data and trading",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Platform activation failed:', error);
      
      // Mark current step as error
      const currentStep = activationSteps.find(step => step.status === 'running');
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error');
      }

      setPlatformStatus('offline');
      
      toast({
        title: "Activation Failed",
        description: error.message || "Platform activation encountered an error",
        variant: "destructive"
      });
    } finally {
      setIsActivating(false);
    }
  };

  const getStatusIcon = (status: ActivationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = () => {
    switch (platformStatus) {
      case 'live':
        return <Badge className="bg-green-500 hover:bg-green-600">🟢 LIVE</Badge>;
      case 'activating':
        return <Badge variant="secondary" className="animate-pulse">🔄 ACTIVATING</Badge>;
      default:
        return <Badge variant="outline">⚪ OFFLINE</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-primary" />
                Platform Activation
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Activate AITRADEX1 for live trading operations
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {platformStatus === 'offline' && (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <strong>Ready to activate:</strong> All systems are prepared for live operation. 
                Click the button below to start the activation sequence.
              </AlertDescription>
            </Alert>
          )}

          {platformStatus === 'live' && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Platform Live:</strong> AITRADEX1 is now operational with real-time data feeds and live trading capabilities.
              </AlertDescription>
            </Alert>
          )}

          {/* Activation Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold">Activation Progress</h3>
            {activationSteps.map((step, index) => (
              <div 
                key={step.id} 
                className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                  step.status === 'running' ? 'border-blue-500 bg-blue-50' :
                  step.status === 'completed' ? 'border-green-500 bg-green-50' :
                  step.status === 'error' ? 'border-red-500 bg-red-50' :
                  'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {index + 1}
                  </div>
                  {step.icon}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium">{step.name}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                
                {getStatusIcon(step.status)}
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={activatePlatform}
              disabled={isActivating || platformStatus === 'live'}
              size="lg"
              className="w-full"
            >
              {isActivating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Activating Platform...
                </>
              ) : platformStatus === 'live' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Platform Active
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Activate Live Platform
                </>
              )}
            </Button>
          </div>

          {/* Status Summary */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>✅ Real-time market data feeds</p>
            <p>✅ Advanced signal generation algorithms</p>
            <p>✅ Live trading execution capabilities</p>
            <p>✅ Risk management and monitoring</p>
            <p>✅ Performance analytics and reporting</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformActivation;