import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, Webhook, BarChart3, CheckCircle, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  strategy: string;
  alertCount: number;
}

const TradingViewIntegration = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    strategy: ''
  });

  const baseWebhookUrl = 'https://codhlwjogfjywmjyjbbn.functions.supabase.co/tradingview-webhook';

  useEffect(() => {
    loadWebhookConfigs();
  }, []);

  const loadWebhookConfigs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tradingview-webhooks-list');
      if (data?.webhooks) {
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.log('No existing webhooks found');
    }
  };

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.strategy) {
      toast.error('Please enter webhook name and strategy');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tradingview-webhook-create', {
        body: {
          name: newWebhook.name,
          strategy: newWebhook.strategy
        }
      });

      if (error) throw error;

      if (data.success) {
        setWebhooks(prev => [...prev, data.webhook]);
        setNewWebhook({ name: '', strategy: '' });
        toast.success('Webhook created successfully!');
      } else {
        throw new Error(data.error || 'Failed to create webhook');
      }
    } catch (error: any) {
      console.error('Webhook creation error:', error);
      toast.error(`Failed to create webhook: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWebhook = async (webhookId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tradingview-webhook-toggle', {
        body: { webhookId }
      });

      if (data.success) {
        setWebhooks(prev => prev.map(w => 
          w.id === webhookId ? { ...w, isActive: !w.isActive } : w
        ));
        toast.success('Webhook status updated');
      }
    } catch (error) {
      toast.error('Failed to update webhook');
    }
  };

  const copyWebhookUrl = (webhookId: string) => {
    const url = `${baseWebhookUrl}?id=${webhookId}`;
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied to clipboard!');
  };

  const getSamplePayload = () => {
    return `{
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "quantity": 0.1,
  "strategy": "${newWebhook.strategy || 'your_strategy_name'}",
  "timeframe": "{{interval}}",
  "timestamp": "{{time}}"
}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          TradingView Integration
          <Badge variant="outline">Live Webhooks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Webhook className="h-4 w-4" />
          <AlertDescription>
            Connect TradingView alerts directly to your trading strategies. Create custom webhooks 
            for different strategies and receive real-time trading signals.
          </AlertDescription>
        </Alert>

        {/* Create New Webhook */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold">Create New Webhook</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="webhookName">Webhook Name</Label>
              <Input
                id="webhookName"
                placeholder="e.g., BTC Scalping Strategy"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="strategy">Strategy Identifier</Label>
              <Input
                id="strategy"
                placeholder="e.g., btc_scalp_5m"
                value={newWebhook.strategy}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, strategy: e.target.value }))}
              />
            </div>
          </div>

          <Button
            onClick={createWebhook}
            disabled={isLoading || !newWebhook.name || !newWebhook.strategy}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Webhook className="mr-2 h-4 w-4" />
                Create Webhook
              </>
            )}
          </Button>
        </div>

        {/* Sample Payload */}
        <div className="space-y-3">
          <h3 className="font-semibold">Sample TradingView Alert Message</h3>
          <div className="relative">
            <Textarea
              value={getSamplePayload()}
              readOnly
              className="font-mono text-xs h-32"
            />
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => {
                navigator.clipboard.writeText(getSamplePayload());
                toast.success('Sample payload copied!');
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Existing Webhooks */}
        <div className="space-y-3">
          <h3 className="font-semibold">Active Webhooks ({webhooks.length})</h3>
          
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No webhooks created yet</p>
              <p className="text-sm">Create your first webhook above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{webhook.name}</h4>
                      <p className="text-sm text-muted-foreground">Strategy: {webhook.strategy}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                        {webhook.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleWebhook(webhook.id)}
                      >
                        {webhook.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Webhook URL:</Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted p-2 rounded flex-1 truncate">
                        {baseWebhookUrl}?id={webhook.id}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyWebhookUrl(webhook.id)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Alerts received: {webhook.alertCount}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2">
                      <Eye className="w-3 h-3 mr-1" />
                      View Logs
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="space-y-3">
          <h3 className="font-semibold">Setup Instructions</h3>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p><strong>1. Create Alert in TradingView:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Open your chart and strategy</li>
              <li>Click on the Alert button (clock icon)</li>
              <li>Set your conditions</li>
              <li>In the "Webhook URL" field, paste your webhook URL</li>
              <li>In the message, use the sample payload above</li>
            </ul>
            
            <p className="mt-3"><strong>2. Requirements:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>TradingView Pro/Pro+/Premium subscription</li>
              <li>Webhooks enabled in your TradingView plan</li>
              <li>Valid trading account connected (Bybit/3Commas)</li>
            </ul>
            
            <Button variant="outline" size="sm" asChild className="mt-3">
              <a href="https://www.tradingview.com/support/solutions/43000529348" target="_blank" rel="noopener noreferrer">
                TradingView Webhook Guide <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingViewIntegration;
