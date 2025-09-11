import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, Key, Shield, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  isAuthenticated: boolean;
  apiKey?: string;
  accountInfo?: any;
  permissions?: string[];
}

const ThreeCommasAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: ''
  });

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('3commas-auth-status');
      if (data?.authenticated) {
        setAuthState({
          isAuthenticated: true,
          apiKey: data.apiKey,
          accountInfo: data.accountInfo,
          permissions: data.permissions
        });
      }
    } catch (error) {
      console.log('No existing 3Commas auth found');
    }
  };

  const authenticateWith3Commas = async () => {
    if (!credentials.apiKey || !credentials.apiSecret) {
      toast.error('Please enter both API Key and Secret');
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('3commas-authenticate', {
        body: {
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret
        }
      });

      if (error) throw error;

      if (data.success) {
        setAuthState({
          isAuthenticated: true,
          apiKey: data.apiKey,
          accountInfo: data.accountInfo,
          permissions: data.permissions
        });
        
        toast.success('🎉 Successfully authenticated with 3Commas!');
        
        // Clear credentials from state for security
        setCredentials({ apiKey: '', apiSecret: '' });
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('3Commas auth error:', error);
      toast.error(`Authentication failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await supabase.functions.invoke('3commas-disconnect');
      setAuthState({ isAuthenticated: false });
      toast.success('Disconnected from 3Commas');
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
            src="https://3commas.io/favicon.ico" 
            alt="3Commas" 
            className="w-5 h-5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          3Commas Trading Authorization
          {authState.isAuthenticated && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!authState.isAuthenticated ? (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Connect your 3Commas account to enable automated trading with your bots and strategies.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="text"
                  placeholder="Enter your 3Commas API Key"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  placeholder="Enter your 3Commas API Secret"
                  value={credentials.apiSecret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                />
              </div>

              <Button
                onClick={authenticateWith3Commas}
                disabled={isConnecting || !credentials.apiKey || !credentials.apiSecret}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Connect to 3Commas
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>To get your API credentials:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Log into your 3Commas account</li>
                  <li>Go to API Keys section</li>
                  <li>Create new API key with trading permissions</li>
                  <li>Copy the key and secret here</li>
                </ol>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://3commas.io/api_access_tokens" target="_blank" rel="noopener noreferrer">
                    Create API Key <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {authState.apiKey}
              </code>
            </div>

            {authState.accountInfo && (
              <div className="space-y-3">
                <h4 className="font-medium">Account Information</h4>
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Accounts:</span>
                    <span className="font-medium">{authState.accountInfo.accountsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Bots:</span>
                    <span className="font-medium">{authState.accountInfo.activeBots || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Profit:</span>
                    <span className="font-medium text-green-600">
                      ${authState.accountInfo.totalProfit || '0.00'}
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
                <Badge variant={hasPermission('bots') ? 'default' : 'outline'}>
                  {hasPermission('bots') ? '✅' : '❌'} Manage Bots
                </Badge>
                <Badge variant={hasPermission('portfolios') ? 'default' : 'outline'}>
                  {hasPermission('portfolios') ? '✅' : '❌'} Portfolios
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Dashboard
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

export default ThreeCommasAuth;