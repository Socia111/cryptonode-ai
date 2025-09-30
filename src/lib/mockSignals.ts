// Mock signals for development and testing
// Only generates signals with 80%+ confidence

export type MockSignal = {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  tp: number;
  sl: number;
  score: number;
  timeframe: string;
  algo: string;
  created_at: string;
};

export function generateMockSignals(): MockSignal[] {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
  const timeframes = ['5m', '15m', '1h', '4h'];
  const algorithms = ['AItradeX1', 'Enhanced', 'Confluence'];
  
  return symbols.map((symbol, index) => {
    const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
    const price = 50000 + Math.random() * 50000; // Mock price
    const scoreBias = 80 + Math.random() * 12; // 80-92% confidence, rounded to 1 decimal
    
    // Calculate realistic TP/SL based on direction
    const riskReward = 1.5 + Math.random() * 2; // 1.5-3.5 RR
    const riskPercent = 0.01 + Math.random() * 0.02; // 1-3% risk
    
    const riskAmount = price * riskPercent;
    const rewardAmount = riskAmount * riskReward;
    
    const tp = direction === 'LONG' ? price + rewardAmount : price - rewardAmount;
    const sl = direction === 'LONG' ? price - riskAmount : price + riskAmount;
    
    return {
      id: `mock_${Date.now()}_${index}`,
      symbol,
      direction,
      price: Number(price.toFixed(4)),
      tp: Number(tp.toFixed(4)),
      sl: Number(sl.toFixed(4)),
      score: Math.round(scoreBias * 10) / 10, // Round to 1 decimal place
      timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
      algo: algorithms[Math.floor(Math.random() * algorithms.length)],
      created_at: new Date(Date.now() - Math.random() * 30 * 60 * 1000).toISOString() // Last 30 minutes
    };
  });
}