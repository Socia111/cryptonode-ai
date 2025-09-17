import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  signals_api: 'operational' | 'error' | 'loading';
  trade_executor: 'operational' | 'error' | 'loading';
  database: 'operational' | 'error' | 'loading';
  real_signals_count: number;
  trading_mode: 'paper' | 'live' | 'unknown';
}

export const SystemStatusPanel = () => {
  const [status, setStatus] = useState<SystemStatus>({
    signals_api: 'loading',
    trade_executor: 'loading', 
    database: 'loading',
    real_signals_count: 0,
    trading_mode: 'unknown'
  });
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const checkSystemStatus = async () => {
    setTesting(true);
    const newStatus: SystemStatus = {
      signals_api: 'loading',
      trade_executor: 'loading',
      database: 'loading',
      real_signals_count: 0,
      trading_mode: 'unknown'
    };

    try {
      // Test 1: Check Signals API
      console.log('🧪 Testing Signals API...');
      const { data: signalsData, error: signalsError } = await supabase.functions.invoke('signals-api', {
        body: { action: 'recent' }
      });
      
      if (signalsError) {
        newStatus.signals_api = 'error';
        console.error('❌ Signals API failed:', signalsError);
      } else {
        newStatus.signals_api = 'operational';
        newStatus.real_signals_count = signalsData?.signals?.length || 0;
        console.log(`✅ Signals API working: ${newStatus.real_signals_count} signals found`);
      }

      // Test 2: Check Trade Executor
      console.log('🧪 Testing Trade Executor...');
      const { data: executorData, error: executorError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });
      
      if (executorError) {
        newStatus.trade_executor = 'error';
        console.error('❌ Trade Executor failed:', executorError);
      } else {
        newStatus.trade_executor = 'operational';
        newStatus.trading_mode = executorData?.paper_mode ? 'paper' : 'live';
        console.log(`✅ Trade Executor working: ${newStatus.trading_mode} mode`);
      }

      // Test 3: Check Database  
      console.log('🧪 Testing Database...');
      const { data: dbData, error: dbError } = await supabase
        .from('signals')
        .select('id')
        .limit(1);
        
      if (dbError) {
        newStatus.database = 'error';
        console.error('❌ Database failed:', dbError);
      } else {
        newStatus.database = 'operational';
        console.log('✅ Database working');
      }

    } catch (error) {
      console.error('❌ System status check failed:', error);
    }

    setStatus(newStatus);
    setTesting(false);
    
    // Show status toast
    const allOperational = newStatus.signals_api === 'operational' && 
                          newStatus.trade_executor === 'operational' && 
                          newStatus.database === 'operational';
    
    toast({
      title: allOperational ? "System Status: All Green ✅" : "System Issues Found ⚠️",
      description: `Signals: ${newStatus.real_signals_count} found, Mode: ${newStatus.trading_mode}`,
      variant: allOperational ? "default" : "destructive"
    });
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const getStatusColor = (componentStatus: 'operational' | 'error' | 'loading') => {
    switch (componentStatus) {
      case 'operational': return 'default';
      case 'error': return 'destructive';
      case 'loading': return 'secondary';
    }
  };

  const getStatusIcon = (componentStatus: 'operational' | 'error' | 'loading') => {
    switch (componentStatus) {
      case 'operational': return '✅';
      case 'error': return '❌';
      case 'loading': return '⏳';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>⚡ System Status</span>
          <Button onClick={checkSystemStatus} disabled={testing} size="sm">
            {testing ? 'Testing...' : 'Refresh'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Signals API</span>
            <Badge variant={getStatusColor(status.signals_api)}>
              {getStatusIcon(status.signals_api)} {status.signals_api}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Trade Executor</span>
            <Badge variant={getStatusColor(status.trade_executor)}>
              {getStatusIcon(status.trade_executor)} {status.trade_executor}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Database</span>
            <Badge variant={getStatusColor(status.database)}>
              {getStatusIcon(status.database)} {status.database}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Real Signals Available</div>
            <div className="text-2xl font-bold">{status.real_signals_count}</div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Trading Mode</div>
            <div className="text-2xl font-bold capitalize">
              {status.trading_mode}
              {status.trading_mode === 'paper' && ' 📄'}
              {status.trading_mode === 'live' && ' 🔥'}
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Last checked: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};