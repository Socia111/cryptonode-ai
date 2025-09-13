import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { tradingSettings, TradingSettings } from '@/lib/tradingSettings';
import { useToast } from '@/components/ui/use-toast';

export function TradingSettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<TradingSettings>(tradingSettings.getSettings());

  React.useEffect(() => {
    const unsubscribe = tradingSettings.subscribe(setSettings);
    return unsubscribe;
  }, []);

  const handleUpdate = (updates: Partial<TradingSettings>) => {
    tradingSettings.updateSettings(updates);
    toast({
      title: "Settings Updated",
      description: "Trading settings have been saved successfully.",
    });
  };

  const resetToDefaults = () => {
    tradingSettings.updateSettings({
      defaultSLPercent: 2,
      defaultTPPercent: 4,
      useScalpingMode: false,
      orderType: 'limit',
      maxLeverage: 100,
      excludeInnovationZone: true
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
                value={settings.defaultSLPercent}
                onChange={(e) => handleUpdate({ defaultSLPercent: Number(e.target.value) })}
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
                value={settings.defaultTPPercent}
                onChange={(e) => handleUpdate({ defaultTPPercent: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="scalpingMode"
              checked={settings.useScalpingMode}
              onCheckedChange={(checked) => handleUpdate({ useScalpingMode: checked })}
            />
            <Label htmlFor="scalpingMode">Enable Scalping Mode (0.5% TP / 0.15% SL)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="excludeInnovationZone"
              checked={settings.excludeInnovationZone}
              onCheckedChange={(checked) => handleUpdate({ excludeInnovationZone: checked })}
            />
            <Label htmlFor="excludeInnovationZone">Exclude Innovation Zone Pairs (Higher fees & risk)</Label>
          </div>
        </div>

        {/* Order Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Order Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderType">Default Order Type</Label>
              <Select
                value={settings.orderType}
                onValueChange={(value: 'market' | 'limit') => handleUpdate({ orderType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="limit">Limit Order</SelectItem>
                  <SelectItem value="market">Market Order</SelectItem>
                </SelectContent>
              </Select>
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
                ${(45000 * (1 + (settings.useScalpingMode ? 0.5 : settings.defaultTPPercent) / 100)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Stop Loss:</span>
              <span className="font-mono">
                ${(45000 * (1 - (settings.useScalpingMode ? 0.15 : settings.defaultSLPercent) / 100)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>Risk/Reward:</span>
              <span className="font-mono">
                1:{((settings.useScalpingMode ? 0.5 : settings.defaultTPPercent) / (settings.useScalpingMode ? 0.15 : settings.defaultSLPercent)).toFixed(1)}
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