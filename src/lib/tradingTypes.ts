export type Side = 'Buy' | 'Sell';

export function normalizeSide(input: string | Side): Side {
  const s = String(input).trim().toUpperCase();
  return s === 'SELL' || s === 'SHORT' ? 'Sell' : 'Buy';
}