import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, TrendingUp, TrendingDown, Settings, Activity, Shield, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface TradingConfig {
  auto_trading_enabled: boolean
  paper_mode: boolean
  risk_per_trade_pct: number
  max_open_risk_pct: number
  daily_loss_limit_pct: number
  max_positions: number
  maker_only: boolean
  default_leverage: number
  min_confidence_score: number
  min_risk_reward_ratio: number
  symbol_whitelist: string[]
}

interface TradingStatus {
  config: TradingConfig | null
  risk_state: any
  open_positions: number
  pending_orders: number
  last_updated: string
}

interface Position {
  id: string
  symbol: string
  side: string
  qty: number
  avg_entry_price: number
  unrealized_pnl: number
  leverage: number
  status: string
}

interface Order {
  id: string
  symbol: string
  side: string
  order_type: string
  qty: number
  price: number
  status: string
  created_at: string
}

export function AutoTradingDashboard() {
  const { toast } = useToast()
  const [status, setStatus] = useState<TradingStatus | null>(null)
  const [config, setConfig] = useState<TradingConfig | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Fetch trading status
  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor/status')
      if (error) throw error
      setStatus(data)
      setConfig(data.config)
    } catch (error) {
      console.error('Failed to fetch trading status:', error)
      toast({
        title: "Error",
        description: "Failed to fetch trading status",
        variant: "destructive",
      })
    }
  }

  // Fetch positions and orders
  const fetchTradingData = async () => {
    try {
      const [positionsRes, ordersRes] = await Promise.all([
        supabase.from('trading_positions').select('*').eq('status', 'open'),
        supabase.from('trading_orders').select('*').in('status', ['pending', 'new', 'partiallyFilled']).order('created_at', { ascending: false }).limit(10)
      ])

      if (positionsRes.data) setPositions(positionsRes.data)
      if (ordersRes.data) setOrders(ordersRes.data)
    } catch (error) {
      console.error('Failed to fetch trading data:', error)
    }
  }

  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true)
      await Promise.all([fetchStatus(), fetchTradingData()])
      setLoading(false)
    }
    
    initDashboard()

    // Set up real-time subscriptions
    const positionsChannel = supabase
      .channel('positions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trading_positions'
      }, () => fetchTradingData())
      .subscribe()

    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trading_orders'
      }, () => fetchTradingData())
      .subscribe()

    // Refresh status every 30 seconds
    const statusInterval = setInterval(fetchStatus, 30000)

    return () => {
      supabase.removeChannel(positionsChannel)
      supabase.removeChannel(ordersChannel)
      clearInterval(statusInterval)
    }
  }, [])

  const toggleAutoTrading = async (enabled: boolean) => {
    setUpdating(true)
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor/toggle', {
        body: { enabled }
      })
      
      if (error) throw error

      setConfig(prev => prev ? { ...prev, auto_trading_enabled: enabled } : null)
      toast({
        title: enabled ? "Auto-Trading Enabled" : "Auto-Trading Disabled",
        description: enabled ? "System will now execute qualifying signals automatically" : "System stopped executing signals",
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

  const updateConfig = async (updates: Partial<TradingConfig>) => {
    setUpdating(true)
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor/config', {
        body: updates
      })
      
      if (error) throw error

      setConfig(prev => prev ? { ...prev, ...updates } : null)
      toast({
        title: "Settings Updated",
        description: "Trading configuration has been updated",
      })
    } catch (error) {
      console.error('Failed to update config:', error)
      toast({
        title: "Error",
        description: "Failed to update trading settings",
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
        description: "All auto-trading has been disabled and pending orders cancelled",
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Auto-Trading Dashboard</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Auto-Trading Dashboard</h1>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Trading</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                checked={config?.auto_trading_enabled || false}
                onCheckedChange={toggleAutoTrading}
                disabled={updating}
              />
              <span className="text-2xl font-bold">
                {config?.auto_trading_enabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {config?.paper_mode ? 'Paper Mode' : 'Live Trading'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              Max: {config?.max_positions || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              Active orders waiting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${status?.risk_state?.daily_pnl?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Limit: {config?.daily_loss_limit_pct}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Risk Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="risk-per-trade">Risk Per Trade: {config?.risk_per_trade_pct}%</Label>
              <Slider
                id="risk-per-trade"
                min={0.1}
                max={5}
                step={0.1}
                value={[config?.risk_per_trade_pct || 0.75]}
                onValueChange={([value]) => updateConfig({ risk_per_trade_pct: value })}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="max-open-risk">Max Open Risk: {config?.max_open_risk_pct}%</Label>
              <Slider
                id="max-open-risk"
                min={1}
                max={10}
                step={0.5}
                value={[config?.max_open_risk_pct || 2]}
                onValueChange={([value]) => updateConfig({ max_open_risk_pct: value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="max-positions">Max Positions</Label>
              <Input
                id="max-positions"
                type="number"
                min={1}
                max={10}
                value={config?.max_positions || 3}
                onChange={(e) => updateConfig({ max_positions: parseInt(e.target.value) })}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Execution Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="paper-mode">Paper Mode</Label>
              <Switch
                id="paper-mode"
                checked={config?.paper_mode || false}
                onCheckedChange={(checked) => updateConfig({ paper_mode: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="maker-only">Maker Only Orders</Label>
              <Switch
                id="maker-only"
                checked={config?.maker_only || false}
                onCheckedChange={(checked) => updateConfig({ maker_only: checked })}
              />
            </div>

            <div>
              <Label htmlFor="min-confidence">Min Confidence Score: {config?.min_confidence_score}</Label>
              <Slider
                id="min-confidence"
                min={50}
                max={95}
                step={5}
                value={[config?.min_confidence_score || 70]}
                onValueChange={([value]) => updateConfig({ min_confidence_score: value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="default-leverage">Default Leverage</Label>
              <Input
                id="default-leverage"
                type="number"
                min={1}
                max={10}
                value={config?.default_leverage || 1}
                onChange={(e) => updateConfig({ default_leverage: parseInt(e.target.value) })}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-right p-2">Size</th>
                    <th className="text-right p-2">Entry Price</th>
                    <th className="text-right p-2">Unrealized P&L</th>
                    <th className="text-right p-2">Leverage</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b">
                      <td className="p-2 font-medium">{position.symbol}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          position.side === 'Buy' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {position.side}
                        </span>
                      </td>
                      <td className="p-2 text-right">{position.qty}</td>
                      <td className="p-2 text-right">${position.avg_entry_price?.toFixed(4)}</td>
                      <td className={`p-2 text-right ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${position.unrealized_pnl?.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">{position.leverage}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Quantity</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="p-2 font-medium">{order.symbol}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.side === 'Buy' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {order.side}
                        </span>
                      </td>
                      <td className="p-2">{order.order_type}</td>
                      <td className="p-2 text-right">{order.qty}</td>
                      <td className="p-2 text-right">${order.price?.toFixed(4)}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'filled' ? 'bg-green-100 text-green-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-2">{new Date(order.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Messages */}
      {config?.auto_trading_enabled && !config?.paper_mode && (
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Live Trading Active</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Real money is at risk. Monitor your positions carefully and ensure you understand the risks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}