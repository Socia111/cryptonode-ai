import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export function DirectSignalsTest() {
  const [signals, setSignals] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [testResults, setTestResults] = React.useState('');

  const testDirectQuery = async () => {
    setLoading(true);
    setTestResults('Testing direct database query...\n');
    
    try {
      // Test 1: Direct database query
      const { data: dbSignals, error: dbError } = await supabase
        .from('signals')
        .select('id, symbol, direction, score, source, created_at')
        .gte('score', 70)
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (dbError) {
        setTestResults(prev => prev + `❌ DB Error: ${dbError.message}\n`);
      } else {
        setTestResults(prev => prev + `✅ DB Query: Found ${dbSignals?.length || 0} signals\n`);
        if (dbSignals && dbSignals.length > 0) {
          setTestResults(prev => prev + `Sample: ${dbSignals[0].symbol} ${dbSignals[0].direction} (${dbSignals[0].score}%)\n`);
        }
        setSignals(dbSignals || []);
      }

      // Test 2: Signals API
      const { data: apiSignals, error: apiError } = await supabase.functions.invoke('signals-api', {
        body: { action: 'list' }
      });

      if (apiError) {
        setTestResults(prev => prev + `❌ API Error: ${apiError.message}\n`);
      } else {
        setTestResults(prev => prev + `✅ API Query: Found ${apiSignals?.count || 0} signals\n`);
        if (apiSignals?.signals?.length > 0) {
          setTestResults(prev => prev + `Sample: ${apiSignals.signals[0].symbol} ${apiSignals.signals[0].direction} (${apiSignals.signals[0].score}%)\n`);
        }
      }

      // Test 3: Live signals API
      const { data: liveSignals, error: liveError } = await supabase.functions.invoke('signals-api', {
        body: { action: 'live' }
      });

      if (liveError) {
        setTestResults(prev => prev + `❌ Live API Error: ${liveError.message}\n`);
      } else {
        setTestResults(prev => prev + `✅ Live API: Found ${liveSignals?.count || 0} high-confidence signals\n`);
      }

    } catch (error) {
      setTestResults(prev => prev + `❌ Test Error: ${error.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">🔍 Direct Signals Debug Test</h3>
      
      <button 
        onClick={testDirectQuery}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Direct Test'}
      </button>

      <div className="bg-muted p-4 rounded-md mb-4 font-mono text-sm whitespace-pre-wrap">
        {testResults || 'Click "Run Direct Test" to check signals...'}
      </div>

      {signals.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Found Signals:</h4>
          {signals.slice(0, 5).map((signal: any) => (
            <div key={signal.id} className="bg-muted/50 p-3 rounded-md text-sm">
              <div className="font-medium">{signal.symbol} {signal.direction}</div>
              <div className="text-muted-foreground">
                Score: {signal.score}% | Source: {signal.source} | 
                {new Date(signal.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}