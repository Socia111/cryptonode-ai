import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { tradingSettings, type Settings } from '@/lib/tradingSettings';
import { useToast } from '@/components/ui/use-toast';

export function TradingSettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<Settings>(tradingSettings.getSettings());

  React.useEffect(() => {
    const unsubscribe = tradingSettings.subscribe(setSettings);
    return unsubscribe;
  }, []);

  const handleUpdate = (updates: Partial<Settings>) => {
    tradingSettings.updateSettings(updates);
    toast({
      title: "Settings Updated",
      description: "Trading settings have been saved successfully.",
    });
  };

  const resetToDefaults = () => {
    tradingSettings.updateSettings({
      defaultSLPct: 0.0075,
      defaultTPPct: 0.0150,
      scalpSLPct: 0.0035,
      scalpTPPct: 0.0070,
      maxLeverage: 100
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
                min="0.001"
                max="0.1"
                step="0.001"
                value={settings.defaultSLPct}
                onChange={(e) => handleUpdate({ defaultSLPct: Number(e.target.value) })}
              />
              <div className="text-xs text-muted-foreground">
                Current: {(settings.defaultSLPct * 100).toFixed(2)}%
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tpPercent">Default Take Profit (%)</Label>
              <Input
                id="tpPercent"
                type="number"
                min="0.001"
                max="0.2"
                step="0.001"
                value={settings.defaultTPPct}
                onChange={(e) => handleUpdate({ defaultTPPct: Number(e.target.value) })}
              />
              <div className="text-xs text-muted-foreground">
                Current: {(settings.defaultTPPct * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scalpSL">Scalp Stop Loss (%)</Label>
              <Input
                id="scalpSL"
                type="number"
                min="0.001"
                max="0.05"
                step="0.001"
                value={settings.scalpSLPct}
                onChange={(e) => handleUpdate({ scalpSLPct: Number(e.target.value) })}
              />
              <div className="text-xs text-muted-foreground">
                Current: {(settings.scalpSLPct * 100).toFixed(2)}%
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scalpTP">Scalp Take Profit (%)</Label>
              <Input
                id="scalpTP"
                type="number"
                min="0.001"
                max="0.1"
                step="0.001"
                value={settings.scalpTPPct}
                onChange={(e) => handleUpdate({ scalpTPPct: Number(e.target.value) })}
              />
              <div className="text-xs text-muted-foreground">
                Current: {(settings.scalpTPPct * 100).toFixed(2)}%
              </div>
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

        {/* Preview */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Preview (BTC @ $45,000)</h4>
          <div className="text-xs space-y-1">
            <div className="font-semibold">Normal Mode:</div>
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
            
            <div className="font-semibold mt-2">Scalp Mode:</div>
            <div className="flex justify-between text-green-600">
              <span>Take Profit:</span>
              <span className="font-mono">
                ${(45000 * (1 + settings.scalpTPPct)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Stop Loss:</span>
              <span className="font-mono">
                ${(45000 * (1 - settings.scalpSLPct)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>Risk/Reward:</span>
              <span className="font-mono">
                1:{(settings.scalpTPPct / settings.scalpSLPct).toFixed(1)}
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