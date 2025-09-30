import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { useObservability } from '@/hooks/useObservability';

export const LiveObservabilityDashboard = () => {
  const { systemStatus, kpis, loading, lastUpdate, refreshData, isSystemHealthy } = useObservability();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'warning': return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Warning</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Live System Observability</h2>
          <div className={`w-3 h-3 rounded-full ${isSystemHealthy() ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signals (30m)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.signals_30m || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last: {kpis?.latest_signal ? new Date(kpis.latest_signal).toLocaleTimeString() : 'None'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders (30m)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.orders_30m || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last: {kpis?.latest_order ? new Date(kpis.latest_order).toLocaleTimeString() : 'None'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSystemHealthy() ? '🟢' : '🔴'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isSystemHealthy() ? 'All systems operational' : 'Issues detected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Trading</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">🚀</div>
            <p className="text-xs text-muted-foreground">
              Mode: Live • Threshold: 60
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Services section removed */}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/functions', '_blank')}
            >
              View Edge Functions
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/functions/aitradex1-trade-executor/logs', '_blank')}
            >
              Trade Executor Logs
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/sql/new', '_blank')}
            >
              SQL Editor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};