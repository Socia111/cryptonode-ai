import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  credentials_found?: boolean;
  api_key_preview?: string;
}

export function Direct3CommasTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('direct-3commas-test');
      
      if (error) {
        setResult({
          success: false,
          error: error.message
        });
        return;
      }

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>3Commas API Test</span>
          {result?.success === true && <CheckCircle className="h-5 w-5 text-green-500" />}
          {result?.success === false && <XCircle className="h-5 w-5 text-red-500" />}
        </CardTitle>
        <CardDescription>
          Direct test of 3Commas API credentials stored in Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={testing}
          className="w-full"
        >
          {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Test 3Commas Connection
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "Connected" : "Failed"}
              </Badge>
            </div>

            {result.credentials_found && (
              <div className="flex items-center gap-2">
                <span className="font-medium">API Key:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {result.api_key_preview}
                </code>
              </div>
            )}

            {result.success && result.data && (
              <div className="space-y-2">
                <h4 className="font-medium">Account Information:</h4>
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div>
                    <span className="font-medium">Accounts Found:</span> {result.data.accounts_count}
                  </div>
                  {result.data.accounts && result.data.accounts.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-medium">Accounts:</span>
                      {result.data.accounts.map((account: any, idx: number) => (
                        <div key={idx} className="text-sm bg-background p-2 rounded border">
                          <div><strong>Name:</strong> {account.name}</div>
                          <div><strong>Exchange:</strong> {account.exchange}</div>
                          <div><strong>Enabled:</strong> {account.enabled ? 'Yes' : 'No'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.error && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Error:</span>
                </div>
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <code className="text-sm text-red-700">{result.error}</code>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}