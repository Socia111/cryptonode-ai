import { create } from 'zustand';

type State = {
  amountUSD: number;     // 0.10..100
  leverage: number;      // 1..100
  auto: boolean;         // auto ON/OFF
};

type Actions = {
  setAmountUSD: (v: number) => void;
  setLeverage: (v: number) => void;
  setAuto: (on: boolean) => void;
  load: () => void;
  save: () => void;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const useGlobalTrade = create<State & Actions>((set, get) => ({
  amountUSD: 10,
  leverage: 5,
  auto: false,

  setAmountUSD: (v) => set({ amountUSD: clamp(+v || 0.1, 0.1, 100) }),
  setLeverage: (v) => set({ leverage: clamp(Math.round(+v || 1), 1, 100) }),
  setAuto: (on) => {
    set({ auto: !!on });
    // also broadcast to any listeners
    window.dispatchEvent(new CustomEvent('autotrade:toggle', { detail: { enabled: !!on } }));
  },

  load: () => {
    const a = parseFloat(localStorage.getItem('g.amountUSD') || '10');
    const l = parseInt(localStorage.getItem('g.leverage') || '5', 10);
    const au = localStorage.getItem('g.auto') === '1';
    set({ amountUSD: clamp(a, 0.1, 100), leverage: clamp(l, 1, 100), auto: au });
  },

  save: () => {
    const { amountUSD, leverage, auto } = get();
    localStorage.setItem('g.amountUSD', String(amountUSD));
    localStorage.setItem('g.leverage', String(leverage));
    localStorage.setItem('g.auto', auto ? '1' : '0');
  },
}));

// persist once at app start
if (typeof window !== 'undefined') {
  const s = useGlobalTrade.getState();
  s.load();
  // auto-save on changes
  useGlobalTrade.subscribe(() => useGlobalTrade.getState().save());
}