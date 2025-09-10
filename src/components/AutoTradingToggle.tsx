import { useEffect, useState } from 'react'
import { AutomationAPI } from '@/lib/automation'
import { Badge } from '@/components/ui/badge'

export default function AutoTradingToggle() {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<'paper'|'live'>('paper')

  useEffect(() => {
    (async () => {
      const s = await AutomationAPI.get()
      setEnabled(s.autoEnabled)
      setMode(s.mode)
      setLoading(false)
    })()
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
            {mode === 'live' ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live Trading
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Paper Trading
              </>
            )}
          </div>
        </div>
        <Badge variant={mode === 'live' ? 'destructive' : 'secondary'}>
          {mode === 'live' ? 'REAL MONEY' : 'SIMULATION'}
        </Badge>
      </div>

      {/* Auto-Trading Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-muted-foreground">Auto-Execute Signals</div>
          <div className="text-base font-medium">{enabled ? 'Enabled' : 'Disabled'}</div>
        </div>
        <button
          onClick={onToggle}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                     ${enabled ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                               : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
        >
          {loading ? 'Please wait…' : enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Mode Selector - Only show paper for now */}
      <div className="pt-3 border-t border-border/50">
        <div className="text-xs text-muted-foreground mb-2">Trading Mode</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onMode('paper')}
                  className={`px-3 py-2 rounded-md text-xs transition-colors
                              ${mode==='paper' ? 'bg-blue-600 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
            📝 Paper Mode
          </button>
          <button className="px-3 py-2 rounded-md text-xs bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50">
            ⚡ Live (Coming Soon)
          </button>
        </div>
      </div>

      {/* Clear Status Message */}
      <div className="mt-3 text-xs">
        {mode === 'paper' ? (
          <div className="text-blue-400">
            📝 Simulation mode — no real trades, no exchange calls
          </div>
        ) : (
          <div className="text-red-400">
            ⚠️ Live mode — real money at risk on Bybit exchange
          </div>
        )}
      </div>
    </div>
  )
}