import type { AutomationState, Mode } from '@/types/automation'
import { supabase } from '@/integrations/supabase/client'

const KEY = 'aix_automation_state_v1'

const DEFAULT: AutomationState = {
  connected: true, // Default to connected for restored system
  autoEnabled: true, // Enable auto-trading by default
  mode: 'live',
  activeTrades: 0,
  pnlToday: 0,
  riskLevel: 'balanced',
  maxPositionUSD: 100,
}

export const AutomationAPI = {
  async get(): Promise<AutomationState> {
    const raw = localStorage.getItem(KEY)
    const state = raw ? JSON.parse(raw) : DEFAULT
    
    // Fetch real-time stats from database
    try {
      const { data: stats } = await supabase
        .from('trading_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (stats) {
        state.activeTrades = stats.active_positions || 0
        state.pnlToday = stats.total_pnl || 0
      }
    } catch (error) {
      console.error('[Automation] Failed to fetch stats:', error)
    }
    
    return state
  },
  
  async set(next: Partial<AutomationState>): Promise<AutomationState> {
    const curr = await this.get()
    const merged = { ...curr, ...next }
    localStorage.setItem(KEY, JSON.stringify(merged))
    
    // Persist to app_settings
    try {
      await supabase
        .from('app_settings')
        .upsert({
          key: 'automation_state',
          value: merged,
          updated_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('[Automation] Failed to persist settings:', error)
    }
    
    return merged
  },
  
  // helpers
  async connectExchange() { 
    console.log('[Automation] Exchange connected')
    return this.set({ connected: true }) 
  },
  
  async toggleAuto(enabled: boolean) { 
    console.log(`[Automation] Auto-trading ${enabled ? 'enabled' : 'disabled'}`)
    return this.set({ autoEnabled: enabled }) 
  },
  
  async setMode(mode: Mode) { 
    console.log(`[Automation] Mode set to: ${mode}`)
    return this.set({ mode }) 
  },
}