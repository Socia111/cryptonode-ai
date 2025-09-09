import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, Shield, Settings, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface TradingStatus {
  auto_trading_enabled: boolean
  paper_mode: boolean
  open_positions: number
  pending_orders: number
  daily_pnl: number
  kill_switch_triggered: boolean
}

export function AutoTradingToggle() {
  const { toast } = useToast()
  const [status, setStatus] = useState<TradingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor/status')
      if (error) throw error
      
      setStatus({
        auto_trading_enabled: data.config?.auto_trading_enabled || false,
        paper_mode: data.config?.paper_mode || true,
        open_positions: data.open_positions || 0,
        pending_orders: data.pending_orders || 0,
        daily_pnl: data.risk_state?.daily_pnl || 0,
        kill_switch_triggered: data.risk_state?.kill_switch_triggered || false
      })
    } catch (error) {
      console.error('Failed to fetch trading status:', error)
      // Fallback to database query
      try {
        const { data: config } = await supabase
          .from('trading_config')
          .select('auto_trading_enabled, paper_mode')
          .single()
        
        const { data: positions } = await supabase
          .from('trading_positions')
          .select('id')
          .eq('status', 'open')
        
        const { data: orders } = await supabase
          .from('trading_orders')
          .select('id')
          .in('status', ['pending', 'new', 'partiallyFilled'])
        
        setStatus({
          auto_trading_enabled: config?.auto_trading_enabled || false,
          paper_mode: config?.paper_mode || true,
          open_positions: positions?.length || 0,
          pending_orders: orders?.length || 0,
          daily_pnl: 0,
          kill_switch_triggered: false
        })
      } catch (fallbackError) {
        console.error('Fallback status fetch failed:', fallbackError)
      }
    }
  }

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false))
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    
    // Set up real-time subscription for config changes
    const channel = supabase
      .channel('trading-config-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trading_config'
      }, () => fetchStatus())
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleAutoTrading = async (enabled: boolean) => {
    setUpdating(true)
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor/toggle', {
        body: { enabled }
      })
      
      if (error) throw error

      setStatus(prev => prev ? { ...prev, auto_trading_enabled: enabled } : null)
      toast({
        title: enabled ? "Auto-Trading Enabled" : "Auto-Trading Disabled",
        description: enabled 
          ? "System will now execute qualifying AItradeX1 signals automatically" 
          : "Automatic signal execution has been stopped",
      })
    } catch (error) {
      console.error('Failed to toggle auto-trading:', error)
      toast({
        title: "Error",
        description: "Failed to update auto-trading setting",
        variant: "destructive",
      })
    }
    setUpdating(false)
  }

  const emergencyStop = async () => {
    setUpdating(true)
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor/emergency-stop')
      
      if (error) throw error

      await fetchStatus()
      toast({
        title: "Emergency Stop Activated",
        description: "All auto-trading has been disabled",
        variant: "destructive",
      })
    } catch (error) {
      console.error('Failed to execute emergency stop:', error)
      toast({
        title: "Error",
        description: "Failed to execute emergency stop",
        variant: "destructive",
      })
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded mb-2"></div>
          <div className="h-3 bg-muted rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`transition-all ${status?.auto_trading_enabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Auto-Trading
          </div>
          <div className="flex items-center gap-2">
            {status?.paper_mode && (
              <Badge variant="secondary" className="text-xs">
                Paper Mode
              </Badge>
            )}
            {status?.kill_switch_triggered && (
              <Badge variant="destructive" className="text-xs">
                Emergency Stop
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {status?.auto_trading_enabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {status?.auto_trading_enabled 
                ? 'Executing qualifying signals automatically'
                : 'Manual trading only'
              }
            </p>
          </div>
          <Switch
            checked={status?.auto_trading_enabled || false}
            onCheckedChange={toggleAutoTrading}
            disabled={updating || status?.kill_switch_triggered}
          />
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Open Positions</p>
            <p className="font-semibold">{status?.open_positions || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pending Orders</p>
            <p className="font-semibold">{status?.pending_orders || 0}</p>
          </div>
        </div>

        {/* Daily P&L */}
        {status?.daily_pnl !== 0 && (
          <div className="text-sm">
            <p className="text-muted-foreground">Daily P&L</p>
            <p className={`font-semibold ${status.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${status.daily_pnl.toFixed(2)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open('/automation', '_blank')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={emergencyStop}
            disabled={updating}
          >
            <Shield className="w-4 h-4 mr-2" />
            Emergency Stop
          </Button>
        </div>

        {/* Warnings */}
        {status?.auto_trading_enabled && !status?.paper_mode && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800">Live Trading Active</p>
              <p className="text-orange-700">Real money is at risk. Monitor positions carefully.</p>
            </div>
          </div>
        )}

        {status?.auto_trading_enabled && status?.paper_mode && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Paper Trading Mode</p>
              <p className="text-blue-700">Safe simulation environment - no real money at risk.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}