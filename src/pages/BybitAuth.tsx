import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';

const BybitAuth: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-automated-trading', {
        body: { action: 'status' }
      });

      if (!error && data?.success && data?.connected) {
        setIsConnected(true);
        setAccountInfo(data.account);
        toast.success('Already connected to Bybit');
      }
    } catch (error) {
      console.log('No existing connection');
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error('Please enter both API Key and Secret');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bybit-automated-trading', {
        body: { 
          action: 'connect',
          credentials: {
            apiKey: apiKey.trim(),
            apiSecret: apiSecret.trim()
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        setIsConnected(true);
        setAccountInfo(data.account);
        toast.success('Successfully connected to Bybit!');
        
        // Clear credentials from state for security
        setApiKey('');
        setApiSecret('');
      } else {
        throw new Error(data?.error || 'Failed to connect to Bybit');
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      toast.error(error.message || 'Failed to connect to Bybit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bybit-automated-trading', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      setIsConnected(false);
      setAccountInfo(null);
      toast.success('Disconnected from Bybit');
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToAutomation = () => {
    navigate('/automation');
  };

  if (isConnected && accountInfo) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Bybit Connected</h1>
          <p className="text-muted-foreground">Your account is successfully connected and ready for automated trading</p>
        </div>

        <Card className="glass-card max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-success" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Type</Label>
                <p className="text-lg font-semibold text-primary">{accountInfo.accountType || 'UNIFIED'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-success font-medium">Active</span>
                </div>
              </div>
            </div>

            {accountInfo.walletBalance && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Wallet Balance</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xl font-bold text-primary">
                    ${parseFloat(accountInfo.walletBalance).toFixed(2)} USDT
                  </p>
                </div>
              </div>
            )}

            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                Your API credentials are securely encrypted and stored. They will only be used for automated trading as configured.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={navigateToAutomation} size="lg" className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Configure Automated Trading</span>
          </Button>
          <Button 
            onClick={handleDisconnect} 
            variant="outline" 
            size="lg"
            disabled={isLoading}
          >
            Disconnect Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text mb-2">Connect to Bybit</h1>
        <p className="text-muted-foreground">Securely connect your Bybit account for automated trading</p>
      </div>

      <Card className="glass-card max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-primary" />
            <span>API Credentials</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Your API credentials are encrypted and stored securely. Never share these with anyone.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="text"
                placeholder="Enter your Bybit API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <div className="relative">
                <Input
                  id="apiSecret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter your Bybit API Secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Required API Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Read Account Info</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Read Positions</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Place Orders</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Cancel Orders</span>
              </div>
            </div>
          </div>

          <Alert>
            <ExternalLink className="w-4 h-4" />
            <AlertDescription>
              Don't have API credentials? 
              <a 
                href="https://www.bybit.com/app/user/api-management" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline font-medium"
              >
                Create them on Bybit →
              </a>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleConnect} 
            className="w-full" 
            size="lg"
            disabled={isLoading || !apiKey.trim() || !apiSecret.trim()}
          >
            {isLoading ? 'Connecting...' : 'Connect to Bybit'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BybitAuth;