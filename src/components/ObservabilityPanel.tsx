import React from 'react';
import {
  useDebugKPIs,
  useSignalsLive,
  useSignalsWithOrdersLast30m,
  useHeartbeat
} from '@/hooks/useObservability';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export function ObservabilityPanel() {
  const { data: kpi, loading: kpiLoading, refresh: refreshKpi } = useDebugKPIs();
  const { rows: live, loading: liveLoading, refresh: refreshLive } = useSignalsLive(50);
  const { rows: joined, loading: joinedLoading, refresh: refreshJoined } = useSignalsWithOrdersLast30m(100);
  const { summary, refresh: refreshHeartbeat } = useHeartbeat();

  const refreshAll = () => {
    refreshKpi();
    refreshLive();
    refreshJoined();
    refreshHeartbeat();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🔍 Live System Observability</h2>
        <Button onClick={refreshAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Signals (30m)</div>
            <div className="text-2xl font-bold text-primary">
              {kpiLoading ? '...' : kpi?.signals_30m ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Orders (30m)</div>
            <div className="text-2xl font-bold text-primary">
              {kpiLoading ? '...' : kpi?.orders_30m ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Latest Signal</div>
            <div className="text-sm font-medium">
              {kpi?.latest_signal ? new Date(kpi.latest_signal).toLocaleTimeString() : '—'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Latest Order</div>
            <div className="text-sm font-medium">
              {kpi?.latest_order ? new Date(kpi.latest_order).toLocaleTimeString() : '—'}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* System Health */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
              <Badge variant={summary.unhealthy === 0 ? "default" : "destructive"}>
                {summary.unhealthy === 0 ? "🟢 Healthy" : `🔴 ${summary.unhealthy} Issues`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.items.map((item) => (
                <div key={item.component} className="rounded border p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium capitalize">
                      {item.component.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.stale || item.status !== 'active' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      <Badge variant={item.stale || item.status !== 'active' ? "destructive" : "default"} className="text-xs">
                        {item.status}{item.stale ? ' (stale)' : ''}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last: {item.last_heartbeat.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Live Signals */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Live Signals ({live.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveLoading ? (
              <div className="text-center py-4">Loading signals...</div>
            ) : live.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No live signals found</div>
            ) : (
              <div className="overflow-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Time</th>
                      <th className="text-left px-3 py-2 font-medium">Symbol</th>
                      <th className="text-left px-3 py-2 font-medium">TF</th>
                      <th className="text-left px-3 py-2 font-medium">Direction</th>
                      <th className="text-left px-3 py-2 font-medium">Score</th>
                      <th className="text-left px-3 py-2 font-medium">Grade</th>
                      <th className="text-left px-3 py-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.slice(0, 20).map(s => (
                      <tr key={s.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2">{new Date(s.created_at).toLocaleTimeString()}</td>
                        <td className="px-3 py-2 font-mono">{s.symbol}</td>
                        <td className="px-3 py-2">{s.timeframe}</td>
                        <td className="px-3 py-2">
                          <Badge variant={s.direction === 'LONG' ? "default" : "secondary"}>
                            {s.direction}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-medium">{s.score}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{s.grade}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{s.source || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Signals → Orders (30m) */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Signal → Order Pipeline (30m)</CardTitle>
          </CardHeader>
          <CardContent>
            {joinedLoading ? (
              <div className="text-center py-4">Loading pipeline data...</div>
            ) : joined.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No recent signal/order activity</div>
            ) : (
              <div className="overflow-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Signal Time</th>
                      <th className="text-left px-3 py-2 font-medium">Symbol</th>
                      <th className="text-left px-3 py-2 font-medium">TF</th>
                      <th className="text-left px-3 py-2 font-medium">Direction</th>
                      <th className="text-left px-3 py-2 font-medium">Score</th>
                      <th className="text-left px-3 py-2 font-medium">Grade</th>
                      <th className="text-left px-3 py-2 font-medium">Order Status</th>
                      <th className="text-left px-3 py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joined.slice(0, 30).map((r, i) => (
                      <tr key={`${r.signal_id}-${r.order_id || i}`} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2">{new Date(r.signal_time).toLocaleTimeString()}</td>
                        <td className="px-3 py-2 font-mono">{r.symbol}</td>
                        <td className="px-3 py-2">{r.timeframe}</td>
                        <td className="px-3 py-2">
                          <Badge variant={r.direction === 'LONG' ? "default" : "secondary"}>
                            {r.direction}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-medium">{r.score ?? '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{r.grade}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {r.order_status ? (
                            <Badge variant={r.order_status === 'executed' ? "default" : "secondary"}>
                              {r.order_status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No Order</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{r.qty ? `$${r.qty}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}