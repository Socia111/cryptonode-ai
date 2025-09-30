import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AutomationAPI } from '@/lib/automation';
import LiveSignalsPanel from './LiveSignalsPanel';

export default function AutomationDashboard() {
  const [autoState, setAutoState] = useState({
    autoEnabled: true,
    mode: 'live' as 'paper' | 'live',
    activeTrades: 0,
    pnlToday: 0,
  });
  const [systemStatus, setSystemStatus] = useState({
    scanner: 'active',
    executor: 'active',
    lastScan: null as string | null,
  });

  useEffect(() => {
    loadAutomationState();
    loadSystemStatus();
    
    const interval = setInterval(() => {
      loadAutomationState();
      loadSystemStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadAutomationState = async () => {
    const state = await AutomationAPI.get();
    setAutoState(state);
  };

  const loadSystemStatus = async () => {
    try {
      const { data: logs } = await supabase
        .from('edge_event_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (logs && logs.length > 0) {
        setSystemStatus((prev) => ({
          ...prev,
          lastScan: logs[0].created_at,
        }));
      }
    } catch (error) {
      console.error('[Automation] Error loading status:', error);
    }
  };

  const toggleAutoTrading = async () => {
    const newState = !autoState.autoEnabled;
    await AutomationAPI.toggleAuto(newState);
    setAutoState((prev) => ({ ...prev, autoEnabled: newState }));
  };

  const switchMode = async (mode: 'paper' | 'live') => {
    await AutomationAPI.setMode(mode);
    setAutoState((prev) => ({ ...prev, mode }));
  };

  return (
    <div className="space-y-6">
      {/* Automation Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Automated Trading System
            <Badge 
              variant={autoState.autoEnabled ? 'default' : 'secondary'}
              className={autoState.autoEnabled ? 'bg-green-500' : ''}
            >
              {autoState.autoEnabled ? 'Active' : 'Paused'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Mode</div>
              <div className="text-2xl font-bold capitalize">{autoState.mode}</div>
            </div>
            
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Active Trades</div>
              <div className="text-2xl font-bold">{autoState.activeTrades}</div>
            </div>
            
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">P&L Today</div>
              <div className={`text-2xl font-bold ${autoState.pnlToday >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${autoState.pnlToday.toFixed(2)}
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">System Status</div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-xl font-bold">Online</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={toggleAutoTrading}
              variant={autoState.autoEnabled ? 'destructive' : 'default'}
            >
              {autoState.autoEnabled ? 'Pause' : 'Start'} Auto-Trading
            </Button>

            <div className="flex gap-2">
              <Button
                variant={autoState.mode === 'paper' ? 'default' : 'outline'}
                onClick={() => switchMode('paper')}
              >
                Paper Mode
              </Button>
              <Button
                variant={autoState.mode === 'live' ? 'default' : 'outline'}
                onClick={() => switchMode('live')}
              >
                Live Mode
              </Button>
            </div>
          </div>

          {/* Warning for Live Mode */}
          {autoState.mode === 'live' && autoState.autoEnabled && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                  Live Trading Active
                </div>
                <div className="text-muted-foreground">
                  Real trades are being executed automatically based on signals with 75%+ confidence.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Signals Panel */}
      <LiveSignalsPanel />

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Scanner</div>
              <Badge variant="default" className="mt-2 bg-green-500">
                {systemStatus.scanner}
              </Badge>
            </div>
            <div className="text-center p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Executor</div>
              <Badge variant="default" className="mt-2 bg-green-500">
                {systemStatus.executor}
              </Badge>
            </div>
            <div className="text-center p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Last Scan</div>
              <div className="text-xs mt-2">
                {systemStatus.lastScan 
                  ? new Date(systemStatus.lastScan).toLocaleTimeString()
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
