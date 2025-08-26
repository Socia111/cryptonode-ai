import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BacktestParams {
  symbol: string
  timeframe: string
  start_date: string
  end_date: string
  initial_capital: number
  strategy_config: {
    indicators: string[]
    leverage: number
    stop_loss_percent: number
    take_profit_percent: number
    confidence_threshold: number
  }
}

interface BacktestResult {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_return: number
  max_drawdown: number
  sharpe_ratio: number
  profit_factor: number
  avg_trade_duration: number
  trades: TradeResult[]
}

interface TradeResult {
  entry_date: string
  exit_date: string
  symbol: string
  side: string
  entry_price: number
  exit_price: number
  quantity: number
  pnl: number
  pnl_percent: number
  duration_hours: number
  exit_reason: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const params: BacktestParams = await req.json()
    
    // Fetch historical data
    const historicalData = await fetchHistoricalData(params.symbol, params.timeframe, params.start_date, params.end_date)
    
    // Run backtest simulation
    const backtestResult = await runBacktest(historicalData, params)
    
    // Store backtest results
    const { data, error } = await supabase
      .from('backtest_results')
      .insert({
        symbol: params.symbol,
        timeframe: params.timeframe,
        start_date: params.start_date,
        end_date: params.end_date,
        initial_capital: params.initial_capital,
        strategy_config: params.strategy_config,
        results: backtestResult,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        backtest_id: data.id,
        results: backtestResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchHistoricalData(symbol: string, timeframe: string, startDate: string, endDate: string) {
  // In production, fetch from Binance/Bybit historical API
  // For demo, generate realistic price data
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  const data = []
  let currentPrice = 50000 + Math.random() * 10000 // Starting price
  let currentDate = new Date(start)
  
  for (let i = 0; i < diffDays * 24; i++) { // Hourly data
    const volatility = 0.02 + Math.random() * 0.02 // 2-4% volatility
    const change = (Math.random() - 0.5) * volatility
    
    const open = currentPrice
    const close = currentPrice * (1 + change)
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)
    const volume = 1000000 + Math.random() * 2000000
    
    data.push({
      timestamp: new Date(currentDate).toISOString(),
      open,
      high,
      low,
      close,
      volume
    })
    
    currentPrice = close
    currentDate.setHours(currentDate.getHours() + 1)
  }
  
  return data
}

async function runBacktest(historicalData: any[], params: BacktestParams): Promise<BacktestResult> {
  let capital = params.initial_capital
  let position = null
  const trades: TradeResult[] = []
  let maxCapital = capital
  let maxDrawdown = 0
  
  for (let i = 50; i < historicalData.length - 1; i++) { // Start after 50 periods for indicators
    const candle = historicalData[i]
    const indicators = calculateIndicators(historicalData.slice(i - 50, i + 1))
    
    // Generate signal
    const signal = generateBacktestSignal(indicators, params.strategy_config)
    
    // Close existing position if exit conditions met
    if (position) {
      const shouldExit = checkExitConditions(position, candle, indicators, params.strategy_config)
      
      if (shouldExit.exit) {
        const exitTrade = closePosition(position, candle, shouldExit.reason)
        trades.push(exitTrade)
        capital += exitTrade.pnl
        position = null
        
        // Update max drawdown
        if (capital > maxCapital) maxCapital = capital
        const drawdown = (maxCapital - capital) / maxCapital
        if (drawdown > maxDrawdown) maxDrawdown = drawdown
      }
    }
    
    // Open new position if signal and no existing position
    if (!position && signal && signal.confidence > params.strategy_config.confidence_threshold) {
      position = openPosition(signal, candle, capital, params.strategy_config.leverage)
    }
  }
  
  // Close any remaining position
  if (position) {
    const finalCandle = historicalData[historicalData.length - 1]
    const exitTrade = closePosition(position, finalCandle, 'backtest_end')
    trades.push(exitTrade)
    capital += exitTrade.pnl
  }
  
  // Calculate metrics
  const winningTrades = trades.filter(t => t.pnl > 0)
  const losingTrades = trades.filter(t => t.pnl <= 0)
  const totalReturn = (capital - params.initial_capital) / params.initial_capital
  
  const avgWin = winningTrades.length > 0 ? 
    winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? 
    Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0)) / losingTrades.length : 0
  
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0
  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0
  
