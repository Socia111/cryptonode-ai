import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Settings, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AutoTradingToggle() {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsEnabled(enabled);
    setIsLoading(false);
    
    toast({
      title: enabled ? "Auto-Trading Enabled" : "Auto-Trading Disabled",
      description: enabled 
        ? "System will now monitor signals for trading opportunities" 
        : "Automatic trading has been stopped",
    });
  };

  return (
    <Card className={`transition-all ${isEnabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Auto-Trading
          </div>
          <Badge variant="secondary" className="text-xs">
            Paper Mode
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isEnabled 
                ? 'Monitoring signals for trading opportunities'
                : 'Manual trading only'
              }
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Active Signals</p>
            <p className="font-semibold">0</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pending Orders</p>
            <p className="font-semibold">0</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Info Panel */}
        {isEnabled && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Paper Trading Mode</p>
              <p className="text-blue-700">Safe simulation environment - no real money at risk.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}