import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, TestTube, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AutomationTestPanel: React.FC = () => {
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);
  const [config, setConfig] = useState({
    auto_execute_enabled: true,
    max_position_size: 10,
    risk_per_trade: 2,
    max_open_positions: 3,
    min_confidence_score: 80,
    timeframes: ['5m', '15m'],
    symbols_blacklist: ['USDCUSDT'],
    use_leverage: false,
    leverage_amount: 1
  });
  const { toast } = useToast();

  const createTradingConfig = async () => {
    setIsCreatingConfig(true);
    try {
      const { data, error } = await supabase
        .from('user_trading_configs')
        .upsert([{
          user_id: '00000000-0000-0000-0000-000000000000', // Demo user
          ...config
        }], { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Config Created",
        description: "Trading automation configuration saved successfully"
      });

      console.log('Trading config created:', data);
    } catch (error: any) {
      toast({
        title: "❌ Config Failed",
        description: error.message || 'Failed to create trading config',
        variant: "destructive"
      });
    } finally {
      setIsCreatingConfig(false);
    }
  };

  const insertTestSignal = async () => {
    try {
      const testSignal = {
        symbol: 'BTCUSDT',
        direction: 'LONG',
        timeframe: '5m',
        price: 67000,
        entry_price: 67000,
        tp: 67500,
        sl: 66500,
        score: 85,
        confidence_score: 85,
        algo: 'TestSignal',
        indicators: {
          rsi: 65,
          macd: 0.5,
          volume: 1000000
        },
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('signals')
        .insert([testSignal])
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "🎯 Test Signal Created",
        description: `BTCUSDT LONG signal with score ${testSignal.score}% created`
      });

      console.log('Test signal created:', data);
    } catch (error: any) {
      toast({
        title: "❌ Signal Failed",
        description: error.message || 'Failed to create test signal',
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-primary" />
          Automation Testing
        </CardTitle>
        <CardDescription>
          Test the automated trading system with demo configurations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800">Testing Environment</h4>
              <p className="text-sm text-orange-700 mt-1">
                This is for testing automation triggers. No real trades will be executed.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label htmlFor="confidence">Min Confidence Score</Label>
            <Input
              id="confidence"
              type="number"
              value={config.min_confidence_score}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                min_confidence_score: parseInt(e.target.value) 
              }))}
              min="1"
              max="100"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="positions">Max Open Positions</Label>
            <Input
              id="positions"
              type="number"
              value={config.max_open_positions}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                max_open_positions: parseInt(e.target.value) 
              }))}
              min="1"
              max="10"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4">
          <Badge variant={config.auto_execute_enabled ? "default" : "secondary"}>
            {config.auto_execute_enabled ? "Automation Enabled" : "Automation Disabled"}
          </Badge>
          <Badge variant="outline">
            Min Score: {config.min_confidence_score}%
          </Badge>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={createTradingConfig}
            disabled={isCreatingConfig}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {isCreatingConfig ? "Creating..." : "Create Config"}
          </Button>
          
          <Button 
            onClick={insertTestSignal}
            variant="outline"
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Insert Test Signal
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm space-y-2">
          <h4 className="font-medium">Testing Steps:</h4>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Create automation config with desired settings</li>
            <li>Insert a test signal with score ≥ {config.min_confidence_score}%</li>
            <li>Check console logs for automation trigger events</li>
            <li>Verify signal processing in real-time</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomationTestPanel;