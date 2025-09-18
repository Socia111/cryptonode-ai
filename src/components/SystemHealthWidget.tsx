import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSystemRestart } from '@/hooks/useSystemRestart';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Activity,
  Database,
  Wifi,
  Settings
} from 'lucide-react';

interface SystemHealth {
  signals: boolean;
  accounts: boolean;
  signalsCount: number;
  accountsCount: number;
  timestamp?: string;
  error?: string;
}

export function SystemHealthWidget() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { isRestarting, executeSystemRestart, checkSystemHealth } = useSystemRestart();

  const performHealthCheck = async () => {
    setIsChecking(true);
    try {
      const healthData = await checkSystemHealth();
      setHealth(healthData);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({
        signals: false,
        accounts: false,
        signalsCount: 0,
        accountsCount: 0,
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
    
    // Check health every 30 seconds
    const interval = setInterval(performHealthCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = () => {
    if (!health) return 'unknown';
    if (health.error) return 'error';
    if (health.signals && health.accounts) return 'healthy';
    return 'warning';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'All Systems Operational';
      case 'warning': return 'Some Issues Detected';
      case 'error': return 'System Errors';
      default: return 'Status Unknown';
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          System Health
          <Badge 
            variant="outline" 
            className={`ml-auto ${getStatusColor(overallStatus)} text-white border-none`}
          >
            {getStatusText(overallStatus)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Database className="h-4 w-4" />
            <div className="flex-1">
              <div className="text-sm font-medium">Signals</div>
              <div className="text-xs text-muted-foreground">
                {health?.signalsCount || 0} available
              </div>
            </div>
            {health?.signals ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Settings className="h-4 w-4" />
            <div className="flex-1">
              <div className="text-sm font-medium">Accounts</div>
              <div className="text-xs text-muted-foreground">
                {health?.accountsCount || 0} configured
              </div>
            </div>
            {health?.accounts ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {health?.error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">System Error</span>
            </div>
            <p className="text-xs text-red-600 mt-1">{health.error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={performHealthCheck}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Check
          </Button>

          {overallStatus !== 'healthy' && (
            <Button 
              size="sm"
              onClick={executeSystemRestart}
              disabled={isRestarting}
              className="flex-1"
            >
              {isRestarting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Wifi className="h-3 w-3 mr-1" />
              )}
              Fix
            </Button>
          )}
        </div>

        {/* Last Check */}
        {health?.timestamp && (
          <p className="text-xs text-muted-foreground text-center">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}