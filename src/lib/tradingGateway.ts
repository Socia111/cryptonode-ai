import { FEATURES } from '@/config/featureFlags'

export type ExecParams = {
  symbol: string
  side: 'BUY'|'SELL'
  notionalUSD: number
}

export const TradingGateway = {
  async execute(_p: ExecParams) {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }
    // (when re-enabling) call edge function or server here
    // return edgeFetch('/signal', { method:'POST', body: JSON.stringify(_p) })
    return { ok: true }
  },
  async bulkExecute(_list: ExecParams[]) {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }
    return { ok: true }
  }
}