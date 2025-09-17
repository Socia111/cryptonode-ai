import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { tradingSettings } from '@/lib/tradingSettings';
import { useToast } from '@/components/ui/use-toast';

export function TradingSettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState(tradingSettings.getSettings());

  React.useEffect(() => {
    const unsubscribe = tradingSettings.subscribe(setSettings);
    return unsubscribe;
  }, []);

  const handleUpdate = (updates: any) => {
    tradingSettings.updateSettings(updates);
    toast({
      title: "Settings Updated",
      description: "Trading settings have been saved successfully.",
    });
  };

  const resetToDefaults = () => {
    tradingSettings.updateSettings({
      defaultSLPct: 0.02,
      defaultTPPct: 0.04,
      scalpSLPct: 0.01,
      scalpTPPct: 0.02,
      maxLeverage: 25
    });
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚙️ Global Trading Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Management */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Risk Management</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slPercent">Default Stop Loss (%)</Label>
              <Input
                id="slPercent"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={(settings.defaultSLPct * 100).toFixed(2)}
                onChange={(e) => handleUpdate({ defaultSLPct: Number(e.target.value) / 100 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tpPercent">Default Take Profit (%)</Label>
              <Input
                id="tpPercent"
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={(settings.defaultTPPct * 100).toFixed(2)}
                onChange={(e) => handleUpdate({ defaultTPPct: Number(e.target.value) / 100 })}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Scalping mode uses smaller percentages: {(settings.scalpSLPct * 100).toFixed(2)}% SL / {(settings.scalpTPPct * 100).toFixed(2)}% TP
          </div>
        </div>

        {/* Order Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Order Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderMode">Order Mode</Label>
              <div className="text-sm text-muted-foreground">
                Market orders are used for immediate execution
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxLeverage">Max Leverage</Label>
              <Input
                id="maxLeverage"
                type="number"
                min="1"
                max="100"
                value={settings.maxLeverage}
                onChange={(e) => handleUpdate({ maxLeverage: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Preview (BTC @ $45,000)</h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Entry Price:</span>
              <span className="font-mono">$45,000.00</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Take Profit:</span>
              <span className="font-mono">
                ${(45000 * (1 + settings.defaultTPPct)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Stop Loss:</span>
              <span className="font-mono">
                ${(45000 * (1 - settings.defaultSLPct)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>Risk/Reward:</span>
              <span className="font-mono">
                1:{(settings.defaultTPPct / settings.defaultSLPct).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={resetToDefaults} variant="outline" size="sm">
            Reset to Defaults
          </Button>
          <div className="text-xs text-muted-foreground flex-1 flex items-center">
            Settings are automatically saved and applied to all new trades
          </div>
        </div>
      </CardContent>
    </Card>
  );
}