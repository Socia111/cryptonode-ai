import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, X } from 'lucide-react';

const PerformancePanel = () => {
  // Mock data for active trades
  const activeTrades = [
    {
      id: 1,
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entry: 42500,
      current: 42750,
      pnl: 25.50,
      pnlPercent: 0.59
    },
    {
      id: 2,
      symbol: 'ETHUSDT',
      direction: 'SHORT',
      entry: 2650,
      current: 2625,
      pnl: 18.75,
      pnlPercent: 0.94
    },
    {
      id: 3,
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entry: 145.20,
      current: 143.80,
      pnl: -12.25,
      pnlPercent: -0.96
    }
  ];

  return (
    <div className="space-y-6">
      {/* Active Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary" />
              <span>Active Trades</span>
              <Badge variant="outline" className="text-xs">
                {activeTrades.length}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              Close All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTrades.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active trades</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrades.map((trade) => (
                <div key={trade.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {trade.direction === 'LONG' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium text-sm">{trade.symbol}</span>
                      <Badge 
                        variant={trade.direction === 'LONG' ? "default" : "destructive"} 
                        className="text-xs"
                      >
                        {trade.direction}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">${trade.entry.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current</p>
                      <p className="font-medium">${trade.current.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-muted-foreground">PnL: </span>
                      <span className={`font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${trade.pnl.toFixed(2)} ({trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Risk Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Position Size</p>
              <p className="font-medium">$25 per trade</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Max Loss</p>
              <p className="font-medium">2% per day</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Max Positions</p>
              <p className="font-medium">5 concurrent</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Risk Level</p>
              <Badge variant="secondary">Conservative</Badge>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full text-xs">
              Edit Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card className="border-red-200">
        <CardContent className="p-4">
          <Button variant="destructive" size="sm" className="w-full">
            🚨 Emergency Stop
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Closes all positions immediately
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformancePanel;