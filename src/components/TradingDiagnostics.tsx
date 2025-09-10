import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const TradingDiagnostics = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    const diagnostics: DiagnosticResult[] = [];

    try {
      // Test 1: Edge function reachability
      try {
        const functionsBase = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co');
        const response = await fetch(`${functionsBase}/api-diagnostics`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({})
        });
        
        if (response.ok) {
          const data = await response.json();
          diagnostics.push({
            name: 'API Diagnostics',
            status: 'success',
            message: 'Edge function is reachable',
            details: data
          });
        } else {
          diagnostics.push({
            name: 'API Diagnostics',
            status: 'error',
            message: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } catch (error) {
        diagnostics.push({
          name: 'API Diagnostics',
          status: 'error',
          message: error instanceof Error ? error.message : 'Network error'
        });
      }

      // Test 2: Authentication status
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          diagnostics.push({
            name: 'Authentication',
            status: 'success',
            message: 'User session active',
            details: { userId: session.user?.id, email: session.user?.email }
          });
        } else {
          diagnostics.push({
            name: 'Authentication',
            status: 'warning',
            message: 'No active session - some functions may require login'
          });
        }
      } catch (error) {
        diagnostics.push({
          name: 'Authentication',
          status: 'error',
          message: 'Failed to check auth status'
        });
      }

      // Test 3: Trading executor connectivity
      try {
        const functionsBase = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co');
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'content-type': 'application/json',
        };
        
        if (session?.access_token) {
          headers['authorization'] = `Bearer ${session.access_token}`;
        }
        
        const response = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'status' })
        });
        
        if (response.ok) {
          const data = await response.json();
          let message = 'Executor is responding correctly';
          
          // Enhanced status reporting
          if (data.config) {
            const configStatus = data.config.auto_trading_enabled ? 'enabled' : 'disabled';
            message += ` (auto-trading ${configStatus})`;
          }
          
          diagnostics.push({
            name: 'Trading Executor',
            status: 'success',
            message,
            details: data
          });
        } else {
          let message = `HTTP ${response.status}: ${response.statusText}`;
          
          // Map specific error codes
          if (response.status === 401 || response.status === 403) {
            message = 'Authentication required or insufficient permissions';
          } else if (response.status === 404) {
            message = 'Executor endpoint not found - check deployment';
          } else if (response.status >= 500) {
            message = 'Server error - check function logs';
          }
          
          diagnostics.push({
            name: 'Trading Executor',
            status: 'error',
            message
          });
        }
      } catch (error) {
        diagnostics.push({
          name: 'Trading Executor',
          status: 'error',
          message: error instanceof Error ? error.message : 'Connection failed'
        });
      }

      // Test 4: Environment variables
      const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
      const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
      
      if (missingVars.length === 0) {
        diagnostics.push({
          name: 'Environment Variables',
          status: 'success',
          message: 'All required environment variables are set'
        });
      } else {
        diagnostics.push({
          name: 'Environment Variables',
          status: 'error',
          message: `Missing variables: ${missingVars.join(', ')}`
        });
      }

    } catch (error) {
      diagnostics.push({
        name: 'General',
        status: 'error',
        message: 'Unexpected error during diagnostics'
      });
    }

    setResults(diagnostics);
    setIsRunning(false);

    // Show summary toast
    const successCount = diagnostics.filter(d => d.status === 'success').length;
    const errorCount = diagnostics.filter(d => d.status === 'error').length;
    
    toast({
      title: "Diagnostics Complete",
      description: `${successCount} passed, ${errorCount} failed`,
      variant: errorCount === 0 ? "default" : "destructive"
    });
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Trading System Diagnostics
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
            {getStatusIcon(result.status)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{result.name}</h4>
                <Badge variant={getStatusBadgeVariant(result.status)}>
                  {result.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
              {result.details && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
        
        {results.length === 0 && !isRunning && (
          <p className="text-center text-muted-foreground py-8">
            Click "Run Diagnostics" to test the trading system connectivity
          </p>
        )}
      </CardContent>
    </Card>
  );
};