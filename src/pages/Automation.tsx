import { useEffect, useState } from 'react'
import MainLayout from '@/layouts/MainLayout'
import AutoTradingToggle from '@/components/AutoTradingToggle'
import LiveSignalsPanel from '@/components/LiveSignalsPanel'
import AutomationDashboard from '@/components/AutomationDashboard'
import { AutomationAPI } from '@/lib/automation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'

export default function Automation() {
  const [isConnected, setConnected] = useState(true)
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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            AI Trading Automation
          </h1>
          <p className="text-muted-foreground">
            Fully automated signal generation and trade execution system
          </p>
        </div>

        {/* Automation Dashboard */}
        <AutomationDashboard />

        {/* Live Signals */}
        <Card>
          <CardHeader>
            <CardTitle>Live Trading Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <LiveSignalsPanel />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}