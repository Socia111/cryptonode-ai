import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuthCheckResult {
  ok: boolean;
  mode: {
    paper: boolean;
    liveEnabled: boolean;
    testnet: boolean;
    base: string;
    hasKey: boolean;
  };
  ret?: any;
  error?: string;
}

export function BybitAuthTest() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<AuthCheckResult | null>(null);

  const runAuthCheck = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('bybit-auth-check');
      
      if (error) {
        setResult({ ok: false, mode: { paper: true, liveEnabled: false, testnet: true, base: '', hasKey: false }, error: error.message });
        return;
      }
      
      setResult(data);
    } catch (err: any) {
      setResult({ ok: false, mode: { paper: true, liveEnabled: false, testnet: true, base: '', hasKey: false }, error: err.message });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getRetCodeMessage = (retCode: number) => {
    switch (retCode) {
      case 110001:
      case 10001:
        return "Invalid API key or permissions. Check key is for mainnet and has Contract Trading enabled.";
      case 110003:
        return "IP address not whitelisted. Add Supabase egress IP to your Bybit whitelist or disable IP restrictions.";
      case 110016:
        return "Invalid signature. Check API secret is correct.";
      default:
        return `Bybit error code: ${retCode}`;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Bybit API Authentication Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runAuthCheck} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Checking Authentication...' : 'Test Bybit API Key'}
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(result.ok)}
              <span className="font-medium">
                {result.ok ? 'Authentication Successful' : 'Authentication Failed'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Paper Trading:</span>
                <Badge variant={result.mode.paper ? "secondary" : "outline"}>
                  {result.mode.paper ? 'ON' : 'OFF'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Live Trading:</span>
                <Badge variant={result.mode.liveEnabled ? "default" : "secondary"}>
                  {result.mode.liveEnabled ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Network:</span>
                <Badge variant={result.mode.testnet ? "secondary" : "default"}>
                  {result.mode.testnet ? 'TESTNET' : 'MAINNET'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">API Key:</span>
                <Badge variant={result.mode.hasKey ? "default" : "destructive"}>
                  {result.mode.hasKey ? 'PRESENT' : 'MISSING'}
                </Badge>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Endpoint:</strong> {result.mode.base}
            </div>

            {!result.ok && result.ret?.retCode && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error {result.ret.retCode}:</strong> {getRetCodeMessage(result.ret.retCode)}
                  <br />
                  <span className="text-xs">{result.ret.retMsg}</span>
                </AlertDescription>
              </Alert>
            )}

            {result.error && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}

            {result.ok && result.ret && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ API key is valid for {result.mode.testnet ? 'testnet' : 'mainnet'} trading.
                  Ready to place {result.mode.liveEnabled ? 'live' : 'paper'} orders.
                </p>
              </div>
            )}

            {result.ret && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Raw Response</summary>
                <pre className="mt-2 bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(result.ret, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}