import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Target, TrendingUp, Shield } from 'lucide-react';

interface AutoTradeSettings {
  enabled: boolean;
  priorityOnly: boolean;
  minScore: number;
  maxSpreadBps: number;
  defaultAmountUSD: number;
  defaultLeverage: number;
  maxConcurrentTrades: number;
}

export default function AutoTradeSettings() {
  const [settings, setSettings] = useState<AutoTradeSettings>({
    enabled: false,
    priorityOnly: true,
    minScore: 85,
    maxSpreadBps: 20,
    defaultAmountUSD: 10,
    defaultLeverage: 2,
    maxConcurrentTrades: 3
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('autoTradeSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to parse auto-trade settings');
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('autoTradeSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: keyof AutoTradeSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Auto-Trade Settings
          {settings.enabled && (
            <Badge variant="success" className="ml-auto">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Auto-Execute Trades</Label>
            <p className="text-xs text-muted-foreground">
              Automatically execute qualifying signals
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSetting('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Priority Only */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Top Picks Only
                </Label>
                <p className="text-xs text-muted-foreground">
                  Execute only highest-scoring signals
                </p>
              </div>
              <Switch
                checked={settings.priorityOnly}
                onCheckedChange={(checked) => updateSetting('priorityOnly', checked)}
              />
            </div>

            {/* Min Score */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Minimum Score: {settings.minScore}%
              </Label>
              <Slider
                value={[settings.minScore]}
                onValueChange={([value]) => updateSetting('minScore', value)}
                min={70}
                max={95}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>70%</span>
                <span>95%</span>
              </div>
            </div>

            {/* Max Spread */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Max Spread: {settings.maxSpreadBps} bps
              </Label>
              <Slider
                value={[settings.maxSpreadBps]}
                onValueChange={([value]) => updateSetting('maxSpreadBps', value)}
                min={10}
                max={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 bps</span>
                <span>50 bps</span>
              </div>
            </div>

            {/* Trade Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Amount ($)</Label>
                <Input
                  type="number"
                  value={settings.defaultAmountUSD}
                  onChange={(e) => updateSetting('defaultAmountUSD', Number(e.target.value))}
                  min={1}
                  max={1000}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Leverage</Label>
                <Input
                  type="number"
                  value={settings.defaultLeverage}
                  onChange={(e) => updateSetting('defaultLeverage', Number(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>
            </div>

            {/* Max Concurrent */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Max Concurrent Trades</Label>
              <Input
                type="number"
                value={settings.maxConcurrentTrades}
                onChange={(e) => updateSetting('maxConcurrentTrades', Number(e.target.value))}
                min={1}
                max={10}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { type AutoTradeSettings };