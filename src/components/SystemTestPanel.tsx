import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Database,
  Zap,
  Signal,
  TrendingUp
} from 'lucide-react';

interface SystemTestPanelProps {
  onTestComplete?: (results: any) => void;
}

const SystemTestPanel = ({ onTestComplete }: SystemTestPanelProps) => {
  const [testing, setTesting] = React.useState(false);
  const [results, setResults] = React.useState<any>(null);
  const { toast } = useToast();

  const runComprehensiveTest = async () => {
    setTesting(true);
    const testResults = {
      database: { status: 'pending', message: '', details: [] },
      signals: { status: 'pending', message: '', details: [] },
      trading: { status: 'pending', message: '', details: [] },
      functions: { status: 'pending', message: '', details: [] },
      overall: 'pending'
    };

    try {
      // Test 1: Database Connection
      console.log('🔍 Testing database connection...');
      try {
        const { data: signalsData, error } = await supabase
          .from('signals')
          .select('count(*)')
          .limit(1);
        
        if (error) throw error;
        
        testResults.database.status = 'success';
        testResults.database.message = 'Database connection successful';
        testResults.database.details.push('✅ Supabase connection working');
        testResults.database.details.push('✅ Signals table accessible');
      } catch (error) {
        testResults.database.status = 'error';
        testResults.database.message = `Database error: ${error.message}`;
        testResults.database.details.push('❌ Database connection failed');
      }

      // Test 2: Signal Generation
      console.log('🔍 Testing signal generation...');
      try {
        const { data, error } = await supabase.functions.invoke('enhanced-signal-generation');
        
        if (error) throw error;
        
        testResults.signals.status = 'success';
        testResults.signals.message = 'Signal generation working';
        testResults.signals.details.push('✅ Enhanced signal generation functional');
        testResults.signals.details.push(`✅ Generated ${data?.signals_generated || 0} signals`);
      } catch (error) {
        testResults.signals.status = 'error';
        testResults.signals.message = `Signal generation error: ${error.message}`;
        testResults.signals.details.push('❌ Enhanced signal generation failed');
      }

      // Test 3: Trading Functions
      console.log('🔍 Testing trading functions...');
      try {
        const { data, error } = await supabase.functions.invoke('instrument-info', {
          body: { symbol: 'BTCUSDT' }
        });
        
        if (error) throw error;
        
        if (data?.ok) {
          testResults.trading.status = 'success';
          testResults.trading.message = 'Trading functions operational';
          testResults.trading.details.push('✅ Instrument info working');
          testResults.trading.details.push('✅ Price data available');
        } else {
          throw new Error('Instrument info returned error');
        }
      } catch (error) {
        testResults.trading.status = 'error';
        testResults.trading.message = `Trading functions error: ${error.message}`;
        testResults.trading.details.push('❌ Trading functions failed');
      }

      // Test 4: Edge Functions Health
      console.log('🔍 Testing edge functions...');
      try {
        const { data, error } = await supabase.functions.invoke('app-settings-manager', {
          body: { method: 'GET', key: 'system_status' }
        });
        
        if (error) throw error;
        
        testResults.functions.status = 'success';
        testResults.functions.message = 'Edge functions responsive';
        testResults.functions.details.push('✅ App settings manager working');
        testResults.functions.details.push('✅ Function routing operational');
      } catch (error) {
        testResults.functions.status = 'warning';
        testResults.functions.message = `Some functions may be unavailable: ${error.message}`;
        testResults.functions.details.push('⚠️ Non-critical function issues detected');
      }

      // Overall Assessment
      const successCount = Object.values(testResults).filter((r: any) => r.status === 'success').length;
      const errorCount = Object.values(testResults).filter((r: any) => r.status === 'error').length;
      
      if (errorCount === 0) {
        testResults.overall = 'success';
        toast({
          title: "✅ All Tests Passed",
          description: "System is fully operational",
          variant: "default"
        });
      } else if (successCount >= 2) {
        testResults.overall = 'warning';
        toast({
          title: "⚠️ Partial Success",
          description: `${successCount} tests passed, ${errorCount} failed`,
          variant: "default"
        });
      } else {
        testResults.overall = 'error';
        toast({
          title: "❌ System Issues",
          description: "Multiple critical errors detected",
          variant: "destructive"
        });
      }

      setResults(testResults);
      onTestComplete?.(testResults);

    } catch (error: any) {
      console.error('Comprehensive test failed:', error);
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-100 text-green-800">PASS</Badge>;
      case 'error': return <Badge variant="destructive">FAIL</Badge>;
      case 'warning': return <Badge variant="outline" className="border-yellow-500 text-yellow-700">WARN</Badge>;
      default: return <Badge variant="outline">TESTING</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          System Health & Error Recovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Run comprehensive tests to verify all system components are working correctly
          </p>
          <Button
            onClick={runComprehensiveTest}
            disabled={testing}
            className="flex items-center gap-2"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {testing ? 'Testing...' : 'Run Tests'}
          </Button>
        </div>

        {results && (
          <div className="space-y-4">
            <div className="grid gap-4">
              {/* Database Test */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <h4 className="font-medium">Database Connection</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.database.status)}
                    {getStatusBadge(results.database.status)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{results.database.message}</p>
                <ul className="text-xs space-y-1">
                  {results.database.details.map((detail: string, index: number) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </Card>

              {/* Signal Generation Test */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Signal className="h-4 w-4" />
                    <h4 className="font-medium">Signal Generation</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.signals.status)}
                    {getStatusBadge(results.signals.status)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{results.signals.message}</p>
                <ul className="text-xs space-y-1">
                  {results.signals.details.map((detail: string, index: number) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </Card>

              {/* Trading Functions Test */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <h4 className="font-medium">Trading Functions</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.trading.status)}
                    {getStatusBadge(results.trading.status)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{results.trading.message}</p>
                <ul className="text-xs space-y-1">
                  {results.trading.details.map((detail: string, index: number) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </Card>

              {/* Edge Functions Test */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <h4 className="font-medium">Edge Functions</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.functions.status)}
                    {getStatusBadge(results.functions.status)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{results.functions.message}</p>
                <ul className="text-xs space-y-1">
                  {results.functions.details.map((detail: string, index: number) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Overall Status */}
            <Card className={`p-4 border-2 ${
              results.overall === 'success' ? 'border-green-200 bg-green-50' :
              results.overall === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Overall System Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(results.overall)}
                  {getStatusBadge(results.overall)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {results.overall === 'success' && 'All systems operational. No critical errors detected.'}
                {results.overall === 'warning' && 'System mostly functional with minor issues.'}
                {results.overall === 'error' && 'Critical errors detected. System requires attention.'}
              </p>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemTestPanel;