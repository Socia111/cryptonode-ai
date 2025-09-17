import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, User, Database } from 'lucide-react';

interface SystemStatus {
  authentication: 'checking' | 'authenticated' | 'unauthenticated';
  tradingAccount: 'checking' | 'active' | 'missing' | 'error';
  dbConnection: 'checking' | 'connected' | 'error';
}

export function SystemInitializer() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SystemStatus>({
    authentication: 'checking',
    tradingAccount: 'checking',
    dbConnection: 'checking'
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const checkSystemStatus = async () => {
    // Check authentication
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        setStatus(prev => ({ ...prev, authentication: 'unauthenticated' }));
        return;
      }
      
      setUser(session.user);
      setStatus(prev => ({ ...prev, authentication: 'authenticated' }));

      // Check database connection
      try {
        const { error: dbError } = await supabase.from('markets').select('id').limit(1);
        setStatus(prev => ({ ...prev, dbConnection: dbError ? 'error' : 'connected' }));
      } catch (error) {
        setStatus(prev => ({ ...prev, dbConnection: 'error' }));
      }

      // Check trading account
      try {
        const { data: accounts, error: accountError } = await supabase
          .from('user_trading_accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('exchange', 'bybit')
          .eq('is_active', true);

        if (accountError) {
          console.error('Error checking trading accounts:', accountError);
          setStatus(prev => ({ ...prev, tradingAccount: 'error' }));
        } else if (!accounts || accounts.length === 0) {
          setStatus(prev => ({ ...prev, tradingAccount: 'missing' }));
        } else {
          setStatus(prev => ({ ...prev, tradingAccount: 'active' }));
        }
      } catch (error) {
        console.error('Trading account check failed:', error);
        setStatus(prev => ({ ...prev, tradingAccount: 'error' }));
      }
    } catch (error) {
      console.error('System status check failed:', error);
      setStatus(prev => ({ ...prev, authentication: 'unauthenticated' }));
    }
  };

  const initializeSystem = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to initialize the trading system.',
        variant: 'destructive'
      });
      return;
    }

    setIsInitializing(true);
    
    try {
      // Create a default trading account if missing
      if (status.tradingAccount === 'missing') {
        const { data: accountId, error: createError } = await supabase.rpc(
          'restore_user_trading_account',
          {
            p_user_id: user.id,
            p_api_key: 'placeholder_key', // User will need to update this
            p_api_secret: 'placeholder_secret', // User will need to update this
            p_account_type: 'testnet'
          }
        );

        if (createError) {
          console.error('Failed to create trading account:', createError);
          toast({
            title: 'Initialization Failed',
            description: 'Could not create trading account. Please try again.',
            variant: 'destructive'
          });
          return;
        }

        toast({
          title: 'Trading Account Created',
          description: 'Please configure your Bybit API credentials in settings.',
        });
      }

      // Refresh system status
      await checkSystemStatus();
      
      toast({
        title: 'System Initialized',
        description: 'Trading system is ready for use.',
      });

    } catch (error) {
      console.error('System initialization failed:', error);
      toast({
        title: 'Initialization Error',
        description: 'Failed to initialize trading system.',
        variant: 'destructive'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSystemStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'authenticated':
      case 'active':
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unauthenticated':
      case 'missing':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusText = (key: string, value: string) => {
    const statusMap = {
      authentication: {
        checking: 'Checking authentication...',
        authenticated: `Signed in as ${user?.email || 'User'}`,
        unauthenticated: 'Not signed in'
      },
      tradingAccount: {
        checking: 'Checking trading account...',
        active: 'Trading account active',
        missing: 'No trading account found',
        error: 'Error checking trading account'
      },
      dbConnection: {
        checking: 'Checking database...',
        connected: 'Database connected',
        error: 'Database connection error'
      }
    };
    
    return statusMap[key as keyof typeof statusMap]?.[value as keyof any] || value;
  };

  const needsInitialization = 
    status.authentication === 'authenticated' && 
    status.tradingAccount === 'missing';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4" />
            {getStatusIcon(status.authentication)}
            <span className="text-sm">
              {getStatusText('authentication', status.authentication)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4" />
            {getStatusIcon(status.dbConnection)}
            <span className="text-sm">
              {getStatusText('dbConnection', status.dbConnection)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4" />
            {getStatusIcon(status.tradingAccount)}
            <span className="text-sm">
              {getStatusText('tradingAccount', status.tradingAccount)}
            </span>
          </div>
        </div>

        {needsInitialization && (
          <div className="pt-4 border-t">
            <Button 
              onClick={initializeSystem} 
              disabled={isInitializing}
              className="w-full"
            >
              {isInitializing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Initialize Trading System
            </Button>
          </div>
        )}

        <Button 
          onClick={checkSystemStatus} 
          variant="outline" 
          className="w-full"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}