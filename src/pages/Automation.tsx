import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/layouts/MainLayout';
import BybitTradingAutomation from '@/components/BybitTradingAutomation';
import { AutoTradingStatus } from '@/components/AutoTradingStatus';
import { Shield, AlertTriangle, Settings, Bot, Zap, Target } from 'lucide-react';

const Automation = () => {
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    checkBybitConnection();
  }, []);

  const checkBybitConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-automated-trading', {
        body: { action: 'status' }
      });

      if (!error && data?.success && data?.connected) {
        setIsConnected(true);
      }
    } catch (error) {
      console.log('Not connected to Bybit');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking Bybit connection...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isConnected) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold gradient-text mb-2">Trading Automation</h1>
            <p className="text-muted-foreground">Connect your Bybit account to enable automated trading</p>
          </div>
          
          <Card className="glass-card max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-primary" />
                <span>Bybit Account Required</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  To use automated trading features, you need to connect your Bybit account with API credentials.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">What you'll get:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Automated signal execution with stop loss and take profit</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Configurable leverage and position sizing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Risk management with confidence score filtering</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Real-time trading statistics and monitoring</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => navigate('/bybit-auth')} 
                  size="lg" 
                  className="flex items-center space-x-2"
                >
                  <Shield className="w-5 h-5" />
                  <span>Connect Bybit Account</span>
                </Button>
                <Button 
                  onClick={() => window.open('https://www.bybit.com/app/user/api-management', '_blank')} 
                  variant="outline" 
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  <Settings className="w-5 h-5" />
                  <span>Create API Keys</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Trading Automation
          </h1>
          <p className="text-muted-foreground">
            Automated trading bots powered by AI signals and advanced risk management
          </p>
        </div>

        {/* Automation Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Bot className="w-4 h-4 text-primary" />
                <span>Active Bots</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-success">All running</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Zap className="w-4 h-4 text-warning" />
                <span>Trades Today</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">Automated</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Target className="w-4 h-4 text-success" />
                <span>Success Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">89.4%</div>
              <p className="text-xs text-muted-foreground">24h performance</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Settings className="w-4 h-4 text-accent" />
                <span>P&L Today</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+$1,247.83</div>
              <p className="text-xs text-muted-foreground">Auto trades</p>
            </CardContent>
          </Card>
        </div>

        {/* Auto-Trading Status */}
        <AutoTradingStatus />

        {/* Bybit Trading Automation */}
        <BybitTradingAutomation />
      </div>
    </MainLayout>
  );
};

export default Automation;