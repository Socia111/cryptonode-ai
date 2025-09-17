import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogIn, LogOut, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
}

export function AuthenticationTest() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    checkAuthState();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithTestUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      if (error) {
        // Try to sign up if user doesn't exist
        if (error.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'test@example.com',
            password: 'testpassword123',
            options: {
              emailRedirectTo: `${window.location.origin}/`
            }
          });

          if (signUpError) throw signUpError;
          
          toast({
            title: 'Test User Created',
            description: 'Test user account created and signed in successfully.',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Signed In',
          description: 'Successfully signed in with test user.',
        });
      }
    } catch (error: any) {
      console.error('Sign in failed:', error);
      toast({
        title: 'Sign In Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Signed Out',
        description: 'Successfully signed out.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign Out Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const runAuthenticationTests = async () => {
    setTesting(true);
    setTestResults([]);

    const tests = [
      'Session Check',
      'Token Retrieval',
      'Trading Account Access',
      'Edge Function Authentication'
    ];

    // Initialize test results
    const initialResults = tests.map(name => ({ name, status: 'running' as const }));
    setTestResults(initialResults);

    const updateTest = (index: number, status: TestResult['status'], message?: string, data?: any) => {
      setTestResults(prev => prev.map((test, i) => 
        i === index ? { ...test, status, message, data } : test
      ));
    };

    try {
      // Test 1: Session Check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        updateTest(0, 'failed', sessionError?.message || 'No active session');
        setTesting(false);
        return;
      }
      updateTest(0, 'passed', `User ID: ${session.user.id}`);

      // Test 2: Token Retrieval
      const token = session.access_token;
      if (!token) {
        updateTest(1, 'failed', 'No access token available');
      } else {
        updateTest(1, 'passed', `Token length: ${token.length}`);
      }

      // Test 3: Trading Account Access
      try {
        const { data: accounts, error: accountError } = await supabase
          .from('user_trading_accounts')
          .select('*')
          .eq('user_id', session.user.id);

        if (accountError) {
          updateTest(2, 'failed', accountError.message);
        } else {
          updateTest(2, 'passed', `Found ${accounts?.length || 0} trading accounts`);
        }
      } catch (error: any) {
        updateTest(2, 'failed', error.message);
      }

      // Test 4: Edge Function Authentication
      try {
        const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'status' })
        });

        const data = await response.json();
        
        if (response.ok) {
          updateTest(3, 'passed', 'Edge function authentication successful');
        } else {
          updateTest(3, 'failed', data.error || `HTTP ${response.status}`);
        }
      } catch (error: any) {
        updateTest(3, 'failed', error.message);
      }

    } catch (error: any) {
      console.error('Authentication test failed:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      running: 'default',
      passed: 'default',
      failed: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading authentication state...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Auth State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {user ? `Signed in as: ${user.email}` : 'Not signed in'}
              </div>
              {user && (
                <div className="text-sm text-muted-foreground">
                  User ID: {user.id}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {user ? (
                <Button onClick={signOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button onClick={signInWithTestUser} size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In (Test User)
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Tests */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Authentication Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runAuthenticationTests} 
              disabled={testing}
              className="w-full"
            >
              {testing ? 'Running Tests...' : 'Run Authentication Tests'}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <span className="font-medium">{test.name}</span>
                      {getStatusBadge(test.status)}
                    </div>
                    {test.message && (
                      <div className="text-sm text-muted-foreground max-w-md text-right">
                        {test.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}