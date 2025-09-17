import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Key, CheckCircle, Settings } from 'lucide-react';

export function TradingCredentialsManager() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Form state
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [accountType, setAccountType] = useState<'testnet' | 'mainnet'>('testnet');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadTradingAccounts(session.user.id);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTradingAccounts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('exchange', 'bybit')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading accounts:', error);
        return;
      }

      setAccounts(data || []);
    } catch (error) {
      console.error('Failed to load trading accounts:', error);
    }
  };

  const saveCredentials = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save credentials.',
        variant: 'destructive'
      });
      return;
    }

    if (!apiKey || !apiSecret) {
      toast({
        title: 'Missing Credentials',
        description: 'Please enter both API key and secret.',
        variant: 'destructive'
      });
      return;
    }

    if (apiKey.length < 10 || apiSecret.length < 10) {
      toast({
        title: 'Invalid Credentials',
        description: 'API credentials appear to be too short. Please check your input.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { data: accountId, error } = await supabase.rpc(
        'restore_user_trading_account',
        {
          p_user_id: user.id,
          p_api_key: apiKey,
          p_api_secret: apiSecret,
          p_account_type: accountType
        }
      );

      if (error) {
        throw error;
      }

      toast({
        title: 'Credentials Saved',
        description: 'Your Bybit API credentials have been saved successfully.',
      });

      // Clear form
      setApiKey('');
      setApiSecret('');
      
      // Reload accounts
      await loadTradingAccounts(user.id);

    } catch (error: any) {
      console.error('Failed to save credentials:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save credentials. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('user_trading_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: 'Account Deleted',
        description: 'Trading account has been removed.',
      });

      // Reload accounts
      if (user) {
        await loadTradingAccounts(user.id);
      }
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete account.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please sign in to manage your trading credentials.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Your Trading Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={account.is_active ? 'default' : 'secondary'}>
                      {account.account_type}
                    </Badge>
                    {account.is_active && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    API Key: {account.api_key_encrypted?.startsWith('placeholder_') || account.api_key_encrypted?.startsWith('test_key_') 
                      ? 'Placeholder - needs configuration' 
                      : `${account.api_key_encrypted?.substring(0, 8)}...`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last used: {account.last_used_at ? new Date(account.last_used_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => deleteAccount(account.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add New Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Bybit API Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={accountType === 'testnet' ? 'default' : 'outline'}
                onClick={() => setAccountType('testnet')}
                className="flex-1"
              >
                Testnet (Recommended)
              </Button>
              <Button
                type="button"
                variant={accountType === 'mainnet' ? 'default' : 'outline'}
                onClick={() => setAccountType('mainnet')}
                className="flex-1"
              >
                Mainnet (Live Trading)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Bybit API key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your Bybit API secret"
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Security Note:</strong> Your API credentials are encrypted and stored securely. 
              For safety, we recommend using testnet for initial testing and only enable 
              "Trade" permissions (not "Withdraw") on your Bybit API keys.
            </div>
          </div>

          <Button 
            onClick={saveCredentials} 
            disabled={saving || !apiKey || !apiSecret}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Credentials'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
