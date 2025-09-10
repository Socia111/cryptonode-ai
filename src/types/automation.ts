export type TradingStatus = 'connected' | 'disconnected'
export type Mode = 'paper' | 'live'

export interface AutomationState {
  connected: boolean
  autoEnabled: boolean
  mode: Mode
  activeTrades: number
  pnlToday: number
  riskLevel: 'conservative' | 'balanced' | 'aggressive'
  maxPositionUSD: number
}