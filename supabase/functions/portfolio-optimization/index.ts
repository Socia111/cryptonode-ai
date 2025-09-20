// Advanced portfolio optimization and risk management
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PortfolioMetrics {
  totalValue: number
  dailyPnL: number
  weeklyPnL: number
  monthlyPnL: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
}

interface OptimizationRecommendation {
  action: 'reduce' | 'increase' | 'rebalance' | 'hedge'
  symbol: string
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
  expectedImpact: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { user_id, action = 'analyze' } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'user_id is required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    let result;

    switch (action) {
      case 'analyze':
        result = await analyzePortfolio(supabase, user_id)
        break
      case 'optimize':
        result = await optimizePortfolio(supabase, user_id)
        break
      case 'risk_assessment':
        result = await assessRisk(supabase, user_id)
        break
      case 'rebalance':
        result = await rebalancePortfolio(supabase, user_id)
        break
      default:
        result = await analyzePortfolio(supabase, user_id)
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      user_id,
      result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Portfolio optimization error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function analyzePortfolio(supabase: any, userId: string) {
  // Get user's trading history
  const { data: trades } = await supabase
    .from('execution_orders')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!trades || trades.length === 0) {
    return {
      message: 'No trading history found',
      metrics: null,
      recommendations: []
    }
  }

  // Calculate portfolio metrics
  const metrics = calculatePortfolioMetrics(trades)
  
  // Generate recommendations
  const recommendations = generateRecommendations(trades, metrics)

  // Get current positions
  const currentPositions = await getCurrentPositions(supabase, userId)

  return {
    metrics,
    recommendations,
    currentPositions,
    analysis: {
      totalTrades: trades.length,
      avgTradeSize: trades.reduce((sum, trade) => sum + (trade.amount_usd || 0), 0) / trades.length,
      bestPerformingSymbol: findBestPerformingSymbol(trades),
      worstPerformingSymbol: findWorstPerformingSymbol(trades),
      tradingFrequency: calculateTradingFrequency(trades)
    }
  }
}

async function optimizePortfolio(supabase: any, userId: string) {
  // Get current portfolio state
  const portfolioAnalysis = await analyzePortfolio(supabase, userId)
  
  // Apply Modern Portfolio Theory optimization
  const optimizationResults = await applyMPTOptimization(portfolioAnalysis)
  
  // Generate actionable optimization steps
  const optimizationPlan = generateOptimizationPlan(optimizationResults)

  return {
    currentState: portfolioAnalysis.metrics,
    optimizedAllocation: optimizationResults.allocation,
    expectedImprovement: optimizationResults.expectedImprovement,
    actionPlan: optimizationPlan,
    riskReduction: optimizationResults.riskReduction
  }
}

async function assessRisk(supabase: any, userId: string) {
  // Get user's trading config for risk preferences
  const { data: config } = await supabase
    .from('automated_trading_config')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Get current positions
  const currentPositions = await getCurrentPositions(supabase, userId)
  
  // Calculate various risk metrics
  const riskMetrics = {
    portfolioVar: calculateValueAtRisk(currentPositions),
    concentrationRisk: calculateConcentrationRisk(currentPositions),
    correlationRisk: await calculateCorrelationRisk(supabase, currentPositions),
    leverageRisk: calculateLeverageRisk(currentPositions),
    liquidityRisk: calculateLiquidityRisk(currentPositions)
  }

  // Generate risk warnings
  const riskWarnings = generateRiskWarnings(riskMetrics, config)

  return {
    riskScore: calculateOverallRiskScore(riskMetrics),
    riskMetrics,
    warnings: riskWarnings,
    recommendations: generateRiskMitigationRecommendations(riskMetrics)
  }
}

async function rebalancePortfolio(supabase: any, userId: string) {
  // Get optimal allocation from optimization
  const optimization = await optimizePortfolio(supabase, userId)
  
  // Get current positions
  const currentPositions = await getCurrentPositions(supabase, userId)
  
  // Calculate required trades for rebalancing
  const rebalanceTrades = calculateRebalanceTrades(
    currentPositions, 
    optimization.optimizedAllocation
  )

  // Estimate costs and impact
  const rebalanceCosts = estimateRebalanceCosts(rebalanceTrades)

  return {
    currentAllocation: currentPositions,
    targetAllocation: optimization.optimizedAllocation,
    requiredTrades: rebalanceTrades,
    estimatedCosts: rebalanceCosts,
    netBenefit: optimization.expectedImprovement.totalReturn - rebalanceCosts.totalCost,
    executionPriority: prioritizeRebalanceTrades(rebalanceTrades)
  }
}

// Helper functions

function calculatePortfolioMetrics(trades: any[]): PortfolioMetrics {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Calculate PnL for different periods
  const dailyTrades = trades.filter(t => new Date(t.created_at) >= oneDayAgo)
  const weeklyTrades = trades.filter(t => new Date(t.created_at) >= oneWeekAgo)
  const monthlyTrades = trades.filter(t => new Date(t.created_at) >= oneMonthAgo)

  const dailyPnL = calculatePnL(dailyTrades)
  const weeklyPnL = calculatePnL(weeklyTrades)
  const monthlyPnL = calculatePnL(monthlyTrades)

  // Calculate risk metrics
  const returns = calculateReturns(trades)
  const sharpeRatio = calculateSharpeRatio(returns)
  const maxDrawdown = calculateMaxDrawdown(returns)
  
  // Calculate trading statistics
  const winningTrades = trades.filter(t => (t.avg_price || 0) > (t.executed_price || 0))
  const winRate = winningTrades.length / trades.length

  const profitFactor = calculateProfitFactor(trades)

  return {
    totalValue: trades.reduce((sum, t) => sum + (t.amount_usd || 0), 0),
    dailyPnL,
    weeklyPnL,
    monthlyPnL,
    sharpeRatio,
    maxDrawdown,
    winRate,
    profitFactor
  }
}

function calculatePnL(trades: any[]): number {
  return trades.reduce((sum, trade) => {
    // Simplified PnL calculation
    const pnl = (trade.avg_price || 0) - (trade.executed_price || 0)
    return sum + pnl
  }, 0)
}

function calculateReturns(trades: any[]): number[] {
  const returns = []
  for (let i = 1; i < trades.length; i++) {
    const currentPrice = trades[i].avg_price || trades[i].executed_price || 0
    const previousPrice = trades[i-1].avg_price || trades[i-1].executed_price || 0
    if (previousPrice > 0) {
      returns.push((currentPrice - previousPrice) / previousPrice)
    }
  }
  return returns
}

function calculateSharpeRatio(returns: number[]): number {
  if (returns.length === 0) return 0
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  
  return stdDev === 0 ? 0 : avgReturn / stdDev
}

function calculateMaxDrawdown(returns: number[]): number {
  let maxDrawdown = 0
  let peak = 0
  let current = 0
  
  for (const returnValue of returns) {
    current = Math.max(0, current + returnValue)
    peak = Math.max(peak, current)
    const drawdown = (peak - current) / peak
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  }
  
  return maxDrawdown
}

function calculateProfitFactor(trades: any[]): number {
  const winningTrades = trades.filter(t => (t.avg_price || 0) > (t.executed_price || 0))
  const losingTrades = trades.filter(t => (t.avg_price || 0) < (t.executed_price || 0))
  
  const grossProfit = winningTrades.reduce((sum, t) => 
    sum + ((t.avg_price || 0) - (t.executed_price || 0)), 0)
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => 
    sum + ((t.avg_price || 0) - (t.executed_price || 0)), 0))
  
  return grossLoss === 0 ? grossProfit : grossProfit / grossLoss
}

