import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Side, RollRequest, RollResult, RollError } from '@/types/roll';

interface RollPanelProps {
  defaultSymbol?: string;
}

const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT', 
  'SOLUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'LINKUSDT'
];

export default function RollPanel({ defaultSymbol = 'BTCUSDT' }: RollPanelProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [side, setSide] = useState<Side>('Buy');
  const [amountUSD, setAmountUSD] = useState<number>(100);
  const [loading, setLoading] = useState(false);

  const executeRoll = async () => {
    if (amountUSD < 10) {
      toast.error('Minimum amount is $10');
      return;
    }

    setLoading(true);
    
    try {
      const request: RollRequest = {
        symbol,
        side,
        amountUSD,
        clientId: `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      console.log('[RollPanel] Executing ROLL:', request);

      const response = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/roll-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0`
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData: RollError = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: RollResult = await response.json();
      
      console.log('[RollPanel] ROLL Success:', result);

      // Show success toast with trade details
      toast.success(
        `ROLL ${side} ${symbol} Executed!`,
        {
          description: `Entry: $${result.entryPrice.toFixed(4)} | TP: $${result.takeProfitPrice.toFixed(4)} | SL: $${result.stopLossPrice.toFixed(4)}`,
          duration: 8000,
        }
      );

    } catch (error: any) {
      console.error('[RollPanel] ROLL Error:', error);
      toast.error(`ROLL Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-primary" />
          ROLL Trade
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            <span className="text-primary font-bold">10×</span> Leverage
          </Badge>
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1 text-success" />
            <span className="text-success font-bold">+6%</span> TP
          </Badge>
          <Badge variant="outline" className="text-xs">
            <TrendingDown className="w-3 h-3 mr-1 text-destructive" />
            <span className="text-destructive font-bold">-3%</span> SL
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Symbol Selection */}
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger id="symbol">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_SYMBOLS.map((sym) => (
                <SelectItem key={sym} value={sym}>
                  {sym}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Side Selection */}
        <div className="space-y-2">
          <Label htmlFor="side">Direction</Label>
          <Select value={side} onValueChange={(value) => setSide(value as Side)}>
            <SelectTrigger id="side">
              <SelectValue placeholder="Select direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Buy">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span>Buy (Long)</span>
                </div>
              </SelectItem>
              <SelectItem value="Sell">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span>Sell (Short)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            type="number"
            min={10}
            step={10}
            value={amountUSD}
            onChange={(e) => setAmountUSD(Number(e.target.value))}
            placeholder="Enter amount in USD"
          />
          <p className="text-xs text-muted-foreground">
            Minimum: $10 • Estimated position size: ${(amountUSD * 10).toLocaleString()}
          </p>
        </div>

        {/* Execute Button */}
        <Button
          onClick={executeRoll}
          disabled={loading || amountUSD < 10}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Rolling...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              ROLL {side.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}