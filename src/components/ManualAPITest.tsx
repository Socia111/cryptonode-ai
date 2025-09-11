import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Copy } from 'lucide-react';
import { toast } from 'sonner';

const ManualAPITest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [result, setResult] = useState<any>(null);

  const testDirectAPI = async () => {
    if (!apiKey || !apiSecret) {
      toast.error('Please enter both API key and secret');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Test direct API call with manual credentials
      const timestamp = Date.now().toString();
      const endpoint = '/v5/account/wallet-balance';
      const queryString = `accountType=UNIFIED&timestamp=${timestamp}`;
      
      // Create signature
      const crypto = window.crypto;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(apiSecret);
      const messageData = encoder.encode(timestamp + apiKey + '5000' + queryString);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const response = await fetch(`https://api.bybit.com${endpoint}?${queryString}`, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': signatureHex,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      setResult({
        success: response.ok,
        status: response.status,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        toast.success('Direct API test successful!');
      } else {
        toast.error(`API test failed: ${data.retMsg || 'Unknown error'}`);
      }

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error(`Test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Manual API Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey">Bybit API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Bybit API Key"
            />
          </div>
          
          <div>
            <Label htmlFor="apiSecret">Bybit API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your Bybit API Secret"
            />
          </div>

          <Button 
            onClick={testDirectAPI}
            disabled={isLoading || !apiKey || !apiSecret}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing API...
              </>
            ) : (
              'Test Direct API Connection'
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Test Result</span>
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Status Code</Label>
                <span className="font-mono">{result.status || 'N/A'}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Response</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={JSON.stringify(result, null, 2)}
                readOnly
                className="font-mono text-xs"
                rows={10}
              />
            </div>

            {result.success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800">
                ✅ Your API credentials work! The issue is with authorization headers in the edge functions.
              </div>
            )}

            {!result.success && result.data?.retCode && (
              <div className="space-y-2">
                <h4 className="font-semibold">Common Bybit Error Codes:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>10001:</strong> Invalid API key</div>
                  <div><strong>10003:</strong> Invalid signature</div>
                  <div><strong>10004:</strong> Unmatched IP address</div>
                  <div><strong>10005:</strong> Permission denied</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualAPITest;