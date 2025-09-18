import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Database, Wifi, WifiOff } from 'lucide-react';

interface SignalsDebugPanelProps {}

export const SignalsDebugPanel: React.FC<SignalsDebugPanelProps> = () => {
  const [debugData, setDebugData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  const runDebugTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Direct database query for recent signals
      console.log('🔍 Running direct signals debug...');
      const { data: directSignals, error: directError } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      results.directQuery = {
        success: !directError,
        error: directError?.message,
        count: directSignals?.length || 0,
        sources: [...new Set(directSignals?.map(s => s.source) || [])],
        recentCount: directSignals?.filter(s => 
          new Date(s.created_at) > new Date(Date.now() - 60 * 60 * 1000)
        ).length || 0
      };

      // Test 2: Signals API test
      console.log('🔍 Testing signals API...');
      const { data: apiData, error: apiError } = await supabase.functions.invoke('signals-api', {
        body: { action: 'live' }
      });

      results.signalsAPI = {
        success: !apiError && apiData?.success,
        error: apiError?.message || (!apiData?.success ? 'API returned failure' : null),
        count: apiData?.items?.length || 0,
        items: apiData?.items?.slice(0, 3) || []
      };

      // Test 3: Check for real vs mock signals
      console.log('🔍 Analyzing signal sources...');
      const realSignals = directSignals?.filter(signal => 
        signal.source === 'aitradex1_real_enhanced' ||
        signal.source === 'real_market_data' ||
        signal.source === 'enhanced_signal_generation' ||
        signal.source === 'live_market_data' ||
        signal.source === 'complete_algorithm_live' ||
        signal.source === 'technical_indicators_real'
      ) || [];

      const mockSignals = directSignals?.filter(signal => 
        signal.source === 'demo' ||
        signal.source === 'mock' ||
        signal.source === 'system' ||
        signal.source?.includes('mock') ||
        signal.algo?.includes('mock')
      ) || [];

      results.signalAnalysis = {
        totalSignals: directSignals?.length || 0,
        realSignals: realSignals.length,
        mockSignals: mockSignals.length,
        realSources: [...new Set(realSignals.map(s => s.source))],
        mockSources: [...new Set(mockSignals.map(s => s.source))],
        highScoreReal: realSignals.filter(s => s.score >= 75).length,
        recentReal: realSignals.filter(s => 
          new Date(s.created_at) > new Date(Date.now() - 60 * 60 * 1000)
        ).length
      };

    } catch (error: any) {
      console.error('Debug test error:', error);
      results.error = error.message;
    }

    setDebugData(results);
    setLoading(false);
  };

  // Test real-time connection
  useEffect(() => {
    setRealTimeStatus('connecting');
    
    const channel = supabase
      .channel('debug-signals-test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('📡 Real-time signal received in debug:', payload.new);
          setRealTimeStatus('connected');
        }
      )
      .subscribe((status) => {
        console.log('📡 Debug subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealTimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealTimeStatus('disconnected');
        }
      });

    // Timeout for connection test
    const timeout = setTimeout(() => {
      if (realTimeStatus === 'connecting') {
        setRealTimeStatus('disconnected');
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Signals Debug Panel
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant={realTimeStatus === 'connected' ? 'default' : 'destructive'}>
            {realTimeStatus === 'connected' ? (
              <><Wifi className="h-3 w-3 mr-1" /> Real-time Connected</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" /> Real-time Disconnected</>
            )}
          </Badge>
          <Button onClick={runDebugTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run Debug Tests'}
          </Button>
        </div>
      </div>

      {Object.keys(debugData).length > 0 && (
        <div className="grid gap-4">
          {/* Direct Database Query */}
          {debugData.directQuery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4" />
                  Direct Database Query
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={debugData.directQuery.success ? 'default' : 'destructive'}>
                    {debugData.directQuery.success ? 'Success' : 'Failed'}
                  </Badge>
                  <span className="text-sm">
                    Found {debugData.directQuery.count} signals (last 6h)
                  </span>
                </div>
                <div className="text-sm">
                  <p><strong>Recent signals (last hour):</strong> {debugData.directQuery.recentCount}</p>
                  <p><strong>Sources found:</strong> {debugData.directQuery.sources.join(', ')}</p>
                </div>
                {debugData.directQuery.error && (
                  <p className="text-red-600 text-sm">Error: {debugData.directQuery.error}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Signals API Test */}
          {debugData.signalsAPI && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signals API (/live endpoint)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={debugData.signalsAPI.success ? 'default' : 'destructive'}>
                    {debugData.signalsAPI.success ? 'Success' : 'Failed'}
                  </Badge>
                  <span className="text-sm">
                    Returned {debugData.signalsAPI.count} signals
                  </span>
                </div>
                {debugData.signalsAPI.error && (
                  <p className="text-red-600 text-sm">Error: {debugData.signalsAPI.error}</p>
                )}
                {debugData.signalsAPI.items.length > 0 && (
                  <div className="text-xs bg-muted rounded p-2">
                    <p><strong>Sample signals:</strong></p>
                    {debugData.signalsAPI.items.map((item: any, idx: number) => (
                      <p key={idx}>
                        {item.symbol} {item.direction} (Score: {item.score}) - {item.source}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Signal Analysis */}
          {debugData.signalAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signal Source Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Total Signals:</strong> {debugData.signalAnalysis.totalSignals}</p>
                    <p><strong>Real Signals:</strong> {debugData.signalAnalysis.realSignals}</p>
                    <p><strong>Mock Signals:</strong> {debugData.signalAnalysis.mockSignals}</p>
                  </div>
                  <div>
                    <p><strong>High Score Real (≥75%):</strong> {debugData.signalAnalysis.highScoreReal}</p>
                    <p><strong>Recent Real (1h):</strong> {debugData.signalAnalysis.recentReal}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-xs">
                  <div>
                    <p><strong>Real Sources:</strong></p>
                    <div className="flex flex-wrap gap-1">
                      {debugData.signalAnalysis.realSources.map((source: string) => (
                        <Badge key={source} variant="outline" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {debugData.signalAnalysis.mockSources.length > 0 && (
                    <div>
                      <p><strong>Mock Sources:</strong></p>
                      <div className="flex flex-wrap gap-1">
                        {debugData.signalAnalysis.mockSources.map((source: string) => (
                          <Badge key={source} variant="destructive" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {debugData.error && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-red-600">Debug Error: {debugData.error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {Object.keys(debugData).length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Click "Run Debug Tests" to analyze signal data flow</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SignalsDebugPanel;