import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  Settings,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAutomatedTrading } from '@/hooks/useAutomatedTrading';
import { useToast } from '@/hooks/use-toast';

export function AutoTradingQuickStart() {
  const { status, startTrading, stopTrading, updateConfig } = useAutomatedTrading();
  const [quickConfig, setQuickConfig] = useState({
    positionSize: 100,
    maxPositions: 3,
    minScore: 85
  });
  const { toast } = useToast();

  const handleQuickStart = async () => {
    // Update configuration with quick settings
    updateConfig({
      enabled: true,
      maxPositions: quickConfig.maxPositions,
      maxRiskPerTrade: 2,
      minSignalScore: quickConfig.minScore,
      allowedTimeframes: ['15m', '30m', '1h'],
      allowedSymbols: [],
      positionSizeUSD: quickConfig.positionSize,
      stopLossPercent: 3,
      takeProfitPercent: 6,
      riskManagement: {
        maxDailyLoss: quickConfig.positionSize * 2,
        maxDrawdown: quickConfig.positionSize * 5,
        dailyProfitTarget: quickConfig.positionSize * 3
      }
    });

    await startTrading();
    
    toast({
      title: "🚀 Automated Trading Started!",
      description: "Your bot is now actively monitoring signals and executing trades"
    });
  };

  const presets = [
    {
      name: "Conservative",
      config: { positionSize: 50, maxPositions: 2, minScore: 90 },
      description: "Lower risk, higher quality signals"
    },
    {
      name: "Balanced",
      config: { positionSize: 100, maxPositions: 3, minScore: 85 },
      description: "Moderate risk with good signal quality"
    },
    {
      name: "Aggressive",
      config: { positionSize: 200, maxPositions: 5, minScore: 80 },
      description: "Higher risk, more trading opportunities"
    }
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Quick Start Automated Trading
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        {status && (
          <Alert className={status.isRunning ? "border-green-200 bg-green-50" : "border-gray-200"}>
            <div className="flex items-center gap-2">
              {status.isRunning ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Trading Active - ${status.todaysPnL.toFixed(2)} P&L Today
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-800">Trading Stopped</span>
                </>
              )}
            </div>
          </Alert>
        )}

        {/* Preset Selection */}
        <div>
          <Label className="text-base font-medium">Choose a Trading Style</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {presets.map((preset) => (
              <Card 
                key={preset.name}
                className={`cursor-pointer transition-all ${
                  quickConfig.positionSize === preset.config.positionSize 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setQuickConfig(preset.config)}
              >
                <CardContent className="p-4">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {preset.description}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="outline">${preset.config.positionSize}</Badge>
                    <Badge variant="outline">{preset.config.maxPositions} pos</Badge>
                    <Badge variant="outline">{preset.config.minScore}+ score</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Custom Configuration */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Fine-tune Settings</Label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="positionSize" className="text-sm">Position Size ($)</Label>
              <Input
                id="positionSize"
                type="number"
                value={quickConfig.positionSize}
                onChange={(e) => setQuickConfig({
                  ...quickConfig, 
                  positionSize: parseInt(e.target.value)
                })}
              />
            </div>
            <div>
              <Label htmlFor="maxPositions" className="text-sm">Max Positions</Label>
              <Input
                id="maxPositions"
                type="number"
                value={quickConfig.maxPositions}
                onChange={(e) => setQuickConfig({
                  ...quickConfig, 
                  maxPositions: parseInt(e.target.value)
                })}
              />
            </div>
            <div>
              <Label htmlFor="minScore" className="text-sm">Min Signal Score</Label>
              <Input
                id="minScore"
                type="number"
                value={quickConfig.minScore}
                onChange={(e) => setQuickConfig({
                  ...quickConfig, 
                  minScore: parseInt(e.target.value)
                })}
              />
            </div>
          </div>
        </div>

        {/* Risk Information */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Risk Management:</strong> Max daily loss will be set to ${quickConfig.positionSize * 2}. 
            All trades start in paper mode for safety.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!status?.isRunning ? (
            <Button 
              onClick={handleQuickStart}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Start Automated Trading
            </Button>
          ) : (
            <Button 
              onClick={stopTrading}
              variant="destructive"
              className="flex-1"
            >
              Stop Trading
            </Button>
          )}
          
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Advanced Config
          </Button>
        </div>

        {/* Features List */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium mb-2">What this bot does:</div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Monitors real-time trading signals</li>
            <li>• Automatically executes trades on high-quality signals</li>
            <li>• Manages stop losses and take profits</li>
            <li>• Enforces risk limits and position sizing</li>
            <li>• Operates in paper mode initially for safety</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}