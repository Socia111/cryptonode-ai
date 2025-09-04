import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StatusCheckResult {
  service: string;
  status: 'healthy' | 'error' | 'checking';
  message: string;
  lastChecked?: string;
}

const StatusChecker = () => {
  const [statusResults, setStatusResults] = useState<StatusCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const runStatusChecks = async () => {
    setIsChecking(true);
    const checks: StatusCheckResult[] = [
      { service: 'Database Connection', status: 'checking', message: 'Testing database connectivity...' },
      { service: 'Signals API', status: 'checking', message: 'Testing signals API endpoint...' },
      { service: 'Live Scanner', status: 'checking', message: 'Testing live scanner function...' },
      { service: 'Bybit API', status: 'checking', message: 'Testing Bybit API connection...' }
    ];
    
    setStatusResults([...checks]);

    // Check Database Connection
    try {
      const { data, error } = await supabase.from('signals').select('count').limit(1).single();
      if (error) throw error;
      checks[0] = { 
        service: 'Database Connection', 
        status: 'healthy', 
        message: 'Database accessible',
        lastChecked: new Date().toLocaleTimeString()
      };
    } catch (error: any) {
      checks[0] = { 
        service: 'Database Connection', 
        status: 'error', 
        message: `Database error: ${error.message}`,
        lastChecked: new Date().toLocaleTimeString()
      };
    }
    setStatusResults([...checks]);

    // Check Signals API
    try {
      const { data, error } = await supabase.functions.invoke('signals-api', {
        body: { action: 'health' }
      });
      if (error) throw error;
      checks[1] = { 
        service: 'Signals API', 
        status: 'healthy', 
        message: 'Signals API responding',
        lastChecked: new Date().toLocaleTimeString()
      };
    } catch (error: any) {
      checks[1] = { 
        service: 'Signals API', 
        status: 'error', 
        message: `Signals API error: ${error.message}`,
        lastChecked: new Date().toLocaleTimeString()
      };
    }
    setStatusResults([...checks]);

    // Check Live Scanner
    try {
      const { data, error } = await supabase.functions.invoke('live-scanner-production', {
        body: { 
          exchange: 'bybit',
          timeframe: '1h',
          test_mode: true,
          symbols: ['BTCUSDT']
        }
      });
      if (error) throw error;
      checks[2] = { 
        service: 'Live Scanner', 
        status: 'healthy', 
        message: 'Live scanner operational',
        lastChecked: new Date().toLocaleTimeString()
      };
    } catch (error: any) {
      checks[2] = { 
        service: 'Live Scanner', 
        status: 'error', 
        message: `Scanner error: ${error.message}`,
        lastChecked: new Date().toLocaleTimeString()
      };
    }
    setStatusResults([...checks]);

    // Check Bybit API
    try {
      const { data, error } = await supabase.functions.invoke('debug-bybit-api');
      if (error) throw error;
      checks[3] = { 
        service: 'Bybit API', 
        status: data?.bybit_connectivity ? 'healthy' : 'error', 
        message: data?.bybit_connectivity ? 'Bybit API accessible' : 'Bybit API connection failed',
        lastChecked: new Date().toLocaleTimeString()
      };
    } catch (error: any) {
      checks[3] = { 
        service: 'Bybit API', 
        status: 'error', 
        message: `Bybit API error: ${error.message}`,
        lastChecked: new Date().toLocaleTimeString()
      };
    }

    setStatusResults([...checks]);
    setIsChecking(false);

    // Show summary toast
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const errorCount = checks.filter(c => c.status === 'error').length;
    
    toast({
      title: "🔍 System Health Check Complete",
      description: `✅ ${healthyCount} services healthy • ❌ ${errorCount} services have errors`,
      variant: errorCount > 0 ? "destructive" : "default"
    });
  };

  useEffect(() => {
    runStatusChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'checking': return <Activity className="w-4 h-4 animate-pulse text-muted-foreground" />;
      default: return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-success text-success-foreground">Healthy</Badge>;
      case 'error': return <Badge className="bg-destructive text-destructive-foreground">Error</Badge>;
      case 'checking': return <Badge variant="outline">Checking...</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health Status
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runStatusChecks}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Run Checks'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusResults.map((result, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {getStatusIcon(result.status)}
                <div>
                  <p className="font-medium">{result.service}</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.lastChecked && (
                    <p className="text-xs text-muted-foreground">Last checked: {result.lastChecked}</p>
                  )}
                </div>
              </div>
              {getStatusBadge(result.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusChecker;