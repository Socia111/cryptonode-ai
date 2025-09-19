import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Zap, Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags';

interface StatusItem {
  label: string;
  status: 'success' | 'error' | 'warning' | 'checking';
  message?: string;
}

export const AutoTradingStatus = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [statusItems, setStatusItems] = useState<StatusItem[]>([
    { label: 'User Authentication', status: 'checking' },
    { label: 'Symbol Whitelist', status: 'checking' },
    { label: 'API Keys Configured', status: 'checking' },
    { label: 'Auto Trading Ready', status: 'checking' }
  ]);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const newStatus: StatusItem[] = [];

    // Check authentication
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isAuth = !!session;
      setIsAuthenticated(isAuth);
      
      newStatus.push({
        label: 'User Authentication',
        status: isAuth ? 'success' : 'error',
        message: isAuth ? 'Signed in successfully' : 'Please sign in to continue'
      });
    } catch (error) {
      newStatus.push({
        label: 'User Authentication',
        status: 'error',
        message: 'Authentication check failed'
      });
    }

    // Check symbol whitelist
    newStatus.push({
      label: 'Symbol Whitelist',
      status: 'success',
      message: 'All symbols allowed (*)'
    });

    // Check API keys (simplified check)
    try {
      const { data, error } = await supabase.from('user_trading_accounts').select('*').limit(1);
      
      const hasKeys = !error && data && data.length > 0;
      newStatus.push({
        label: 'API Keys Configured',
        status: hasKeys ? 'success' : 'warning',
        message: hasKeys ? 'Trading keys configured' : 'Configure Bybit API keys in Setup'
      });
    } catch (error) {
      newStatus.push({
        label: 'API Keys Configured',
        status: 'warning',
        message: 'Unable to verify API keys - check Setup tab'
      });
    }

    // Overall readiness
    const allGreen = newStatus.every(item => item.status === 'success');
    const hasAuth = newStatus[0].status === 'success';
    
    newStatus.push({
      label: 'Auto Trading Ready',
      status: allGreen ? 'success' : hasAuth ? 'warning' : 'error',
      message: allGreen ? 'Ready for auto trading!' : 
               hasAuth ? 'Complete setup in other tabs' : 
               'Sign in required'
    });

    setStatusItems(newStatus);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse" />;
    }
  };

  const overallStatus = statusItems.every(item => item.status === 'success') ? 'ready' :
                       statusItems[0]?.status === 'success' ? 'partial' : 'blocked';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {overallStatus === 'ready' ? (
            <Zap className="w-5 h-5 text-green-500" />
          ) : overallStatus === 'partial' ? (
            <Shield className="w-5 h-5 text-yellow-500" />
          ) : (
            <User className="w-5 h-5 text-red-500" />
          )}
          System Status
          <Badge variant={
            overallStatus === 'ready' ? 'default' : 
            overallStatus === 'partial' ? 'secondary' : 
            'destructive'
          }>
            {overallStatus === 'ready' ? 'READY' : 
             overallStatus === 'partial' ? 'SETUP NEEDED' : 
             'BLOCKED'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
            <div className="flex items-center gap-2">
              {getStatusIcon(item.status)}
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.message && (
              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                {item.message}
              </span>
            )}
          </div>
        ))}

        {overallStatus === 'ready' && FEATURES.AUTOTRADE_ENABLED && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              🚀 All systems ready! Auto trading can be enabled in Production Controls.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'blocked' && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              Please sign in to access trading features.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'partial' && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Complete the setup in Live Setup and Production Controls tabs.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};