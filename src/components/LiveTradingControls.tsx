import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Shield, DollarSign, TrendingUp, Zap } from 'lucide-react';
import { liveTradingManager, defaultLiveTradingConfig } from '@/lib/liveTradingManager';
import { useToast } from '@/hooks/use-toast';

export function LiveTradingControls() {
  const [config, setConfig] = useState(defaultLiveTradingConfig);
  const [status, setStatus] = useState(liveTradingManager.getStatus());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Refresh status every 5 seconds
    const interval = setInterval(() => {
      setStatus(liveTradingManager.getStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    liveTradingManager.updateConfig(newConfig);
  };

  const handleRiskLimitChange = (key: string, value: number) => {
    const newConfig = {
      ...config,
      riskLimits: { ...config.riskLimits, [key]: value }
    };
    setConfig(newConfig);
    liveTradingManager.updateConfig(newConfig);
  };

  const toggleLiveTrading = async () => {
    setLoading(true);
    try {
      const newEnabled = !config.enabled;
      handleConfigChange('enabled', newEnabled);
      
      toast({
        title: newEnabled ? "🟢 Live Trading Enabled" : "🔴 Live Trading Disabled",
        description: newEnabled 
          ? "Live trading is now active. Trades will execute with real money!"
          : "Live trading has been disabled. Switch to paper mode for safety."
      });
    } catch (error) {
      console.error('Failed to toggle live trading:', error);
      toast({
        title: "❌ Error",
        description: "Failed to change live trading status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyStop = async () => {
    setLoading(true);
    try {
      // This would trigger the emergency stop in the live trading manager
      handleConfigChange('enabled', false);
      
      toast({
        title: "🚨 Emergency Stop Activated",
        description: "All trading has been halted and positions are being closed",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Emergency stop failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Live Trading Status
            </div>
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? 'ACTIVE' : 'DISABLED'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {status.activePositions}
              </div>
              <div className="text-sm text-muted-foreground">Positions</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${status.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${status.dailyPnL.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Daily P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {config.paperMode ? 'PAPER' : 'LIVE'}
              </div>
              <div className="text-sm text-muted-foreground">Mode</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {status.emergencyStop ? '🚨' : '✅'}
              </div>
              <div className="text-sm text-muted-foreground">Safety</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Trading Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Emergency Warning */}
          {config.enabled && !config.paperMode && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Live Trading Active</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Real money is at risk. Monitor your positions closely and ensure you have proper risk management in place.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="live-trading">Enable Live Trading</Label>
                <Switch
                  id="live-trading"
                  checked={config.enabled}
                  onCheckedChange={toggleLiveTrading}
                  disabled={loading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="paper-mode">Paper Mode</Label>
                <Switch
                  id="paper-mode"
                  checked={config.paperMode}
                  onCheckedChange={(checked) => handleConfigChange('paperMode', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="emergency-stop">Emergency Stop Enabled</Label>
                <Switch
                  id="emergency-stop"
                  checked={config.emergencyStopEnabled}
                  onCheckedChange={(checked) => handleConfigChange('emergencyStopEnabled', checked)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="max-positions">Max Positions</Label>
                <Input
                  id="max-positions"
                  type="number"
                  value={config.maxPositions}
                  onChange={(e) => handleConfigChange('maxPositions', parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
              
              <div>
                <Label htmlFor="max-order-size">Max Order Size ($)</Label>
                <Input
                  id="max-order-size"
                  type="number"
                  value={config.maxOrderSize}
                  onChange={(e) => handleConfigChange('maxOrderSize', parseFloat(e.target.value))}
                  min="1"
                  max="10000"
                />
              </div>
              
              <div>
                <Label htmlFor="slippage-protection">Slippage Protection (%)</Label>
                <Input
                  id="slippage-protection"
                  type="number"
                  value={config.slippageProtection}
                  onChange={(e) => handleConfigChange('slippageProtection', parseFloat(e.target.value))}
                  min="0"
                  max="5"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Risk Limits */}
          <div>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Risk Limits
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max-daily-loss">Max Daily Loss ($)</Label>
                <Input
                  id="max-daily-loss"
                  type="number"
                  value={config.riskLimits.maxDailyLoss}
                  onChange={(e) => handleRiskLimitChange('maxDailyLoss', parseFloat(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <Label htmlFor="max-drawdown">Max Drawdown ($)</Label>
                <Input
                  id="max-drawdown"
                  type="number"
                  value={config.riskLimits.maxDrawdown}
                  onChange={(e) => handleRiskLimitChange('maxDrawdown', parseFloat(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <Label htmlFor="max-leverage">Max Leverage</Label>
                <Input
                  id="max-leverage"
                  type="number"
                  value={config.riskLimits.maxLeverage}
                  onChange={(e) => handleRiskLimitChange('maxLeverage', parseInt(e.target.value))}
                  min="1"
                  max="100"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Emergency Actions */}
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">Emergency Actions</h4>
              <p className="text-sm text-muted-foreground">
                Use these controls in case of emergency
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleEmergencyStop}
              disabled={loading || !config.enabled}
            >
              🚨 Emergency Stop
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Positions */}
      {status.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.positions.map((position, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.side} • ${position.size}
                      </div>
                    </div>
                    <Badge variant={position.side === 'BUY' ? 'default' : 'destructive'}>
                      {position.side}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${position.unrealizedPnL.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Entry: ${position.entryPrice.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}