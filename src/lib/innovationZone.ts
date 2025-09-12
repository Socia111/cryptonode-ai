// Innovation Zone pair detection for Bybit
// These pairs typically have higher fees (up to 0.11% taker) and higher risk

const INNOVATION_ZONE_PATTERNS = [
  // Common Innovation Zone suffixes/patterns
  /1000.*USDT$/i,  // 1000PEPE, 1000SHIB, etc.
  /.*CAT.*USDT$/i, // Various cat-themed tokens
  /.*DOG.*USDT$/i, // Various dog-themed tokens
  /.*INU.*USDT$/i, // Inu-themed tokens
  /.*MOON.*USDT$/i, // Moon-themed tokens
  
  // Specific Innovation Zone pairs (update as needed)
  /^(FLOKI|BABYDOGE|SAFEMOON|HOKK|KISHU|ELON|AKITA)USDT$/i,
];

// Known Innovation Zone pairs (manually maintained list)
const KNOWN_INNOVATION_PAIRS = new Set([
  'FLOKIUSDT',
  'BABYDOGEUSDT', 
  'SAFEMOONUSDT',
  '1000PEPEUSDT',
  '1000SHIBUSDT',
  '1000LUNCUSDT',
  '1000XECUSDT',
  // Add more as they appear
]);

export function isInnovationZonePair(symbol: string): boolean {
  if (!symbol) return false;
  
  const upperSymbol = symbol.toUpperCase();
  
  // Check known pairs first
  if (KNOWN_INNOVATION_PAIRS.has(upperSymbol)) {
    return true;
  }
  
  // Check patterns
  return INNOVATION_ZONE_PATTERNS.some(pattern => pattern.test(upperSymbol));
}

export function getInnovationZoneWarning(symbol: string): string | null {
  if (!isInnovationZonePair(symbol)) return null;
  
  return "⚠️ Innovation Zone pair: Higher fees (up to 0.11%) and increased risk";
}

export function getAdjustedRiskParams(baseParams: { slPercent: number; tpPercent: number; positionSize: number }) {
  // Apply stricter risk management for Innovation Zone pairs
  return {
    slPercent: Math.max(baseParams.slPercent, 2), // Minimum 2% SL
    tpPercent: baseParams.tpPercent, // Keep TP unchanged
    positionSize: baseParams.positionSize * 0.5  // Reduce position size by 50%
  };
}