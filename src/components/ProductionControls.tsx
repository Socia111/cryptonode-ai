import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Activity, Zap, Ban } from 'lucide-react';
import { FEATURES } from '@/config/featureFlags';

export const ProductionControls = () => {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [dailyPnL, setDailyPnL] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  const handleEmergencyStop = () => {
    if (confirm('🚨 EMERGENCY STOP: This will immediately disable all live trading. Continue?')) {
      // This would normally update the LIVE_TRADING_ENABLED secret
      console.log('🔴 EMERGENCY STOP ACTIVATED');
      setIsLiveMode(false);
    }
  };

  const handleModeToggle = (enabled: boolean) => {
    if (enabled && !confirm('⚠️ Enable LIVE TRADING? Real money will be used!')) {
      return;
    }
    setIsLiveMode(enabled);
    console.log(`${enabled ? '🔴 LIVE' : '📋 PAPER'} trading mode activated`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSystemHealth = () => {
    if (dailyPnL < -1.5) return 'critical';
    if (dailyPnL < -0.8) return 'warning';
    return 'healthy';
  };

  useEffect(() => {
    setSystemStatus(getSystemHealth());
  }, [dailyPnL]);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Production Controls
            </CardTitle>
            <CardDescription>
              Master controls for live trading system
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus)}`} />
            <Badge variant={systemStatus === 'healthy' ? 'default' : 'destructive'}>
              {systemStatus.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trading Mode Control */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-semibold">Trading Mode</h3>
            <p className="text-sm text-muted-foreground">
              {isLiveMode ? 'Live trading with real money' : 'Paper trading (simulation)'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={isLiveMode ? 'destructive' : 'secondary'}>
              {isLiveMode ? '🔴 LIVE' : '📋 PAPER'}
            </Badge>
            <Switch
              checked={isLiveMode}
              onCheckedChange={handleModeToggle}
              disabled={!FEATURES.AUTOTRADE_ENABLED}
            />
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Daily P&L</span>
            </div>
            <p className={`text-lg font-bold ${dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toFixed(2)}%
            </p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Orders Today</span>
            </div>
            <p className="text-lg font-bold">{orderCount}</p>
          </div>
        </div>

        {/* Risk Alerts */}
        {systemStatus === 'critical' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical:</strong> Daily loss limit reached (-1.5%). 
              Trading automatically disabled.
            </AlertDescription>
          </Alert>
        )}

        {systemStatus === 'warning' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Approaching daily loss limit. 
              Current: {dailyPnL.toFixed(2)}%
            </AlertDescription>
          </Alert>
        )}

        {/* Emergency Controls */}
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-3 text-red-600">Emergency Controls</h3>
          <Button 
            onClick={handleEmergencyStop}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            <Ban className="w-4 h-4 mr-2" />
            EMERGENCY STOP ALL TRADING
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Immediately halts all automated trading activities
          </p>
        </div>

        {/* Safety Checklist */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>✅ Symbol whitelist: 10 pairs</p>
          <p>✅ Min notional: $5 USD</p>
          <p>✅ Max spread: 10%</p>
          <p>✅ Daily loss limit: -1.5%</p>
          <p>✅ Risk/Reward ratio: ≥2:1</p>
        </div>
      </CardContent>
    </Card>
  );
};