function generateRecommendations(trades: any[], metrics: PortfolioMetrics): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = []
  
  // Risk-based recommendations
  if (metrics.sharpeRatio < 1.0) {
    recommendations.push({
      action: 'reduce',
      symbol: 'HIGH_RISK_POSITIONS',
      reason: 'Low Sharpe ratio indicates poor risk-adjusted returns',
      riskLevel: 'high',
      expectedImpact: 0.15
    })
  }
  
  if (metrics.maxDrawdown > 0.2) {
    recommendations.push({
      action: 'hedge',
      symbol: 'PORTFOLIO',
      reason: 'High maximum drawdown suggests need for hedging',
      riskLevel: 'high',
      expectedImpact: 0.25
    })
  }
  
  if (metrics.winRate < 0.5) {
    recommendations.push({
      action: 'rebalance',
      symbol: 'STRATEGY',
      reason: 'Low win rate suggests strategy adjustment needed',
      riskLevel: 'medium',
      expectedImpact: 0.1
    })
  }
  
  return recommendations
}

function findBestPerformingSymbol(trades: any[]): string {
  const symbolPerformance = new Map()
  
  trades.forEach(trade => {
    const symbol = trade.symbol
    const pnl = (trade.avg_price || 0) - (trade.executed_price || 0)
    symbolPerformance.set(symbol, (symbolPerformance.get(symbol) || 0) + pnl)
  })
  
  let bestSymbol = ''
  let bestPerformance = -Infinity
  
  for (const [symbol, performance] of symbolPerformance.entries()) {
    if (performance > bestPerformance) {
      bestPerformance = performance
      bestSymbol = symbol
    }
  }
  
  return bestSymbol
}

