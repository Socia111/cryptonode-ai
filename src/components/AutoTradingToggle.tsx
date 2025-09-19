import { useEffect, useState } from 'react'
import { AutomationAPI } from '@/lib/automation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuthGuardedButton } from './AuthGuardedButton'
import { supabase } from '@/integrations/supabase/client'

export default function AutoTradingToggle() {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<'paper'|'live'>('paper')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })

    // Load automation settings
    const loadSettings = async () => {
      const s = await AutomationAPI.get()
      setEnabled(s.autoEnabled)
      setMode(s.mode)
      setLoading(false)
    }
    loadSettings()

    return () => subscription.unsubscribe()
  }, [])

  const onToggle = async () => {
    setLoading(true)
    const next = !enabled
    await AutomationAPI.toggleAuto(next)
    setEnabled(next)
    setLoading(false)
  }

  const onMode = async (m:'paper'|'live') => {
    setLoading(true)
    await AutomationAPI.setMode(m)
    setMode(m)
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      {/* Clear Mode Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-muted-foreground">Trading Mode</div>
          <div className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Trading
          </div>
        </div>
        <Badge variant="destructive">
          REAL MONEY
        </Badge>
      </div>

      {/* Auto-Trading Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-muted-foreground">Auto-Execute Signals</div>
          <div className="text-base font-medium">{enabled ? 'Enabled' : 'Disabled'}</div>
        </div>
        
        <AuthGuardedButton
          onClick={onToggle}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                     ${enabled ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                               : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
        >
          {loading ? 'Please wait…' : enabled ? 'Disable' : 'Enable'}
        </AuthGuardedButton>
      </div>

      {/* Live Trading Only */}
      <div className="pt-3 border-t border-border/50">
        <div className="text-xs text-muted-foreground mb-2">Live Trading Only</div>
        <div className="bg-red-600 text-white px-3 py-2 rounded-md text-xs">
          ⚡ Real Money Trading
        </div>
      </div>

      {/* Authentication Warning */}
      {!isAuthenticated && (
        <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="text-xs text-warning">
            ⚠️ Please sign in to enable auto trading
          </div>
        </div>
      )}

      {/* Clear Status Message */}
      <div className="mt-3 text-xs">
        <div className="text-red-400">
          ⚠️ Live trading — real money at risk on Bybit exchange
        </div>
      </div>
    </div>
  )
}