// Number utilities - prevent NaN and provide safe math operations
export const toNum = (x: any, defaultValue = 0): number => {
  const num = Number(x);
  return Number.isFinite(num) ? num : defaultValue;
};

export const clamp = (n: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, n));
};

export const clampPercent = (n: number): number => {
  return clamp(n, -100, 100);
};

export const safePercent = (value: any, digits = 1): string => {
  return clampPercent(toNum(value)).toFixed(digits) + '%';
};

export const safeMath = {
  add: (a: any, b: any) => toNum(a) + toNum(b),
  multiply: (a: any, b: any) => toNum(a) * toNum(b),
  divide: (a: any, b: any) => {
    const denominator = toNum(b);
    return denominator === 0 ? 0 : toNum(a) / denominator;
  },
  percent: (value: any, total: any) => {
    const t = toNum(total);
    return t === 0 ? 0 : (toNum(value) / t) * 100;
  }
};