function findWorstPerformingSymbol(trades: any[]): string {
  const symbolPerformance = new Map()
  
  trades.forEach(trade => {
    const symbol = trade.symbol
    const pnl = (trade.avg_price || 0) - (trade.executed_price || 0)
    symbolPerformance.set(symbol, (symbolPerformance.get(symbol) || 0) + pnl)
  })
  
  let worstSymbol = ''
  let worstPerformance = Infinity
  
  for (const [symbol, performance] of symbolPerformance.entries()) {
    if (performance < worstPerformance) {
      worstPerformance = performance
      worstSymbol = symbol
    }
  }
  
  return worstSymbol
}

function calculateTradingFrequency(trades: any[]): number {
  if (trades.length < 2) return 0
  
  const firstTrade = new Date(trades[trades.length - 1].created_at)
  const lastTrade = new Date(trades[0].created_at)
  const daysDiff = (lastTrade.getTime() - firstTrade.getTime()) / (1000 * 60 * 60 * 24)
  
  return daysDiff > 0 ? trades.length / daysDiff : 0
}

async function getCurrentPositions(supabase: any, userId: string) {
  const { data: positions } = await supabase
    .from('execution_orders')
    .select('symbol, side, amount_usd, avg_price')
    .eq('user_id', userId)
    .eq('status', 'completed')
  
  // Group by symbol and calculate net position
  const netPositions = new Map()
  
  positions?.forEach(pos => {
    const symbol = pos.symbol
    const amount = pos.side === 'buy' ? pos.amount_usd : -pos.amount_usd
    netPositions.set(symbol, (netPositions.get(symbol) || 0) + amount)
  })
  
  return Array.from(netPositions.entries()).map(([symbol, amount]) => ({
    symbol,
    amount,
    percentage: 0 // Will be calculated based on total portfolio value
  }))
}

async function applyMPTOptimization(portfolioAnalysis: any) {
  // Simplified Modern Portfolio Theory optimization
  // In a real implementation, this would use more sophisticated algorithms
  
  const currentPositions = portfolioAnalysis.currentPositions
  const expectedReturns = new Map()
  const riskLevels = new Map()
  
  // Estimate expected returns and risks for each position
  currentPositions.forEach(pos => {
    // Simplified risk/return estimation
    expectedReturns.set(pos.symbol, Math.random() * 0.1 - 0.05) // -5% to 5%
    riskLevels.set(pos.symbol, Math.random() * 0.2) // 0% to 20% volatility
  })
  
  // Calculate optimal allocation (simplified)
  const totalValue = currentPositions.reduce((sum, pos) => sum + Math.abs(pos.amount), 0)
  const optimizedAllocation = currentPositions.map(pos => ({
    symbol: pos.symbol,
    currentWeight: Math.abs(pos.amount) / totalValue,
    optimalWeight: 1 / currentPositions.length, // Equal weight for simplicity
    expectedReturn: expectedReturns.get(pos.symbol),
    risk: riskLevels.get(pos.symbol)
  }))
  
  return {
    allocation: optimizedAllocation,
    expectedImprovement: {
      totalReturn: 0.05, // 5% expected improvement
      riskReduction: 0.1 // 10% risk reduction
    },
    riskReduction: 0.1
  }
}

function generateOptimizationPlan(optimizationResults: any) {
  return optimizationResults.allocation.map(asset => {
    const weightDiff = asset.optimalWeight - asset.currentWeight
    
    if (Math.abs(weightDiff) > 0.05) { // 5% threshold
      return {
        symbol: asset.symbol,
        action: weightDiff > 0 ? 'increase' : 'decrease',
        targetChange: Math.abs(weightDiff),
        priority: Math.abs(weightDiff) > 0.1 ? 'high' : 'medium',
        rationale: `Optimize risk-adjusted returns`
      }
    }
    
    return null
  }).filter(Boolean)
}

// Risk assessment functions
function calculateValueAtRisk(positions: any[]): number {
  // Simplified VaR calculation (1% VaR)
  const portfolioValue = positions.reduce((sum, pos) => sum + Math.abs(pos.amount), 0)
  const avgVolatility = 0.02 // 2% daily volatility assumption
  return portfolioValue * avgVolatility * 2.33 // 99% confidence level
}

