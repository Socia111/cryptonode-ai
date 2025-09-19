import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTradingAccounts } from '@/hooks/useTradingAccounts';
import { Shield, CheckCircle, AlertCircle, Key, Building } from 'lucide-react';

export function ExchangeAuthentication() {
  const { accounts, loading, connectAccount, testConnection } = useTradingAccounts();
  const { toast } = useToast();
  
  const [bybitApiKey, setBybitApiKey] = useState('');
  const [bybitApiSecret, setBybitApiSecret] = useState('');
  const [bybitAccountType, setBybitAccountType] = useState<'testnet' | 'mainnet'>('testnet');
  const [bybitConnecting, setBybitConnecting] = useState(false);
  
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceApiSecret, setBinanceApiSecret] = useState('');
  const [binanceConnecting, setBinanceConnecting] = useState(false);

  const handleBybitConnect = async () => {
    if (!bybitApiKey || !bybitApiSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both API key and secret",
        variant: "destructive"
      });
      return;
    }

    setBybitConnecting(true);
    try {
      await connectAccount(bybitApiKey, bybitApiSecret, bybitAccountType);
      setBybitApiKey('');
      setBybitApiSecret('');
      toast({
        title: "✅ Bybit Connected",
        description: `Successfully connected to Bybit ${bybitAccountType}`
      });
    } catch (error: any) {
      toast({
        title: "❌ Connection Failed",
        description: error.message || "Failed to connect to Bybit",
        variant: "destructive"
      });
    } finally {
      setBybitConnecting(false);
    }
  };

  const handleTestConnection = async (accountId: string) => {
    try {
      await testConnection(accountId);
      toast({
        title: "✅ Connection Test Passed",
        description: "Trading account is working correctly"
      });
    } catch (error: any) {
      toast({
        title: "❌ Connection Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive"
      });
    }
  };

  const bybitAccount = accounts.find(acc => acc.exchange === 'bybit');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Exchange Authentication</h2>
          <p className="text-sm text-muted-foreground">
            Connect your trading accounts to enable live trading
          </p>
        </div>
      </div>

      <Tabs defaultValue="bybit" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bybit">Bybit</TabsTrigger>
          <TabsTrigger value="binance">Binance (Coming Soon)</TabsTrigger>
          <TabsTrigger value="status">Account Status</TabsTrigger>
        </TabsList>

        <TabsContent value="bybit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Bybit Exchange
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect your Bybit account for automated trading
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bybit-account-type">Account Type</Label>
                <Select 
                  value={bybitAccountType} 
                  onValueChange={(value: 'testnet' | 'mainnet') => setBybitAccountType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testnet">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Test</Badge>
                        Testnet Mode
                      </div>
                    </SelectItem>
                    <SelectItem value="mainnet">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Live</Badge>
                        Mainnet (Real Trading)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bybit-api-key">API Key</Label>
                <Input
                  id="bybit-api-key"
                  type="text"
                  placeholder="Enter your Bybit API key"
                  value={bybitApiKey}
                  onChange={(e) => setBybitApiKey(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bybit-api-secret">API Secret</Label>
                <Input
                  id="bybit-api-secret"
                  type="password"
                  placeholder="Enter your Bybit API secret"
                  value={bybitApiSecret}
                  onChange={(e) => setBybitApiSecret(e.target.value)}
                />
              </div>

              <div className="space-y-3 p-3 bg-info/10 border border-info/20 rounded-md">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium text-info">API Setup Instructions</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>1. Log into your Bybit account</li>
                  <li>2. Go to Account & Security → API Management</li>
                  <li>3. Create a new API key with permissions: Read, Trade</li>
                  <li>4. Copy the API key and secret here</li>
                  <li>5. For safety, start with Testnet first</li>
                </ol>
              </div>

              <Button 
                onClick={handleBybitConnect}
                disabled={bybitConnecting || !bybitApiKey || !bybitApiSecret}
                className="w-full"
              >
                {bybitConnecting ? "Connecting..." : "Connect Bybit Account"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="binance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Binance Exchange
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Binance integration coming soon</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Focus on Bybit for now - full multi-exchange support in next update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading accounts...</p>
              ) : accounts.length === 0 ? (
                <p className="text-muted-foreground">No trading accounts connected</p>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div 
                      key={account.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {account.is_active ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-warning" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{account.exchange}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.account_type} • Connected {new Date(account.connected_at || '').toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTestConnection(account.id)}
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}