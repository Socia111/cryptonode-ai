import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BacktestParams {
  symbol: string;
  strategy: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  leverage: number;
  stopLoss: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Backtest Engine started');
    
    const params: BacktestParams = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Real historical backtest using Bybit OHLCV data
    const runRealBacktest = async () => {
      const trades = [];
      const startCapital = params.initialCapital || 10000;
      let currentCapital = startCapital;
      let winCount = 0;
      let lossCount = 0;
      let maxDrawdownValue = 0;
      let peak = startCapital;
      
      // Fetch real historical data from Bybit
      const interval = params.timeframe === '1h' ? '60' : params.timeframe === '5m' ? '5' : '15';
      const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${params.symbol}&interval=${interval}&limit=1000`;
      
      console.log(`📊 Fetching real data from Bybit: ${params.symbol} ${params.timeframe}`);
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.retCode !== 0) {
          throw new Error(`Bybit API error: ${data.retMsg}`);
        }
        
        const candles = data.result.list.reverse(); // Bybit returns newest first
        console.log(`✅ Fetched ${candles.length} real candles from Bybit`);
        
        // AItradeX1 backtest logic on real historical data
        for (let i = 200; i < candles.length - 1; i++) {
          const currentBar = candles[i];
          const nextBar = candles[i + 1];
          
          const close = parseFloat(currentBar[4]);
          const nextClose = parseFloat(nextBar[4]);
          const high = parseFloat(currentBar[2]);
          const low = parseFloat(currentBar[3]);
          
          // Calculate real EMA21 and SMA200 from historical data
          const last21Closes = candles.slice(i - 20, i + 1).map(c => parseFloat(c[4]));
          const ema21 = calculateEMA(last21Closes, 21);
          
          const last200Closes = candles.slice(Math.max(0, i - 199), i + 1).map(c => parseFloat(c[4]));
          const sma200 = last200Closes.reduce((a, b) => a + b, 0) / last200Closes.length;
          
          // Entry condition: EMA21 > SMA200 and price above EMA21
          const prevClose = parseFloat(candles[i - 1][4]);
          const prevEma = i > 21 ? calculateEMA(candles.slice(i - 21, i).map(c => parseFloat(c[4])), 21) : ema21;
          
          if (prevClose <= prevEma && close > ema21 && ema21 > sma200) {
            const direction = 'LONG';
            const entryPrice = close;
            const stopLoss = close * (1 - params.stopLoss / 100);
            const takeProfit = close * (1 + params.stopLoss * 2 / 100); // 2:1 RR
            
            // Check exit on next bar using real OHLC data
            let exitPrice = nextClose;
            let status = 'WIN';
            
            if (parseFloat(nextBar[3]) <= stopLoss) { // Hit stop loss (real low)
              exitPrice = stopLoss;
              status = 'LOSS';
            } else if (parseFloat(nextBar[2]) >= takeProfit) { // Hit take profit (real high)
              exitPrice = takeProfit;
              status = 'WIN';
            } else {
              // Exit at close, determine win/loss
              status = nextClose > entryPrice ? 'WIN' : 'LOSS';
            }
            
            const profit = (exitPrice - entryPrice) / entryPrice;
            const tradeAmount = currentCapital * 0.02; // 2% risk per trade
            const pnl = tradeAmount * profit * params.leverage;
            currentCapital += pnl;
            
            // Track drawdown
            if (currentCapital > peak) peak = currentCapital;
            const drawdown = (peak - currentCapital) / peak * 100;
            if (drawdown > maxDrawdownValue) maxDrawdownValue = drawdown;
            
            if (status === 'WIN') winCount++;
            else lossCount++;
            
            trades.push({
              id: trades.length + 1,
              timestamp: new Date(parseInt(currentBar[0])).toISOString(),
              direction,
              entry_price: entryPrice,
              exit_price: exitPrice,
              pnl,
              pnl_percentage: profit * 100,
              status
            });
          }
        }
        
        const totalReturn = ((currentCapital - startCapital) / startCapital) * 100;
        const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
        const sharpeRatio = totalReturn / Math.max(maxDrawdownValue, 1); // Simplified Sharpe
        
        return {
          summary: {
            total_trades: trades.length,
            winning_trades: winCount,
            losing_trades: lossCount,
            win_rate: winRate,
            total_return: totalReturn,
            max_drawdown: maxDrawdownValue,
            sharpe_ratio: sharpeRatio,
            initial_capital: startCapital,
            final_capital: currentCapital,
            net_profit: currentCapital - startCapital
          },
          trades,
          performance_chart: trades.map((trade, index) => ({
            date: trade.timestamp,
            cumulative_pnl: trades.slice(0, index + 1).reduce((sum, t) => sum + t.pnl, 0),
            equity: startCapital + trades.slice(0, index + 1).reduce((sum, t) => sum + t.pnl, 0)
          }))
        };
        
      } catch (error) {
        console.error('❌ Failed to fetch Bybit data:', error);
        throw new Error(`Failed to fetch real market data: ${error.message}`);
      }
    };

    // Helper function to calculate EMA
    function calculateEMA(prices: number[], period: number): number {
      const multiplier = 2 / (period + 1);
      let ema = prices[0];
      
      for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
      }
      
      return ema;
    }

    const results = await runRealBacktest();
    
    console.log(`✅ Real backtest completed: ${results.summary.total_trades} trades, ${results.summary.win_rate.toFixed(1)}% win rate`);

    return new Response(JSON.stringify({
      success: true,
      backtest_completed: true,
      strategy: params.strategy,
      symbol: params.symbol,
      timeframe: params.timeframe,
      results,
      data_source: 'bybit_real_ohlcv',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Backtest Engine Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});