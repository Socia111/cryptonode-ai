import { useEffect, useState } from 'react'
import MainLayout from '@/layouts/MainLayout'
import AutoTradingToggle from '@/components/AutoTradingToggle'
import { AutomationAPI } from '@/lib/automation'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

export default function Automation() {
  const [isConnected, setConnected] = useState(false)
  const [activeTrades, setActiveTrades] = useState(0)
  const [pnlToday, setPnl] = useState(0)

  useEffect(() => {
    (async () => {
      const s = await AutomationAPI.get()
      setConnected(s.connected)
      setActiveTrades(s.activeTrades)
      setPnl(s.pnlToday)
    })()
  }, [])

  const connect = async () => {
    const s = await AutomationAPI.connectExchange()
    setConnected(s.connected)
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">AI Trading Automation</h1>
          <p className="text-muted-foreground">Connect your exchange account and enable AI-powered automated trading</p>
        </div>

        {/* Connection */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Connection Status</div>
              <div className="text-lg font-semibold">{isConnected ? 'Connected' : 'Disconnected'}</div>
            </div>
            {!isConnected ? (
              <Button onClick={connect} className="bg-primary hover:bg-primary/90">
                <Zap className="w-4 h-4 mr-2" />
                Connect Exchange Account
              </Button>
            ) : (
              <div className="flex gap-6 text-sm">
                <div><span className="text-muted-foreground">Active Trades</span><div className="font-semibold">{activeTrades}</div></div>
                <div><span className="text-muted-foreground">P&L Today</span><div className="font-semibold">${pnlToday.toFixed(2)}</div></div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <AutoTradingToggle />
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground">Configuration</div>
            <div className="mt-2 text-sm">
              <div>Risk Level: <b>Conservative</b></div>
              <div>Max Position Size: <b>$100</b></div>
            </div>
          </div>
        </div>

        {/* Coming soon */}
        <div className="rounded-xl border border-border p-4">
          <div className="text-sm text-muted-foreground mb-2">Features Coming Soon</div>
          <ul className="grid md:grid-cols-3 gap-3 text-sm">
            <li className="bg-card/50 p-3 rounded-md">
              <div className="font-medium">Real-time Trading</div>
              <div className="text-muted-foreground">Execute trades automatically based on AI signals</div>
            </li>
            <li className="bg-card/50 p-3 rounded-md">
              <div className="font-medium">Risk Management</div>
              <div className="text-muted-foreground">Advanced stop-loss & position sizing</div>
            </li>
            <li className="bg-card/50 p-3 rounded-md">
              <div className="font-medium">Portfolio Analytics</div>
              <div className="text-muted-foreground">Performance tracking & reporting</div>
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  )
}