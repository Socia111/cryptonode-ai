import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AutoTradeState = {
  enabled: boolean;
  amountUSD: number;     // 0.10–100
  leverage: number;      // 1–100
  // helpers
  setEnabled: (v: boolean) => void;
  setAmountUSD: (v: number) => void;
  setLeverage: (v: number) => void;
};

export const useAutoTradeStore = create<AutoTradeState>()(
  persist(
    (set, get) => ({
      enabled: false,
      amountUSD: 10,
      leverage: 5,
      setEnabled: (v) => set({ enabled: v }),
      setAmountUSD: (v) => set({ amountUSD: Math.min(100, Math.max(0.10, Number(v) || 0.10)) }),
      setLeverage: (v) => set({ leverage: Math.min(100, Math.max(1, Math.round(Number(v) || 1))) }),
    }),
    { name: 'autotrade.store.v1' }
  )
);