function calculateConcentrationRisk(positions: any[]): number {
  const totalValue = positions.reduce((sum, pos) => sum + Math.abs(pos.amount), 0)
  const maxPosition = Math.max(...positions.map(pos => Math.abs(pos.amount)))
  return maxPosition / totalValue
}

async function calculateCorrelationRisk(supabase: any, positions: any[]): Promise<number> {
  // Simplified correlation risk - would need historical price data for real calculation
  return 0.7 // Assume 70% average correlation
}

function calculateLeverageRisk(positions: any[]): number {
  // Simplified leverage calculation
  return 1.0 // Assume no leverage for simplicity
}

function calculateLiquidityRisk(positions: any[]): number {
  // Simplified liquidity risk based on position sizes
  const avgPositionSize = positions.reduce((sum, pos) => sum + Math.abs(pos.amount), 0) / positions.length
  return avgPositionSize > 10000 ? 0.8 : 0.3 // High liquidity risk for large positions
}

function calculateOverallRiskScore(riskMetrics: any): number {
  // Weighted risk score (0-100)
  const weights = {
    portfolioVar: 0.3,
    concentrationRisk: 0.25,
    correlationRisk: 0.2,
    leverageRisk: 0.15,
    liquidityRisk: 0.1
  }
  
  const normalizedMetrics = {
    portfolioVar: Math.min(riskMetrics.portfolioVar / 1000, 1), // Normalize to 0-1
    concentrationRisk: riskMetrics.concentrationRisk,
    correlationRisk: riskMetrics.correlationRisk,
    leverageRisk: Math.min(riskMetrics.leverageRisk / 5, 1), // Max leverage 5x
    liquidityRisk: riskMetrics.liquidityRisk
  }
  
  let score = 0
  for (const [metric, value] of Object.entries(normalizedMetrics)) {
    score += weights[metric] * value
  }
  
  return Math.round(score * 100)
}

function generateRiskWarnings(riskMetrics: any, config: any) {
  const warnings = []
  
  if (riskMetrics.concentrationRisk > 0.4) {
    warnings.push({
      level: 'high',
      message: 'Portfolio is highly concentrated in a single asset',
      recommendation: 'Consider diversifying across more assets'
    })
  }
  
  if (riskMetrics.portfolioVar > (config?.risk_per_trade || 0.02) * 10) {
    warnings.push({
      level: 'medium',
      message: 'Portfolio VaR exceeds risk tolerance',
      recommendation: 'Reduce position sizes or add hedging'
    })
  }
  
  return warnings
}

function generateRiskMitigationRecommendations(riskMetrics: any) {
  const recommendations = []
  
  if (riskMetrics.concentrationRisk > 0.3) {
    recommendations.push({
      type: 'diversification',
      priority: 'high',
      description: 'Add more uncorrelated assets to reduce concentration risk'
    })
  }
  
  if (riskMetrics.correlationRisk > 0.8) {
    recommendations.push({
      type: 'correlation_reduction',
      priority: 'medium',
      description: 'Consider adding inversely correlated assets'
    })
  }
  
  return recommendations
}

function calculateRebalanceTrades(currentPositions: any[], targetAllocation: any[]) {
  const trades = []
  
  for (const target of targetAllocation) {
    const current = currentPositions.find(pos => pos.symbol === target.symbol)
    const currentWeight = current ? Math.abs(current.amount) : 0
    const weightDiff = target.optimalWeight - currentWeight
    
    if (Math.abs(weightDiff) > 0.05) {
      trades.push({
        symbol: target.symbol,
        action: weightDiff > 0 ? 'buy' : 'sell',
        amount: Math.abs(weightDiff * 10000), // Assume $10k total portfolio
        priority: Math.abs(weightDiff) > 0.1 ? 'high' : 'medium'
      })
    }
  }
  
  return trades
}

function estimateRebalanceCosts(trades: any[]) {
  const tradingFee = 0.001 // 0.1% trading fee
  const slippage = 0.002 // 0.2% slippage
  const totalCostRate = tradingFee + slippage
  
  const totalTradeValue = trades.reduce((sum, trade) => sum + trade.amount, 0)
  const totalCost = totalTradeValue * totalCostRate
  
  return {
    totalCost,
    tradingFees: totalTradeValue * tradingFee,
    slippageCost: totalTradeValue * slippage,
    numberOfTrades: trades.length
  }
}

function prioritizeRebalanceTrades(trades: any[]) {
  return trades
    .sort((a, b) => {
      // Priority: high > medium, then by amount
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1
      }
      return b.amount - a.amount
    })
    .map((trade, index) => ({
      ...trade,
      executionOrder: index + 1
    }))
}