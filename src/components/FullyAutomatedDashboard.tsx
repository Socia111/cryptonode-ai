import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, Activity, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { ObservabilityPanel } from './ObservabilityPanel';

interface SystemStatus {
  service_name: string;
  status: string;
  last_update: string;
  metadata: any;
  success_count: number;
  error_count: number;
}

interface AutomationState {
  isRunning: boolean;
  signalsGenerated: number;
  tradesExecuted: number;
  successRate: number;
  lastUpdate: string;
}

export function FullyAutomatedDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [automationState, setAutomationState] = useState<AutomationState>({
    isRunning: false,
    signalsGenerated: 0,
    tradesExecuted: 0,
    successRate: 0,
    lastUpdate: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_status')
        .select('*')
        .order('last_update', { ascending: false });

      if (error) throw error;

      setSystemStatus(data || []);
      
      // Calculate automation state
      const orchestrator = data?.find(s => s.service_name === 'fully_automated_orchestrator');
      const signalGen = data?.find(s => s.service_name === 'signal_auto_generator');
      
      setAutomationState({
        isRunning: orchestrator?.status === 'active' && signalGen?.status === 'active',
        signalsGenerated: (signalGen?.metadata as any)?.signals_generated || 0,
        tradesExecuted: (orchestrator?.metadata as any)?.trades_executed || 0,
        successRate: (orchestrator?.metadata as any)?.success_rate || 0,
        lastUpdate: orchestrator?.last_update || new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const startAutomation = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting fully automated trading system...');
      
      // Start signal generation
      const signalResult = await supabase.functions.invoke('signal-auto-generator', {
        body: { mode: 'start_continuous' }
      });

      console.log('📡 Signal generator result:', signalResult);

      // Start trading orchestrator
      const orchestratorResult = await supabase.functions.invoke('fully-automated-orchestrator', {
        body: { mode: 'start_automation' }
      });

      console.log('🤖 Orchestrator result:', orchestratorResult);

      toast({
        title: "🚀 Automation Started",
        description: "Fully automated trading system is now active!",
        variant: "default"
      });

      fetchSystemStatus();

    } catch (error: any) {
      console.error('❌ Failed to start automation:', error);
      toast({
        title: "❌ Automation Failed",
        description: error.message || 'Failed to start automated trading',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const stopAutomation = async () => {
    setLoading(true);
    try {
      // Update system status to stopped
      await supabase
        .from('system_status')
        .update({ status: 'stopped', last_update: new Date().toISOString() })
        .in('service_name', ['fully_automated_orchestrator', 'signal_auto_generator']);

      toast({
        title: "⏹️ Automation Stopped",
        description: "Automated trading has been paused",
        variant: "default"
      });

      fetchSystemStatus();

    } catch (error: any) {
      console.error('❌ Failed to stop automation:', error);
      toast({
        title: "❌ Stop Failed",
        description: error.message || 'Failed to stop automation',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualRun = async () => {
    setLoading(true);
    try {
      const result = await supabase.functions.invoke('fully-automated-orchestrator', {
        body: { mode: 'manual_trigger' }
      });

      console.log('🎯 Manual trigger result:', result);

      toast({
        title: "⚡ Manual Run Triggered",
        description: `Processed ${result.data?.signals_found || 0} signals`,
        variant: "default"
      });

      fetchSystemStatus();

    } catch (error: any) {
      console.error('❌ Manual trigger failed:', error);
      toast({
        title: "❌ Manual Run Failed",
        description: error.message || 'Failed to trigger manual run',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'error': return 'bg-destructive';
      case 'stopped': return 'bg-muted';
      default: return 'bg-warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🤖 Fully Automated Trading System</h2>
        <div className="flex gap-2">
          <Button
            onClick={automationState.isRunning ? stopAutomation : startAutomation}
            disabled={loading}
            variant={automationState.isRunning ? "destructive" : "default"}
          >
            {automationState.isRunning ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
          <Button
            onClick={triggerManualRun}
            disabled={loading}
            variant="outline"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Manual Run
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">📊 Status</TabsTrigger>
          <TabsTrigger value="observability">🔍 Live Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          {/* Main Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Automation Status
                <Badge variant={automationState.isRunning ? "default" : "secondary"}>
                  {automationState.isRunning ? "ACTIVE" : "STOPPED"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{automationState.signalsGenerated}</div>
                  <div className="text-sm text-muted-foreground">Signals Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{automationState.tradesExecuted}</div>
                  <div className="text-sm text-muted-foreground">Trades Executed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{(automationState.successRate * 100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Last Update</div>
                  <div className="text-sm font-medium">
                    {new Date(automationState.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Services */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemStatus.map((service) => (
              <Card key={service.service_name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    {service.service_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    <Badge variant="outline" className={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Success:</span>
                      <span className="font-medium">{service.success_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <span className="font-medium">{service.error_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Update:</span>
                      <span className="font-medium">
                        {new Date(service.last_update).toLocaleTimeString()}
                      </span>
                    </div>
                    {service.metadata && Object.keys(service.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(service.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="observability">
          <ObservabilityPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}