import { useEffect, useState } from 'react'
import { AutomationAPI } from '@/lib/automation'

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
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Auto-Trading</div>
          <div className="text-lg font-semibold">{enabled ? 'Enabled' : 'Disabled'}</div>
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => onMode('paper')}
                className={`px-3 py-2 rounded-md text-xs transition-colors
                            ${mode==='paper' ? 'bg-blue-600 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
          Paper Mode
        </button>
        <button onClick={() => onMode('live')}
                disabled
                className={`px-3 py-2 rounded-md text-xs transition-colors opacity-50 cursor-not-allowed
                            ${mode==='live' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
          Live (disabled for now)
        </button>
      </div>

      {enabled && mode==='paper' && (
        <div className="mt-3 text-xs text-blue-400">
          Paper mode enabled — simulation only, no exchange calls.
        </div>
      )}
    </div>
  )
}