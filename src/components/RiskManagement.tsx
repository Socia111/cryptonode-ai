import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown,
  DollarSign,
  Percent,
  Target,
  StopCircle,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RiskSettings {
  maxPositionSize: number;
  maxLeverage: number;
  stopLossEnabled: boolean;
  takeProfitEnabled: boolean;
  maxDailyLoss: number;
  maxDailyTrades: number;
  riskPerTrade: number;
  autoStopLoss: boolean;
  emergencyStopLoss: number;
  correlationLimit: number;
}

export function RiskManagement() {
  const [settings, setSettings] = useState<RiskSettings>({
    maxPositionSize: 1000,
    maxLeverage: 20,
    stopLossEnabled: true,
    takeProfitEnabled: true,
    maxDailyLoss: 500,
    maxDailyTrades: 10,
    riskPerTrade: 2,
    autoStopLoss: true,
    emergencyStopLoss: 10,
    correlationLimit: 3
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const updateSetting = (key: keyof RiskSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Here you would save to Supabase or your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Saved",
        description: "Risk management settings have been updated",
      });
      
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      maxPositionSize: 1000,
      maxLeverage: 20,
      stopLossEnabled: true,
      takeProfitEnabled: true,
      maxDailyLoss: 500,
      maxDailyTrades: 10,
      riskPerTrade: 2,
      autoStopLoss: true,
      emergencyStopLoss: 10,
      correlationLimit: 3
    });
    setHasChanges(true);
    
    toast({
      title: "Settings Reset",
      description: "Risk management settings reset to defaults",
    });
  };

  const riskLevel = settings.riskPerTrade <= 1 ? 'low' : 
                   settings.riskPerTrade <= 3 ? 'medium' : 'high';

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success';
      case 'medium': return 'text-warning';
      case 'high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="surface-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Risk Management & Trading Controls
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure automated risk controls and position management settings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${getRiskColor(riskLevel)} border-current`}>
                {riskLevel.toUpperCase()} RISK
              </Badge>
              {hasChanges && (
                <Badge className="bg-warning/20 text-warning border-warning/30">
                  Unsaved Changes
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="position" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="position">Position Limits</TabsTrigger>
          <TabsTrigger value="stops">Stop Management</TabsTrigger>
          <TabsTrigger value="daily">Daily Limits</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Controls</TabsTrigger>
        </TabsList>

        {/* Position Limits */}
        <TabsContent value="position" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Position Size Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Maximum Position Size (USD)</Label>
                  <Input
                    type="number"
                    value={settings.maxPositionSize}
                    onChange={(e) => updateSetting('maxPositionSize', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum notional value for any single position
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Maximum Leverage: {settings.maxLeverage}x</Label>
                  <Slider
                    value={[settings.maxLeverage]}
                    onValueChange={(value) => updateSetting('maxLeverage', value[0])}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum leverage allowed for any position
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Risk Per Trade: {settings.riskPerTrade}%</Label>
                  <Slider
                    value={[settings.riskPerTrade]}
                    onValueChange={(value) => updateSetting('riskPerTrade', value[0])}
                    max={10}
                    min={0.5}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum percentage of account to risk per trade
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Maximum Correlated Positions</Label>
                  <Input
                    type="number"
                    value={settings.correlationLimit}
                    onChange={(e) => updateSetting('correlationLimit', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of positions in correlated assets
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold">${settings.maxPositionSize.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Max Position</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Percent className="h-6 w-6 mx-auto mb-2 text-warning" />
                    <div className="text-lg font-bold">{settings.riskPerTrade}%</div>
                    <div className="text-xs text-muted-foreground">Risk/Trade</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Current Risk Level</span>
                      <Badge className={`${getRiskColor(riskLevel)} border-current`}>
                        {riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {riskLevel === 'low' && 'Conservative approach with minimal risk exposure'}
                      {riskLevel === 'medium' && 'Balanced risk-reward strategy'}
                      {riskLevel === 'high' && 'Aggressive strategy with higher risk exposure'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Max Portfolio Risk</span>
                      <span className={getRiskColor(riskLevel)}>
                        {(settings.riskPerTrade * settings.maxDailyTrades).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Leverage Multiplier</span>
                      <span>{settings.maxLeverage}x</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Daily Exposure Limit</span>
                      <span>${(settings.maxPositionSize * settings.maxDailyTrades).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stop Management */}
        <TabsContent value="stops" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Automated Stop Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="stop-loss">Enable Stop Loss</Label>
                    <p className="text-xs text-muted-foreground">Automatically set stop losses on new positions</p>
                  </div>
                  <Switch
                    id="stop-loss"
                    checked={settings.stopLossEnabled}
                    onCheckedChange={(checked) => updateSetting('stopLossEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="take-profit">Enable Take Profit</Label>
                    <p className="text-xs text-muted-foreground">Automatically set take profit levels</p>
                  </div>
                  <Switch
                    id="take-profit"
                    checked={settings.takeProfitEnabled}
                    onCheckedChange={(checked) => updateSetting('takeProfitEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-stop">Auto Stop Loss Adjustment</Label>
                    <p className="text-xs text-muted-foreground">Adjust stops based on market volatility</p>
                  </div>
                  <Switch
                    id="auto-stop"
                    checked={settings.autoStopLoss}
                    onCheckedChange={(checked) => updateSetting('autoStopLoss', checked)}
                  />
                </div>

                {settings.stopLossEnabled && (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <StopCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">Stop Loss Active</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Positions will automatically include stop loss orders based on ATR and volatility
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Stop Loss Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Default Stop Loss Distance</Label>
                  <div className="flex gap-2">
                    <Input placeholder="2.5" />
                    <Button variant="outline" size="sm">ATR</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Distance from entry in ATR multiples
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Take Profit Ratio</Label>
                  <Input placeholder="2.0" />
                  <p className="text-xs text-muted-foreground">
                    Risk-reward ratio for take profit (2:1 = 2.0)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Trailing Stop Distance</Label>
                  <Input placeholder="1.5" />
                  <p className="text-xs text-muted-foreground">
                    Distance for trailing stops in ATR multiples
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Daily Limits */}
        <TabsContent value="daily" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Daily Trading Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Maximum Daily Loss (USD)</Label>
                  <Input
                    type="number"
                    value={settings.maxDailyLoss}
                    onChange={(e) => updateSetting('maxDailyLoss', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Trading will be suspended after this loss amount
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Maximum Daily Trades</Label>
                  <Input
                    type="number"
                    value={settings.maxDailyTrades}
                    onChange={(e) => updateSetting('maxDailyTrades', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of trades per day
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <TrendingDown className="h-5 w-5 mx-auto mb-2 text-destructive" />
                    <div className="text-lg font-bold">${settings.maxDailyLoss}</div>
                    <div className="text-xs text-muted-foreground">Max Loss</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold">{settings.maxDailyTrades}</div>
                    <div className="text-xs text-muted-foreground">Max Trades</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Today's Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Trades Executed</span>
                    <span className="font-medium">3 / {settings.maxDailyTrades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Current P&L</span>
                    <span className="font-medium text-success">+$234.56</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Remaining Loss Buffer</span>
                    <span className="font-medium">${settings.maxDailyLoss - 0}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium">Risk Status: Normal</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All risk limits are being respected. Trading can continue normally.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emergency Controls */}
        <TabsContent value="emergency" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Emergency Stop Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Emergency Stop Loss (%)</Label>
                  <Input
                    type="number"
                    value={settings.emergencyStopLoss}
                    onChange={(e) => updateSetting('emergencyStopLoss', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Portfolio-wide stop loss percentage
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">Emergency Actions</span>
                  </div>
                  <div className="space-y-2">
                    <Button variant="destructive" size="sm" className="w-full">
                      Close All Positions
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      Pause Auto Trading
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Risk Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Portfolio Drawdown</span>
                    <span className="font-medium text-success">-2.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Max Drawdown Limit</span>
                    <span className="font-medium">-{settings.emergencyStopLoss}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Open Positions</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Exposure</span>
                    <span className="font-medium">$2,847</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Auto-Protection Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automated risk controls are monitoring all positions and will trigger emergency actions if limits are breached.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Controls */}
      <Card className="surface-elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={saveSettings}
                disabled={!hasChanges || isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Button
                onClick={resetToDefaults}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
            
            {hasChanges && (
              <p className="text-sm text-muted-foreground">
                You have unsaved changes
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}