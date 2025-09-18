import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhitelistSettings {
  whitelist_enabled: boolean;
  whitelist_pairs: string[];
  max_symbols: number;
  auto_update: boolean;
  last_updated: string;
}

const DEFAULT_SETTINGS: WhitelistSettings = {
  whitelist_enabled: false,
  whitelist_pairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'BNBUSDT', 'XRPUSDT'],
  max_symbols: 2000,
  auto_update: false,
  last_updated: new Date().toISOString()
};

export function useWhitelistSettings() {
  const [settings, setSettings] = useState<WhitelistSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'trading_whitelist')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        setSettings(data.value as WhitelistSettings);
      } else {
        // Initialize with default settings
        await saveSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error loading whitelist settings:', error);
      toast({
        title: "Settings Error",
        description: "Failed to load whitelist settings, using defaults",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: WhitelistSettings) => {
    try {
      const updatedSettings = {
        ...newSettings,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'trading_whitelist',
          value: updatedSettings
        });

      if (error) throw error;

      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error saving whitelist settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save whitelist settings",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateWhitelistMode = async (enabled: boolean) => {
    const newSettings = { ...settings, whitelist_enabled: enabled };
    return await saveSettings(newSettings);
  };

  const addSymbol = async (symbol: string) => {
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    if (!normalizedSymbol.includes('USDT')) {
      toast({
        title: "Invalid Symbol",
        description: "Symbol must be a USDT pair",
        variant: "destructive",
      });
      return false;
    }

    if (settings.whitelist_pairs.includes(normalizedSymbol)) {
      toast({
        title: "Symbol Exists",
        description: "Symbol already in whitelist",
        variant: "destructive",
      });
      return false;
    }

    const newSettings = {
      ...settings,
      whitelist_pairs: [...settings.whitelist_pairs, normalizedSymbol]
    };
    
    return await saveSettings(newSettings);
  };

  const removeSymbol = async (symbol: string) => {
    const newSettings = {
      ...settings,
      whitelist_pairs: settings.whitelist_pairs.filter(s => s !== symbol)
    };
    
    return await saveSettings(newSettings);
  };

  const getSymbolsForScanning = () => {
    if (settings.whitelist_enabled && settings.whitelist_pairs.length > 0) {
      return settings.whitelist_pairs;
    }
    return null; // null indicates scan all symbols
  };

  const getScanConfig = () => {
    return {
      whitelist_enabled: settings.whitelist_enabled,
      symbols: getSymbolsForScanning(),
      max_symbols: settings.whitelist_enabled ? settings.whitelist_pairs.length : settings.max_symbols,
      scan_mode: settings.whitelist_enabled ? 'whitelist' : 'comprehensive'
    };
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    loadSettings,
    saveSettings,
    updateWhitelistMode,
    addSymbol,
    removeSymbol,
    getSymbolsForScanning,
    getScanConfig
  };
}