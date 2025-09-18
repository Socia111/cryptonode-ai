import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, UserPlus, LogOut } from 'lucide-react';

export const AuthenticationManager = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('test@aitradex1.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      setError('Sign up successful! Check your email for verification.');
    }
    
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Authenticated User
          </CardTitle>
          <CardDescription>
            Welcome to AITRADEX1 Trading Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800">
              ✅ Logged in as: {user.email}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              User ID: {user.id}
            </p>
          </div>

          <Button 
            onClick={handleSignOut} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Required</CardTitle>
        <CardDescription>
          Sign in to access live trading features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm font-medium text-blue-800">
              🚀 Quick Test Login
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Use: test@aitradex1.com / password123
            </p>
          </div>

          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <Alert variant={error.includes('successful') ? 'default' : 'destructive'}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSignIn} 
              disabled={isLoading}
              className="w-full"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
              />
            </div>

            {error && (
              <Alert variant={error.includes('successful') ? 'default' : 'destructive'}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSignUp} 
              disabled={isLoading}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};