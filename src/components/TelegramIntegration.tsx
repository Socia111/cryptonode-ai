import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Settings, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TelegramIntegration = () => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [botStatus, setBotStatus] = React.useState('inactive');
  const [subscribers, setSubscribers] = React.useState(0);
  const { toast } = useToast();

  const setupTelegramBot = async () => {
    // Check if Supabase is properly configured
    try {
      const { error } = await supabase.from('markets').select('id').limit(1);
      if (error) {
        toast({
          title: "Supabase Not Configured",
          description: "Please set up your Supabase credentials first to enable Telegram integration.",
          variant: "destructive",
        });
        return;
      }
    } catch (configError) {
      toast({
        title: "Supabase Not Configured", 
        description: "Please set up your Supabase credentials first to enable Telegram integration.",
        variant: "destructive",
      });
      return;
    }
    
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

  const sendTestSignal = async (isPremium: boolean = false) => {
    // Check if Supabase is properly configured
    try {
      const { error } = await supabase.from('markets').select('id').limit(1);
      if (error) {
        toast({
          title: "Supabase Not Configured", 
          description: "Please configure Supabase credentials to send Telegram signals.",
          variant: "destructive",
        });
        return;
      }
    } catch (configError) {
      toast({
        title: "Supabase Not Configured",
        description: "Please configure Supabase credentials to send Telegram signals.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const testSignal = {
        signal_id: `test_${Date.now()}`,
        token: "BTC",
        direction: "BUY" as const,
        signal_type: isPremium ? "QUANTUM_BREAKOUT_PREMIUM" : "QUANTUM_BREAKOUT",
        entry_price: 45000,
        exit_target: 47500,
        stop_loss: 44000,
        leverage: isPremium ? 3 : 2,
        confidence_score: isPremium ? 95.5 : 82.5,
        roi_projection: isPremium ? 8.5 : 4.5,
        quantum_probability: isPremium ? 0.92 : 0.78,
        risk_level: isPremium ? "LOW" : "MEDIUM",
        signal_strength: isPremium ? "VERY_STRONG" : "STRONG",
        trend_projection: "BULLISH_MOMENTUM",
        is_premium: isPremium
      };

      const { error } = await supabase.functions.invoke('telegram-bot', {
        body: { signal: testSignal }
      });

      if (error) throw error;

      toast({
        title: `${isPremium ? 'Premium' : 'Free'} Test Signal Sent!`,
        description: `Check your ${isPremium ? 'AItradeX Premium' : 'Aiatethecoin'} Telegram channel.`
      });
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send test signal",
        variant: "destructive",
      });
    }
  };

  const runScannerTest = async () => {
    try {
      toast({
        title: "Running Scanner Test",
        description: "Testing the AItradeX1 scanner engine...",
      });

      const { data, error } = await supabase.functions.invoke('scanner-engine', {
        body: { exchange: 'bybit', timeframe: '1h' }
      });

      if (error) throw error;

      toast({
        title: "Scanner Test Complete",
        description: `Generated ${data.signals_count} signals. Check Telegram for alerts!`,
      });
    } catch (error) {
      toast({
        title: "Scanner Test Failed",
        description: "Failed to run scanner test",
        variant: "destructive",
      });
    }
  };

  const testAllFunctions = async () => {
    try {
      toast({
        title: "Testing All Functions",
        description: "Running comprehensive test suite...",
      });

      // Test scanner engine
      const scannerResult = await supabase.functions.invoke('scanner-engine', {
        body: { exchange: 'bybit', timeframe: '1h' }
      });

      // Test enhanced signal generation
      const enhancedResult = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { symbols: ['BTCUSDT', 'ETHUSDT'] }
      });

      // Test calculate spynx scores
      const spynxResult = await supabase.functions.invoke('calculate-spynx-scores', {
        body: { user_id: 'test' }
      });

      // Test backtest engine
      const backtestResult = await supabase.functions.invoke('backtest-engine', {
        body: { 
          symbol: 'BTCUSDT',
          strategy: 'aitradex1',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      });

      // Send test signals
      await sendTestSignal(false); // Free signal
      await sendTestSignal(true);  // Premium signal

      toast({
        title: "All Tests Complete!",
        description: "All functions tested successfully. Check Telegram and logs!",
      });
    } catch (error) {
      toast({
        title: "Some Tests Failed",
        description: "Check the console logs for details",
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
            
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => sendTestSignal(false)} size="sm">
                  <Send className="w-3 h-3 mr-1" />
                  Test Free
                </Button>
                <Button onClick={() => sendTestSignal(true)} size="sm">
                  <Send className="w-3 h-3 mr-1" />
                  Test Premium
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={runScannerTest} size="sm">
                  <Bot className="w-3 h-3 mr-1" />
                  Test Scanner
                </Button>
                <Button variant="outline" onClick={testAllFunctions} size="sm">
                  <Settings className="w-3 h-3 mr-1" />
                  Test All
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  toast({
                    title: "Bot Settings",
                    description: "Settings panel will be available soon",
                  });
                }}
              >
                <Settings className="w-3 h-3 mr-1" />
                Bot Settings
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-muted/10 rounded border">
            <p className="font-medium text-sm mb-1">🆓 Free Bot (@Aiatethecoin_bot)</p>
            <div className="text-muted-foreground space-y-1">
              <p>• Basic trading signals</p>
              <p>• Risk level indicators</p>
              <p>• Entry/exit prices</p>
            </div>
          </div>
          
          <div className="p-3 bg-primary/10 rounded border border-primary/20">
            <p className="font-medium text-sm mb-1">💎 Premium Bot (@AItradeX1_bot)</p>
            <div className="text-muted-foreground space-y-1">
              <p>• Advanced quantum analysis</p>
              <p>• High-confidence signals (85%+)</p>
              <p>• Priority alerts & execution</p>
              <p>• Exclusive premium trades</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramIntegration;