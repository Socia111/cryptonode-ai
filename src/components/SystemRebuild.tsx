import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, RefreshCw, Settings, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const SystemRebuild = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildResults, setRebuildResults] = useState<any>(null);
  const [apiCredentials, setApiCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    useTestnet: true
  });
  const { toast } = useToast();

  const runSystemDiagnostics = async () => {
    setIsRebuilding(true);
    const results = {
      authentication: { status: 'checking', details: '' },
      tradingAccounts: { status: 'checking', details: '', count: 0, accounts: [] as any[] },
      apiConnectivity: { status: 'checking', details: '' },
      signals: { status: 'checking', details: '', count: 0 },
      recommendations: [] as string[]
    };

    try {
      // 1. Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        results.authentication = {
          status: 'success',
          details: `Authenticated as ${session.user.email}`
        };

        // 2. Check trading accounts
        const { data: accounts, error: accountsError } = await supabase
          .from('user_trading_accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('exchange', 'bybit');

        if (accountsError) {
          results.tradingAccounts = {
            status: 'error',
            details: `Database error: ${accountsError.message}`,
            count: 0,
            accounts: []
          };
        } else {
          const activeAccounts = accounts?.filter(acc => acc.is_active) || [];
          results.tradingAccounts = {
            status: activeAccounts.length > 0 ? 'success' : 'warning',
            details: `Found ${accounts?.length || 0} total accounts, ${activeAccounts.length} active`,
            count: activeAccounts.length,
            accounts: accounts || []
          };
        }

        // 3. Test API connectivity
        try {
          const { data: debugResult, error: debugError } = await supabase.functions.invoke('debug-bybit-api');
          if (debugError) {
            results.apiConnectivity = {
              status: 'error',
              details: `API test failed: ${debugError.message}`
            };
          } else {
            results.apiConnectivity = {
              status: debugResult?.bybit_connectivity ? 'success' : 'warning',
              details: `Credentials: ${debugResult?.credentials_available ? '✅' : '❌'}, Connection: ${debugResult?.bybit_connectivity ? '✅' : '❌'}`
            };
          }
        } catch (e) {
          results.apiConnectivity = {
            status: 'error',
            details: `API test exception: ${e.message}`
          };
        }

        // 4. Check signals
        const { data: signals, error: signalsError } = await supabase
          .from('signals')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (signalsError) {
          results.signals = {
            status: 'error',
            details: `Signals query failed: ${signalsError.message}`,
            count: 0
          };
        } else {
          const highConfidenceSignals = signals?.filter(s => s.score >= 80) || [];
          results.signals = {
            status: highConfidenceSignals.length > 0 ? 'success' : 'warning',
            details: `${signals?.length || 0} recent signals, ${highConfidenceSignals.length} high confidence`,
            count: highConfidenceSignals.length
          };
        }

      } else {
        results.authentication = {
          status: 'error',
          details: 'No authenticated user found'
        };
      }

      // Generate recommendations
      if (results.authentication.status === 'error') {
        results.recommendations.push('Sign in to your account');
      }
      if (results.tradingAccounts.count === 0) {
        results.recommendations.push('Connect your Bybit API credentials');
      }
      if (results.apiConnectivity.status !== 'success') {
        results.recommendations.push('Fix API connectivity issues');
      }
      if (results.signals.count === 0) {
        results.recommendations.push('Generate fresh trading signals');
      }

    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Failed",
        description: error.message,
        variant: "destructive"
      });
    }

    setRebuildResults(results);
    setIsRebuilding(false);
  };

  const reconnectBybitAPI = async () => {
    if (!apiCredentials.apiKey || !apiCredentials.apiSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both API key and secret",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('bybit-authenticate', {
        body: {
          apiKey: apiCredentials.apiKey.trim(),
          apiSecret: apiCredentials.apiSecret.trim(),
          testnet: apiCredentials.useTestnet
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.message || error?.message || 'Authentication failed');
      }

      toast({
        title: "API Reconnected",
        description: `Successfully connected to Bybit ${apiCredentials.useTestnet ? 'Testnet' : 'Mainnet'}`,
        variant: "default"
      });

      // Clear credentials for security
      setApiCredentials({ apiKey: '', apiSecret: '', useTestnet: true });
      
      // Re-run diagnostics
      setTimeout(() => {
        runSystemDiagnostics();
      }, 1000);

    } catch (error) {
      toast({
        title: "Reconnection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateSignals = async () => {
    try {
      toast({
        title: "Generating Signals",
        description: "Scanning markets for trading opportunities...",
      });

      const { data, error } = await supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '1h',
          symbols: [],
          scan_all_coins: true
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Signals Generated",
        description: `Generated ${data?.signals_found || 'new'} trading signals`,
      });

      // Re-run diagnostics
      setTimeout(() => {
        runSystemDiagnostics();
      }, 2000);

    } catch (error) {
      toast({
        title: "Signal Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <span>🔧 System Rebuild & Diagnostics</span>
          </div>
          <Button
            onClick={runSystemDiagnostics}
            variant="outline"
            size="sm"
            disabled={isRebuilding}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRebuilding ? 'animate-spin' : ''}`} />
            {isRebuilding ? 'Analyzing...' : 'Run Diagnostics'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!rebuildResults ? (
          <div className="text-center py-8">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your system needs analysis. Click "Run Diagnostics" to identify and fix issues with authentication, API connections, and signal generation.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Diagnostics Results */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(rebuildResults.authentication.status)}
                  <span className="font-medium">Authentication</span>
                </div>
                <div className={`text-sm ${getStatusColor(rebuildResults.authentication.status)}`}>
                  {rebuildResults.authentication.details}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(rebuildResults.tradingAccounts.status)}
                  <span className="font-medium">Trading Accounts</span>
                </div>
                <div className={`text-sm ${getStatusColor(rebuildResults.tradingAccounts.status)}`}>
                  {rebuildResults.tradingAccounts.details}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(rebuildResults.apiConnectivity.status)}
                  <span className="font-medium">API Connectivity</span>
                </div>
                <div className={`text-sm ${getStatusColor(rebuildResults.apiConnectivity.status)}`}>
                  {rebuildResults.apiConnectivity.details}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(rebuildResults.signals.status)}
                  <span className="font-medium">Signals</span>
                </div>
                <div className={`text-sm ${getStatusColor(rebuildResults.signals.status)}`}>
                  {rebuildResults.signals.details}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {rebuildResults.recommendations.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Action Required:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {rebuildResults.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Rebuild Actions */}
            {rebuildResults.tradingAccounts.count === 0 && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Reconnect Bybit API</h4>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={apiCredentials.apiKey}
                      onChange={(e) => setApiCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter your Bybit API key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="api-secret">API Secret</Label>
                    <Input
                      id="api-secret"
                      type="password"
                      value={apiCredentials.apiSecret}
                      onChange={(e) => setApiCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                      placeholder="Enter your Bybit API secret"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-testnet"
                      checked={apiCredentials.useTestnet}
                      onCheckedChange={(checked) => setApiCredentials(prev => ({ ...prev, useTestnet: checked }))}
                    />
                    <Label htmlFor="use-testnet">Use Testnet</Label>
                  </div>
                  <Button onClick={reconnectBybitAPI} className="w-full">
                    Reconnect API
                  </Button>
                </div>
              </div>
            )}

            {/* Generate Signals */}
            {rebuildResults.signals.count === 0 && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Generate Fresh Signals</h4>
                  <p className="text-sm text-muted-foreground">Scan markets for new trading opportunities</p>
                </div>
                <Button onClick={generateSignals} variant="outline">
                  <Zap className="w-4 h-4 mr-1" />
                  Generate Signals
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};