  // Simplified Sharpe ratio calculation
  const avgReturn = trades.length > 0 ? 
    trades.reduce((sum, t) => sum + t.pnl_percent, 0) / trades.length : 0
  const returnStdDev = trades.length > 1 ? 
    Math.sqrt(trades.reduce((sum, t) => sum + Math.pow(t.pnl_percent - avgReturn, 2), 0) / trades.length) : 0
  const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0
  
  const avgTradeDuration = trades.length > 0 ?
    trades.reduce((sum, t) => sum + t.duration_hours, 0) / trades.length : 0
  
  return {
    total_trades: trades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: winRate,
    total_return: totalReturn,
    max_drawdown: maxDrawdown,
    sharpe_ratio: sharpeRatio,
    profit_factor: profitFactor,
    avg_trade_duration: avgTradeDuration,
    trades: trades.slice(-20) // Return last 20 trades for display
  }
}

function calculateIndicators(data: any[]) {
  const closes = data.map(d => d.close)
  const volumes = data.map(d => d.volume)
  
  // Simple moving averages
  const sma21 = closes.slice(-21).reduce((a, b) => a + b, 0) / 21
  const sma200 = closes.length >= 200 ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 : sma21
  
  // RSI calculation (simplified)
  const gains = []
  const losses = []
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14
  const rsi = avgLoss > 0 ? 100 - (100 / (1 + avgGain / avgLoss)) : 100
  
  // Volume ratio
  const avgVolume = volumes.slice(-14).reduce((a, b) => a + b, 0) / 14
  const volumeRatio = volumes[volumes.length - 1] / avgVolume
  
  return {
    price: closes[closes.length - 1],
    sma21,
    sma200,
    rsi,
    volumeRatio
  }
}

function generateBacktestSignal(indicators: any, config: any) {
  const { price, sma21, sma200, rsi, volumeRatio } = indicators
  
  let confidence = 50
  let direction = null
  
  // Golden Cross
  if (sma21 > sma200 && rsi < 70 && volumeRatio > 1.2) {
    direction = 'BUY'
    confidence += 25
  }
  // Death Cross
  else if (sma21 < sma200 && rsi > 30 && volumeRatio > 1.2) {
    direction = 'SELL'
    confidence += 20
  }
  
  // RSI signals
  if (rsi < 30) confidence += 15
  if (rsi > 70) confidence += 10
  
  // Volume confirmation
  if (volumeRatio > 1.5) confidence += 10
  
  return direction ? { direction, confidence, price } : null
}

function checkExitConditions(position: any, candle: any, indicators: any, config: any) {
  const currentPrice = candle.close
  const pnlPercent = position.side === 'BUY' 
    ? (currentPrice - position.entry_price) / position.entry_price
    : (position.entry_price - currentPrice) / position.entry_price
  
  // Stop loss
  if (pnlPercent <= -config.stop_loss_percent / 100) {
    return { exit: true, reason: 'stop_loss' }
  }
  
  // Take profit
  if (pnlPercent >= config.take_profit_percent / 100) {
    return { exit: true, reason: 'take_profit' }
  }
  
  // Trend reversal
  if (position.side === 'BUY' && indicators.sma21 < indicators.sma200) {
    return { exit: true, reason: 'trend_reversal' }
  }
  if (position.side === 'SELL' && indicators.sma21 > indicators.sma200) {
    return { exit: true, reason: 'trend_reversal' }
  }
  
  return { exit: false, reason: null }
}

function openPosition(signal: any, candle: any, capital: number, leverage: number) {
  const quantity = (capital * 0.1 * leverage) / signal.price // Use 10% of capital
  
  return {
    side: signal.direction,
    entry_price: signal.price,
    entry_date: candle.timestamp,
    quantity,
    leverage
  }
}

function closePosition(position: any, candle: any, reason: string): TradeResult {
  const exitPrice = candle.close
  const entryDate = new Date(position.entry_date)
  const exitDate = new Date(candle.timestamp)
  const durationHours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60)
  
  const pnlPercent = position.side === 'BUY' 
    ? (exitPrice - position.entry_price) / position.entry_price
    : (position.entry_price - exitPrice) / position.entry_price
  
  const pnl = position.quantity * position.entry_price * pnlPercent * position.leverage
  
  return {
    entry_date: position.entry_date,
    exit_date: candle.timestamp,
    symbol: 'BTC/USDT', // TODO: get from params
    side: position.side,
    entry_price: position.entry_price,
    exit_price: exitPrice,
    quantity: position.quantity,
    pnl,
    pnl_percent: pnlPercent * 100,
    duration_hours: durationHours,
    exit_reason: reason
  }
}