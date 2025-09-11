import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DirectBybitTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runDirectTest = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      console.log('🚀 Running direct Bybit test...');
      
      const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/direct-bybit-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        const balanceSuccess = data.tests?.accountBalance?.success;
        const positionSuccess = data.tests?.positions?.success;
        
        if (balanceSuccess && positionSuccess) {
          toast.success('🎉 All tests passed! Your Bybit API is working perfectly.');
        } else if (balanceSuccess || positionSuccess) {
          toast.success('✅ Partial success - API credentials are valid but some permissions may be limited.');
        } else {
          toast.error('❌ API credentials are configured but requests are failing.');
        }
      } else {
        toast.error(`❌ Test failed: ${data.error}`);
      }

    } catch (error) {
      console.error('Direct test error:', error);
      toast.error(`Network error: ${error}`);
      setResult({ success: false, error: `Network error: ${error}` });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => 
    success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;

  const getStatusBadge = (success: boolean, status?: number) => (
    <Badge variant={success ? 'default' : 'destructive'}>
      {success ? `✅ ${status || 'OK'}` : `❌ ${status || 'FAIL'}`}
    </Badge>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Direct Bybit API Test
          <Badge variant="outline">No Auth Required</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <strong>Bypass Test</strong>
          </div>
          This test bypasses all frontend authentication and directly calls Bybit API using your configured credentials.
        </div>

        <Button 
          onClick={runDirectTest}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Direct API...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Run Direct Bybit Test
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Overall Result</span>
              {getStatusIcon(result.success)}
            </div>

            {result.success && result.tests && (
              <div className="space-y-3">
                <h4 className="font-semibold">Test Results</h4>
                
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Server Time</span>
                    {getStatusBadge(result.tests.serverTime?.success, result.tests.serverTime?.status)}
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Account Balance</span>
                    {getStatusBadge(result.tests.accountBalance?.success, result.tests.accountBalance?.status)}
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Position Data</span>
                    {getStatusBadge(result.tests.positions?.success, result.tests.positions?.status)}
                  </div>
                </div>

                {result.credentials && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <h4 className="font-medium text-green-800 mb-2">Credentials Info</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>API Key: {result.credentials.apiKeyPrefix}... (length: {result.credentials.apiKeyLength})</div>
                      <div>API Secret: *** (length: {result.credentials.apiSecretLength})</div>
                    </div>
                  </div>
                )}

                {result.tests.accountBalance?.success && result.tests.accountBalance?.data?.result?.list?.[0]?.coin && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="font-medium text-blue-800 mb-2">Account Balance</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      {result.tests.accountBalance.data.result.list[0].coin.slice(0, 3).map((coin: any) => (
                        <div key={coin.coin} className="flex justify-between">
                          <span>{coin.coin}:</span>
                          <span>{parseFloat(coin.walletBalance).toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result.success && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-medium text-red-800 mb-2">Error Details</h4>
                <p className="text-sm text-red-700">{result.error}</p>
                {result.details && (
                  <div className="mt-2 text-xs text-red-600">
                    <div>Has API Key: {result.details.hasApiKey ? '✅' : '❌'}</div>
                    <div>Has API Secret: {result.details.hasApiSecret ? '✅' : '❌'}</div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <h4 className="font-medium mb-2">Raw Response</h4>
              <Textarea
                value={JSON.stringify(result, null, 2)}
                readOnly
                className="font-mono text-xs h-40"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DirectBybitTest;