import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  X,
  DollarSign,
  Clock,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  pnl_percent: number;
  margin_used: number;
  leverage: number;
  liquidation_price: number;
  stop_loss?: number;
  take_profit?: number;
  created_at: string;
  status: 'open' | 'closed' | 'liquidated';
}

export function TradingPositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { closePosition, executing } = useTradingExecutor();

  // Mock positions for demo
  useEffect(() => {
    // Simulate loading positions
    setTimeout(() => {
      const mockPositions: Position[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          size: 0.1,
          entry_price: 92000,
          current_price: 92150,
          pnl: 150,
          pnl_percent: 1.63,
          margin_used: 920,
          leverage: 10,
          liquidation_price: 83200,
          take_profit: 94000,
          stop_loss: 90500,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'open'
        },
        {
          id: '2',
          symbol: 'ETHUSDT',
          side: 'SHORT',
          size: 2.5,
          entry_price: 2500,
          current_price: 2484,
          pnl: 320,
          pnl_percent: 5.12,
          margin_used: 625,
          leverage: 4,
          liquidation_price: 2700,
          take_profit: 2400,
          stop_loss: 2550,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'open'
        },
        {
          id: '3',
          symbol: 'SOLUSDT',
          side: 'LONG',
          size: 50,
          entry_price: 95.50,
          current_price: 95.48,
          pnl: -1,
          pnl_percent: -0.02,
          margin_used: 477.50,
          leverage: 2,
          liquidation_price: 47.75,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'open'
        }
      ];
      
      setPositions(mockPositions);
      setLoading(false);
    }, 1000);
  }, []);

  const handleClosePosition = async (position: Position) => {
    try {
      await closePosition(position.symbol);
      
      // Remove position from list (in real app, this would be handled by real-time updates)
      setPositions(prev => prev.filter(p => p.id !== position.id));
      
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };

  const calculateRiskRatio = (position: Position) => {
    if (!position.liquidation_price) return 0;
    
    const distance = Math.abs(position.current_price - position.liquidation_price);
    const entryDistance = Math.abs(position.entry_price - position.liquidation_price);
    
    return ((entryDistance - distance) / entryDistance) * 100;
  };

  if (loading) {
    return (
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle>Loading Positions...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalMargin = positions.reduce((sum, p) => sum + p.margin_used, 0);

  return (
    <div className="space-y-6">
      {/* Positions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="metric-label">Total P&L</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
              {totalPnl >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="metric-label">Active Positions</span>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {positions.filter(p => p.status === 'open').length}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="metric-label">Margin Used</span>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              ${totalMargin.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions List */}
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No open positions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => {
                const riskRatio = calculateRiskRatio(position);
                
                return (
                  <div key={position.id} className="p-4 rounded-lg border border-border bg-muted/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{position.symbol}</h3>
                          <p className="text-sm text-muted-foreground">
                            {position.size} @ ${position.entry_price.toLocaleString()}
                          </p>
                        </div>
                        <Badge 
                          variant={position.side === 'LONG' ? 'default' : 'secondary'}
                          className={
                            position.side === 'LONG' 
                              ? 'bg-success/20 text-success border-success/30' 
                              : 'bg-destructive/20 text-destructive border-destructive/30'
                          }
                        >
                          {position.side} {position.leverage}x
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`font-semibold ${position.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                          </p>
                          <p className={`text-sm ${position.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {position.pnl >= 0 ? '+' : ''}{position.pnl_percent.toFixed(2)}%
                          </p>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClosePosition(position)}
                          disabled={executing}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Current Price</p>
                        <p className="font-medium">${position.current_price.toLocaleString()}</p>
                      </div>
                      
                      {position.take_profit && (
                        <div>
                          <p className="text-muted-foreground">Take Profit</p>
                          <p className="font-medium text-success">${position.take_profit.toLocaleString()}</p>
                        </div>
                      )}
                      
                      {position.stop_loss && (
                        <div>
                          <p className="text-muted-foreground">Stop Loss</p>
                          <p className="font-medium text-destructive">${position.stop_loss.toLocaleString()}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-muted-foreground">Liquidation</p>
                        <p className="font-medium text-warning">${position.liquidation_price.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Risk Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Risk Level</span>
                        <span>{riskRatio.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={Math.min(riskRatio, 100)} 
                        className="h-2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}