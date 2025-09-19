import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, List, Globe, Settings2 } from 'lucide-react';

interface WhitelistSettings {
  whitelist_enabled: boolean;
  whitelist_pairs: string[];
  max_symbols: number;
  auto_update: boolean;
  last_updated: string;
}

export function WhitelistManager() {
  const [settings, setSettings] = useState<WhitelistSettings>({
    whitelist_enabled: false,
    whitelist_pairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'BNBUSDT', 'XRPUSDT', 'AVAXUSDT', 'MATICUSDT', 'LINKUSDT'],
    max_symbols: 10,
    auto_update: false,
    last_updated: new Date().toISOString()
  });
  
  const [newSymbol, setNewSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadWhitelistSettings();
  }, []);

  const loadWhitelistSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'trading_whitelist')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        const parsedValue = data.value as any;
        setSettings({
          whitelist_enabled: parsedValue?.whitelist_enabled || false,
          whitelist_pairs: parsedValue?.whitelist_pairs || [],
          max_symbols: parsedValue?.max_symbols || 2000,
          auto_update: parsedValue?.auto_update || true,
          last_updated: parsedValue?.last_updated || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading whitelist settings:', error);
      toast({
        title: "Error Loading Settings",
        description: "Failed to load whitelist configuration",
        variant: "destructive",
      });
    }
  };

  const saveWhitelistSettings = async (newSettings: WhitelistSettings) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'trading_whitelist',
          value: { ...newSettings, last_updated: new Date().toISOString() }
        });

      if (error) throw error;

      setSettings(newSettings);
      toast({
        title: "Settings Saved",
        description: `Whitelist mode ${newSettings.whitelist_enabled ? 'enabled' : 'disabled'} with ${newSettings.whitelist_pairs.length} symbols`,
      });
    } catch (error) {
      console.error('Error saving whitelist settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save whitelist configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWhitelistMode = async () => {
    const newSettings = {
      ...settings,
      whitelist_enabled: !settings.whitelist_enabled
    };
    await saveWhitelistSettings(newSettings);
  };

  const addSymbol = async () => {
    if (!newSymbol.trim()) return;

    const symbol = newSymbol.toUpperCase().trim();
    if (!symbol.includes('USDT')) {
      toast({
        title: "Invalid Symbol",
        description: "Please enter a valid USDT pair (e.g., BTCUSDT)",
        variant: "destructive",
      });
      return;
    }

    if (settings.whitelist_pairs.includes(symbol)) {
      toast({
        title: "Symbol Exists",
        description: "This symbol is already in the whitelist",
        variant: "destructive",
      });
      return;
    }

    const newSettings = {
      ...settings,
      whitelist_pairs: [...settings.whitelist_pairs, symbol]
    };
    
    await saveWhitelistSettings(newSettings);
    setNewSymbol('');
  };

  const removeSymbol = async (symbolToRemove: string) => {
    const newSettings = {
      ...settings,
      whitelist_pairs: settings.whitelist_pairs.filter(symbol => symbol !== symbolToRemove)
    };
    await saveWhitelistSettings(newSettings);
  };

  const loadTopSymbols = async () => {
    setIsLoading(true);
    try {
      // Get most active symbols from recent market data
      const { data, error } = await supabase
        .from('live_market_data')
        .select('symbol, volume_quote')
        .eq('exchange', 'bybit')
        .not('volume_quote', 'is', null)
        .order('volume_quote', { ascending: false })
        .limit(20);

      if (error) throw error;

      const topSymbols = data?.map(item => item.symbol).filter(symbol => 
        symbol.includes('USDT') && !settings.whitelist_pairs.includes(symbol)
      ).slice(0, 10) || [];

      const newSettings = {
        ...settings,
        whitelist_pairs: [...new Set([...settings.whitelist_pairs, ...topSymbols])]
      };

      await saveWhitelistSettings(newSettings);
      
      toast({
        title: "Top Symbols Added",
        description: `Added ${topSymbols.length} high-volume symbols to whitelist`,
      });
    } catch (error) {
      console.error('Error loading top symbols:', error);
      toast({
        title: "Failed to Load Symbols",
        description: "Could not fetch top symbols from market data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearWhitelist = async () => {
    const newSettings = {
      ...settings,
      whitelist_pairs: []
    };
    await saveWhitelistSettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Symbol Whitelist Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Whitelist Mode Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {settings.whitelist_enabled ? (
                  <List className="h-4 w-4 text-blue-600" />
                ) : (
                  <Globe className="h-4 w-4 text-green-600" />
                )}
                <Label htmlFor="whitelist-mode" className="font-medium">
                  {settings.whitelist_enabled ? 'Whitelist Mode' : 'Comprehensive Mode'}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {settings.whitelist_enabled 
                  ? `Scan only ${settings.whitelist_pairs.length} whitelisted symbols`
                  : 'Scan all available USDT pairs (2000+ symbols)'
                }
              </p>
            </div>
            <Switch
              id="whitelist-mode"
              checked={settings.whitelist_enabled}
              onCheckedChange={toggleWhitelistMode}
              disabled={isLoading}
            />
          </div>

          {/* Whitelist Controls */}
          {settings.whitelist_enabled && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter symbol (e.g., BTCUSDT)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                  className="flex-1"
                />
                <Button onClick={addSymbol} disabled={isLoading || !newSymbol.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={loadTopSymbols} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                >
                  Add Top 10 Symbols
                </Button>
                <Button 
                  onClick={clearWhitelist} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading || settings.whitelist_pairs.length === 0}
                >
                  Clear All
                </Button>
              </div>

              {/* Symbol List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Whitelisted Symbols ({settings.whitelist_pairs.length})</h4>
                  <Badge variant="outline" className="text-xs">
                    {settings.whitelist_pairs.length} / ∞
                  </Badge>
                </div>
                
                {settings.whitelist_pairs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No symbols in whitelist. Add symbols above or switch to comprehensive mode.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                    {settings.whitelist_pairs.map((symbol) => (
                      <div key={symbol} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span className="text-sm font-mono">{symbol}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSymbol(symbol)}
                          className="h-6 w-6 p-0 hover:bg-destructive/20"
                          disabled={isLoading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scanner Impact */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Scanner Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Mode:</span>
                <span className="ml-2 font-medium">
                  {settings.whitelist_enabled ? 'Whitelist' : 'Comprehensive'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Symbols Scanned:</span>
                <span className="ml-2 font-medium">
                  {settings.whitelist_enabled ? settings.whitelist_pairs.length : '2000+'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Expected Signals:</span>
                <span className="ml-2 font-medium">
                  {settings.whitelist_enabled ? '5-20' : '50-200'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Scan Speed:</span>
                <span className="ml-2 font-medium">
                  {settings.whitelist_enabled ? 'Fast (~30s)' : 'Slower (~2-5min)'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}