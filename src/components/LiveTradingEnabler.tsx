import React, { useState, useEffect } from 'react';
import { EnhancedTradeTest } from './EnhancedTradeTest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  Settings, 
  Shield, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Square,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface TradingSettings {
  live_trading_enabled: boolean;
  paper_trading: boolean;
  max_position_size: number;
  default_leverage: number;
  risk_per_trade: number;
}

interface TestTradeResult {
  success: boolean;
  trade_id?: string;
  paper_mode: boolean;
  message: string;
  result?: any;
}

export function LiveTradingEnabler() {
  const [settings, setSettings] = useState<TradingSettings>({
    live_trading_enabled: false,
    paper_trading: true,
    max_position_size: 100,
    default_leverage: 1,
    risk_per_trade: 2
  });
  
  const [systemStatus, setSystemStatus] = useState({
    database: false,
    edge_functions: false,
    bybit: false,
    credentials: false
  });
  
  const [testResult, setTestResult] = useState<TestTradeResult | null>(null);
  const [isTestingTrade, setIsTestingTrade] = useState(false);
  const [testSymbol, setTestSymbol] = useState('BTCUSDT');
  const [testAmount, setTestAmount] = useState(10);
  
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    checkSystemStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .in('key', [
          'live_trading_enabled',
          'paper_trading',
          'max_position_size',
          'default_leverage',
          'risk_per_trade'
        ]);

      if (data) {
        const settingsMap = data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});

        setSettings({
          live_trading_enabled: settingsMap.live_trading_enabled || false,
          paper_trading: settingsMap.paper_trading !== false,
          max_position_size: settingsMap.max_position_size || 100,
          default_leverage: settingsMap.default_leverage || 1,
          risk_per_trade: settingsMap.risk_per_trade || 2
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const checkSystemStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('diagnostics');
      
      if (!error && data?.success) {
        setSystemStatus({
          database: data.diagnostics.database.connected,
          edge_functions: Object.values(data.diagnostics.edge_functions).some((f: any) => f.available),
          bybit: data.diagnostics.bybit.connected,
          credentials: data.diagnostics.environment.bybit_keys.api_key && 
                      data.diagnostics.environment.bybit_keys.api_secret
        });
      }
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  };

  const updateSetting = async (key: keyof TradingSettings, value: any) => {
    try {
      await supabase
        .from('app_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        });

      setSettings(prev => ({ ...prev, [key]: value }));
      
      toast({
        title: "Settings Updated",
        description: `${key.replace('_', ' ')} has been updated successfully.`,
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const executeTestTrade = async (side: 'BUY' | 'SELL') => {
    setIsTestingTrade(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'execute_trade',
          symbol: testSymbol,
          side: side,
          amount_usd: testAmount,
          paper_mode: settings.paper_trading,
          leverage: settings.default_leverage
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setTestResult(data);
      
      toast({
        title: data.success ? "Trade Executed" : "Trade Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Test trade failed:', error);
      setTestResult({
        success: false,
        paper_mode: settings.paper_trading,
        message: error.message || 'Unknown error occurred'
      });
      
      toast({
        title: "Test Trade Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsTestingTrade(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? "Online" : "Offline"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(systemStatus.database)}
                <span className="text-sm">Database</span>
              </div>
              {getStatusBadge(systemStatus.database)}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(systemStatus.edge_functions)}
                <span className="text-sm">Functions</span>
              </div>
              {getStatusBadge(systemStatus.edge_functions)}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(systemStatus.bybit)}
                <span className="text-sm">Bybit API</span>
              </div>
              {getStatusBadge(systemStatus.bybit)}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(systemStatus.credentials)}
                <span className="text-sm">Credentials</span>
              </div>
              {getStatusBadge(systemStatus.credentials)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Trading Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Live Trading Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Live Trading</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable real money trading (requires API credentials)
                  </p>
                </div>
                <Switch
                  checked={settings.live_trading_enabled}
                  onCheckedChange={(checked) => updateSetting('live_trading_enabled', checked)}
                />
              </div>

              {/* Paper Trading Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Paper Trading Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Simulate trades without real money
                  </p>
                </div>
                <Switch
                  checked={settings.paper_trading}
                  onCheckedChange={(checked) => updateSetting('paper_trading', checked)}
                />
              </div>

              {/* Risk Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_position">Max Position ($)</Label>
                  <Input
                    id="max_position"
                    type="number"
                    value={settings.max_position_size}
                    onChange={(e) => updateSetting('max_position_size', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leverage">Default Leverage</Label>
                  <Input
                    id="leverage"
                    type="number"
                    min="1"
                    max="20"
                    value={settings.default_leverage}
                    onChange={(e) => updateSetting('default_leverage', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk">Risk per Trade (%)</Label>
                  <Input
                    id="risk"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={settings.risk_per_trade}
                    onChange={(e) => updateSetting('risk_per_trade', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <EnhancedTradeTest />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Live System Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Real-time monitoring dashboard coming soon...
                </p>
                <Button
                  onClick={checkSystemStatus}
                  variant="outline"
                  className="mt-4"
                >
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}