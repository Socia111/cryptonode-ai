import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, Key, Shield, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TradingAuthState {
  isAuthenticated: boolean;
  accountType?: string; // Allow any string to match database
  balance?: any;
  permissions?: string[];
  riskSettings?: any; // Allow any type to match database Json
}

const BybitTradingAuth = () => {
  const [authState, setAuthState] = useState<TradingAuthState>({ isAuthenticated: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [useTestnet, setUseTestnet] = useState(true);
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: ''
  });

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accounts, error } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('exchange', 'bybit')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (accounts && !error) {
        setAuthState({
          isAuthenticated: true,
          accountType: (accounts.account_type as string) || 'testnet',
          balance: accounts.balance_info,
          permissions: accounts.permissions || [],
          riskSettings: (typeof accounts.risk_settings === 'object' && accounts.risk_settings) || { maxPositionSize: 1000, stopLossEnabled: true, takeProfitEnabled: true }
        });
        setUseTestnet(accounts.account_type === 'testnet');
      }
    } catch (error) {
      console.log('No existing Bybit auth found');
    }
  };

  const authenticateWithBybit = async () => {
    if (!credentials.apiKey || !credentials.apiSecret) {
      toast.error("Please enter both API key and secret");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sign in first");
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('bybit-authenticate', {
        body: {
          apiKey: credentials.apiKey.trim(),
          apiSecret: credentials.apiSecret.trim(),
          testnet: useTestnet
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.message || error?.message || 'Authentication failed');
      }

      // Connection already stored by the edge function

      setAuthState({
        isAuthenticated: true,
        accountType: useTestnet ? 'testnet' : 'mainnet',
        balance: data.balance,
        permissions: data.permissions || ['read', 'trade'],
        riskSettings: data.riskSettings
      });
      
      const network = useTestnet ? 'Testnet' : 'Mainnet';
      toast.success(`🎉 Successfully connected to Bybit ${network}!`);
      
    } catch (error: any) {
      console.error('Bybit connect error:', error);
      const errorMessage = error.message || 'Connection failed';
      toast.error(`Connection failed: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_trading_accounts')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('exchange', 'bybit');
      }
      setAuthState({ isAuthenticated: false });
      toast.success('Disconnected from Bybit');
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const hasPermission = (permission: string) => {
    return authState.permissions?.includes(permission) || false;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img 
            src="https://bybit.com/favicon.ico" 
            alt="Bybit" 
            className="w-5 h-5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          Bybit Trading Authorization
          {authState.isAuthenticated && <CheckCircle className="h-5 w-5 text-green-500" />}
          {authState.accountType && (
            <Badge variant={authState.accountType === 'testnet' ? 'secondary' : 'default'}>
              {authState.accountType === 'testnet' ? '📋 Testnet' : '🔴 Live'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!authState.isAuthenticated ? (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Connect your Bybit account to enable direct trading execution with real-time order management.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter Bybit API Key"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    placeholder="Enter Bybit API Secret"
                    value={credentials.apiSecret}
                    onChange={(e) => setCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Trading Environment</Label>
                  <p className="text-sm text-muted-foreground">
                    {useTestnet ? 'Testnet (Paper Trading)' : 'Mainnet (Live Trading)'}
                  </p>
                </div>
                <Switch
                  checked={useTestnet}
                  onCheckedChange={setUseTestnet}
                />
              </div>

              {!useTestnet && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>⚠️ LIVE TRADING MODE</strong> - This will use real money! 
                    Start with testnet to practice.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={authenticateWithBybit}
                disabled={isConnecting || !credentials.apiKey || !credentials.apiSecret}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Connect to Bybit {useTestnet ? 'Testnet' : 'Mainnet'}
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>To get your API credentials:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Log into your Bybit account</li>
                  <li>Go to API Management</li>
                  <li>Create new API key with trading permissions</li>
                  <li>Enable spot & derivatives trading</li>
                  <li>Copy the key and secret here</li>
                </ol>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://testnet.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer">
                      Testnet API <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer">
                      Mainnet API <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected to {authState.accountType === 'testnet' ? 'Testnet' : 'Mainnet'}
              </Badge>
            </div>

            {authState.balance && (
              <div className="space-y-3">
                <h4 className="font-medium">Account Balance</h4>
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Total Equity:</span>
                    <span className="font-medium">${parseFloat(authState.balance.totalEquity || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Balance:</span>
                    <span className="font-medium">${parseFloat(authState.balance.totalAvailableBalance || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unrealized PnL:</span>
                    <span className={`font-medium ${parseFloat(authState.balance.totalPerpUPL || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${parseFloat(authState.balance.totalPerpUPL || '0').toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Trading Permissions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Badge variant={hasPermission('read') ? 'default' : 'outline'}>
                  {hasPermission('read') ? '✅' : '❌'} Read Data
                </Badge>
                <Badge variant={hasPermission('trade') ? 'default' : 'outline'}>
                  {hasPermission('trade') ? '✅' : '❌'} Execute Trades
                </Badge>
                <Badge variant={hasPermission('spot') ? 'default' : 'outline'}>
                  {hasPermission('spot') ? '✅' : '❌'} Spot Trading
                </Badge>
                <Badge variant={hasPermission('derivatives') ? 'default' : 'outline'}>
                  {hasPermission('derivatives') ? '✅' : '❌'} Derivatives
                </Badge>
              </div>
            </div>

            {authState.riskSettings && (
              <div className="space-y-3">
                <h4 className="font-medium">Risk Management</h4>
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Max Position Size:</span>
                    <span className="font-medium">${authState.riskSettings.maxPositionSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stop Loss:</span>
                    <span className={authState.riskSettings.stopLossEnabled ? 'text-green-600' : 'text-red-600'}>
                      {authState.riskSettings.stopLossEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Take Profit:</span>
                    <span className={authState.riskSettings.takeProfitEnabled ? 'text-green-600' : 'text-red-600'}>
                      {authState.riskSettings.takeProfitEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <TrendingUp className="w-4 h-4 mr-2" />
                Trading Dashboard
              </Button>
              <Button variant="destructive" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BybitTradingAuth;