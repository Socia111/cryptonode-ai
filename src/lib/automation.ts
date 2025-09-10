import type { AutomationState, Mode } from '@/types/automation'

const KEY = 'aix_automation_state_v1'

const DEFAULT: AutomationState = {
  connected: false,
  autoEnabled: false,
  mode: 'paper',
  activeTrades: 0,
  pnlToday: 0,
  riskLevel: 'conservative',
  maxPositionUSD: 100,
}

export const AutomationAPI = {
  async get(): Promise<AutomationState> {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : DEFAULT
  },
  async set(next: Partial<AutomationState>): Promise<AutomationState> {
    const curr = await this.get()
    const merged = { ...curr, ...next }
    localStorage.setItem(KEY, JSON.stringify(merged))
    return merged
  },
  // helpers
  async connectExchange() { return this.set({ connected: true }) },
  async toggleAuto(enabled: boolean) { return this.set({ autoEnabled: enabled }) },
  async setMode(mode: Mode) { return this.set({ mode }) },
}