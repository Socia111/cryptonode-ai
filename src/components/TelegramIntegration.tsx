import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Settings, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const TelegramIntegration = () => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [botStatus, setBotStatus] = React.useState('inactive');
  const [subscribers, setSubscribers] = React.useState(0);
  const { toast } = useToast();

  const setupTelegramBot = async () => {
    try {
      // This would typically involve:
      // 1. Setting up webhook URL
      // 2. Configuring bot commands
      // 3. Testing connection
      
      const { data, error } = await supabase.functions.invoke('setup-telegram-bot');
      
      if (error) throw error;
      
      setIsConnected(true);
      setBotStatus('active');
      
      toast({
        title: "Telegram Bot Connected",
        description: "Your bot is now ready to send signals",
      });
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "Failed to setup Telegram bot integration",
        variant: "destructive",
      });
    }
  };

  const sendTestSignal = async () => {
    try {
      const testSignal = {
        signal_id: 'test_' + Date.now(),
        token: 'BTC/USDT',
        direction: 'BUY',
        signal_type: 'Test Signal',
        entry_price: 95000,
        exit_target: 105000,
        stop_loss: 90000,
        leverage: 10,
        confidence_score: 95,
        roi_projection: 10.5,
        quantum_probability: 0.85,
        risk_level: 'MEDIUM',
        signal_strength: 'STRONG',
        trend_projection: '⬆️'
      };

      const { error } = await supabase.functions.invoke('telegram-bot', {
        body: { signal: testSignal }
      });

      if (error) throw error;

      toast({
        title: "Test Signal Sent",
        description: "Check your Telegram channel for the test signal",
      });
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send test signal",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-primary" />
            <span>Telegram Integration</span>
          </div>
          <Badge variant={isConnected ? "secondary" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-muted/20 rounded-lg">
            <Bot className="w-6 h-6 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Bot Status</p>
            <p className="font-semibold capitalize">{botStatus}</p>
          </div>
          
          <div className="p-3 bg-muted/20 rounded-lg">
            <Users className="w-6 h-6 mx-auto mb-1 text-success" />
            <p className="text-xs text-muted-foreground">Subscribers</p>
            <p className="font-semibold">{subscribers}</p>
          </div>
          
          <div className="p-3 bg-muted/20 rounded-lg">
            <Send className="w-6 h-6 mx-auto mb-1 text-warning" />
            <p className="text-xs text-muted-foreground">Signals Sent</p>
            <p className="font-semibold">47</p>
          </div>
        </div>

        {!isConnected ? (
          <div className="space-y-3">
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm text-warning font-medium">Setup Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure your Telegram bot to receive real-time signal alerts
              </p>
            </div>
            
            <Button onClick={setupTelegramBot} className="w-full">
              <Bot className="w-4 h-4 mr-2" />
              Setup Telegram Bot
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-success/10 rounded-lg border border-success/20">
              <p className="text-sm text-success font-medium">Bot Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Signals are being sent to your Telegram channel automatically
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={sendTestSignal} size="sm">
                <Send className="w-3 h-3 mr-1" />
                Test Signal
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-3 h-3 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Real-time signal alerts</p>
          <p>• Premium high-confidence signals</p>
          <p>• Trade execution confirmations</p>
          <p>• Sentiment analysis alerts</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramIntegration;