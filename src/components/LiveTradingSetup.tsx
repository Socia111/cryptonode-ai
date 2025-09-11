import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Zap, BarChart3, TrendingUp, ExternalLink, AlertTriangle } from 'lucide-react';
import { TradingGateway } from '@/lib/tradingGateway';

const LiveTradingSetup = () => {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [balance, setBalance] = useState<any>(null);

  const testConnection = async () => {
    setConnectionStatus('connecting');
    try {
      const result = await TradingGateway.testConnection();
      if (result.ok) {
        setConnectionStatus('connected');
        // Also fetch balance
        const balanceResult = await TradingGateway.getBalance();
        if (balanceResult.ok) {
          setBalance(balanceResult.data);
        }
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const tradingMethods = [
    {
      id: 'bybit-direct',
      title: 'Direct Bybit API',
      description: 'Connect directly to Bybit for instant execution',
      features: ['Real-time execution', 'Full position control', 'Stop-loss/Take-profit'],
      status: connectionStatus,
      recommended: true
    },
    {
      id: 'tradingview',
      title: 'TradingView Webhooks',
      description: 'Send signals to TradingView for execution',
      features: ['Strategy alerts', 'Multiple brokers', 'Custom indicators'],
      status: 'available',
      webhookUrl: 'https://codhlwjogfjywmjyjbbn.functions.supabase.co/tradingview-webhook'
    },
    {
      id: 'copy-trading',
      title: 'Copy Trading Platforms',
      description: 'Connect via copy trading services',
      features: ['Social trading', 'Risk management', 'Multiple followers'],
      status: 'available'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Live Trading Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Important:</strong> Live trading involves real money risk. Start with small amounts and use proper risk management.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Trading Methods */}
      <div className="grid gap-4">
        {tradingMethods.map((method) => (
          <Card key={method.id} className={method.recommended ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {method.title}
                  {method.recommended && (
                    <Badge variant="default" className="text-xs">Recommended</Badge>
                  )}
                </CardTitle>
                <Badge 
                  variant={
                    method.status === 'connected' ? 'default' : 
                    method.status === 'connecting' ? 'secondary' : 
                    'outline'
                  }
                >
                  {method.status === 'connected' ? '✅ Connected' :
                   method.status === 'connecting' ? '🔄 Connecting...' :
                   '⚪ Available'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {method.features.map((feature, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>

              {method.id === 'bybit-direct' && (
                <div className="space-y-3">
                  <Button 
                    onClick={testConnection} 
                    disabled={connectionStatus === 'connecting'}
                    className="w-full"
                  >
                    {connectionStatus === 'connecting' ? 'Testing Connection...' : 'Test Bybit Connection'}
                  </Button>
                  
                  {connectionStatus === 'connected' && balance && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Account Balance</h4>
                      <div className="text-sm space-y-1">
                        {balance.list?.[0]?.coin?.map((coin: any) => (
                          <div key={coin.coin} className="flex justify-between">
                            <span>{coin.coin}:</span>
                            <span className="font-medium">{parseFloat(coin.walletBalance).toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {method.id === 'tradingview' && (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Webhook URL</h4>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background p-1 rounded flex-1 truncate">
                        {method.webhookUrl}
                      </code>
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(method.webhookUrl!)}>
                        Copy
                      </Button>
                    </div>
                  </div>
                  <Alert>
                    <AlertDescription>
                      <strong>Setup:</strong> In TradingView, create alerts and use this webhook URL. 
                      Requires TradingView Pro subscription.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" asChild>
                    <a href="https://www.tradingview.com/support/solutions/43000529348" target="_blank" rel="noopener noreferrer">
                      TradingView Webhook Guide <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </Button>
                </div>
              )}

              {method.id === 'copy-trading' && (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription>
                      Connect your AITRADEX1 signals to copy trading platforms like 3Commas, Cornix, or TradeSanta.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://3commas.io" target="_blank" rel="noopener noreferrer">
                        3Commas <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://cornix.io" target="_blank" rel="noopener noreferrer">
                        Cornix <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</div>
            <span className="text-sm">Configure API keys in Supabase secrets</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</div>
            <span className="text-sm">Test connection with small amounts</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</div>
            <span className="text-sm">Set up risk management rules</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">4</div>
            <span className="text-sm">Enable auto-trading for signals</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveTradingSetup;