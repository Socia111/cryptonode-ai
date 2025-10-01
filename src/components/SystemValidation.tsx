import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'running';
  message?: string;
  details?: any;
}

export function SystemValidation() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runValidation = async () => {
    setRunning(true);
    const results: TestResult[] = [];

    // Test 1: Database Connectivity
    try {
      const { data, error } = await supabase.from('signals').select('count').limit(1);
      results.push({
        name: 'Database Connection',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : 'Connected successfully'
      });
    } catch (e) {
      results.push({ name: 'Database Connection', status: 'fail', message: e.message });
    }

    // Test 2: AIRA Rankings Access
    try {
      const { data, error } = await supabase.from('aira_rankings').select('*').limit(1);
      results.push({
        name: 'AIRA Rankings Table',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : 'Accessible'
      });
    } catch (e) {
      results.push({ name: 'AIRA Rankings Table', status: 'fail', message: e.message });
    }

    // Test 3: Spynx Scores Access
    try {
      const { data, error } = await supabase.from('spynx_scores').select('*').limit(1);
      results.push({
        name: 'Spynx Scores Table',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : 'Accessible'
      });
    } catch (e) {
      results.push({ name: 'Spynx Scores Table', status: 'fail', message: e.message });
    }

    // Test 4: Scanner Engine Function
    try {
      const { data, error } = await supabase.functions.invoke('scanner-engine', {
        body: { exchange: 'bybit', timeframe: '1h', relaxed_filters: true }
      });
      results.push({
        name: 'Scanner Engine',
        status: error || !data?.success ? 'fail' : 'pass',
        message: data?.message || error?.message,
        details: data
      });
    } catch (e) {
      results.push({ name: 'Scanner Engine', status: 'fail', message: e.message });
    }

    // Test 5: Configuration API
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-config', {
        body: {}
      });
      results.push({
        name: 'Configuration API',
        status: error ? 'fail' : 'pass',
        message: data?.config ? 'Config loaded' : error?.message
      });
    } catch (e) {
      results.push({ name: 'Configuration API', status: 'fail', message: e.message });
    }

    // Test 6: Live Market Data
    try {
      const { data, error } = await supabase.from('live_market_data').select('*').limit(5);
      results.push({
        name: 'Live Market Data',
        status: error ? 'fail' : 'pass',
        message: `${data?.length || 0} symbols available`
      });
    } catch (e) {
      results.push({ name: 'Live Market Data', status: 'fail', message: e.message });
    }

    // Test 7: Signal Generation
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      results.push({
        name: 'Signal Generation (Last Hour)',
        status: error ? 'fail' : data && data.length > 0 ? 'pass' : 'fail',
        message: `${data?.length || 0} signals generated`
      });
    } catch (e) {
      results.push({ name: 'Signal Generation', status: 'fail', message: e.message });
    }

    setTests(results);
    setRunning(false);
  };

  useEffect(() => {
    runValidation();
  }, []);

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const failedTests = tests.filter(t => t.status === 'fail').length;
  const totalTests = tests.length;
  const passRate = totalTests > 0 ? Number((passedTests / totalTests * 100).toFixed(0)) : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            System Validation
            {running && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={passRate >= 80 ? 'default' : passRate >= 60 ? 'secondary' : 'destructive'}>
              {passRate}% Pass Rate
            </Badge>
            <Badge variant="outline">
              {passedTests}/{totalTests} Tests
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tests.map((test, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                {test.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {test.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                {test.status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                <div>
                  <p className="font-medium">{test.name}</p>
                  {test.message && (
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                  )}
                </div>
              </div>
              {test.status === 'fail' && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 rounded-lg bg-secondary/20">
          <h4 className="font-semibold mb-2">System Status</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Passed Tests: <span className="text-green-500 font-medium">{passedTests}</span></div>
            <div>Failed Tests: <span className="text-red-500 font-medium">{failedTests}</span></div>
            <div>Total Tests: <span className="font-medium">{totalTests}</span></div>
            <div>Pass Rate: <span className="font-medium">{passRate}%</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
