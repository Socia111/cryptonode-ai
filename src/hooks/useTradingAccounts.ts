import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TradingAccount {
  id: string;
  user_id: string;
  exchange: string;
  account_type: 'testnet' | 'mainnet';
  is_active: boolean;
  connected_at: string;
  last_used_at: string;
  balance_info: any;
  risk_settings: any;
  permissions: string[];
}

interface AccountBalance {
  availableBalance: number;
  totalBalance: number;
  unrealizedPnl: number;
  marginUsed: number;
  marginFree: number;
  currency: string;
}

export function useTradingAccounts() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: accountError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (accountError) throw accountError;

      setAccounts(data || []);
      
      // Load balance for the first active account
      if (data && data.length > 0) {
        await loadAccountBalance(data[0].id);
      }

    } catch (err: any) {
      console.error('Failed to load trading accounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountBalance = async (accountId: string) => {
    try {
      // Mock balance for now - in production this would call Bybit API
      const mockBalance: AccountBalance = {
        availableBalance: 12345.67,
        totalBalance: 15000.00,
        unrealizedPnl: 234.56,
        marginUsed: 2420.77,
        marginFree: 12579.23,
        currency: 'USDT'
      };

      setBalance(mockBalance);
    } catch (err: any) {
      console.error('Failed to load account balance:', err);
    }
  };

  const connectAccount = async (apiKey: string, apiSecret: string, accountType: 'testnet' | 'mainnet' = 'testnet') => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('bybit-authenticate', {
        body: {
          api_key: apiKey,
          api_secret: apiSecret,
          account_type: accountType
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Account Connected",
        description: `Successfully connected ${accountType} trading account`
      });

      await loadAccounts();
      return data;

    } catch (err: any) {
      console.error('Failed to connect account:', err);
      toast({
        title: "❌ Connection Failed",
        description: err.message || 'Failed to connect trading account',
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (accountId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('debug-trading-status', {
        body: { account_id: accountId }
      });

      if (error) throw error;

      toast({
        title: "✅ Connection Test",
        description: "Trading account connection is working properly"
      });

      return data;

    } catch (err: any) {
      console.error('Connection test failed:', err);
      toast({
        title: "❌ Connection Test Failed",
        description: err.message || 'Failed to test connection',
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  return {
    accounts,
    balance,
    loading,
    error,
    loadAccounts,
    connectAccount,
    testConnection,
    refreshBalance: () => accounts.length > 0 ? loadAccountBalance(accounts[0].id) : Promise.resolve()
  };
}