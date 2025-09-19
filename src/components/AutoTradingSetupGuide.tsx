import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Circle, AlertTriangle, ArrowRight, User, Key, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
  action?: () => void;
  actionText?: string;
}

export const AutoTradingSetupGuide = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [steps, setSteps] = useState<SetupStep[]>([]);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    const isAuth = !!session;
    setIsAuthenticated(isAuth);

    // Check API keys - simplified check
    let hasApiKeys = false;
    try {
      const { data } = await supabase.from('user_trading_accounts').select('*').limit(1);
      hasApiKeys = data && data.length > 0;
    } catch (error) {
      // API keys check failed - assume not configured
    }

    const setupSteps: SetupStep[] = [
      {
        id: 'auth',
        title: 'Sign In / Create Account',
        description: 'Authenticate to access trading features',
        completed: isAuth,
        icon: <User className="w-5 h-5" />,
        action: () => navigate('/auth'),
        actionText: 'Sign In'
      },
      {
        id: 'symbols',
        title: 'Symbol Whitelist (✅ Done)',
        description: 'All trading pairs allowed with wildcard (*)',
        completed: true,
        icon: <CheckCircle className="w-5 h-5 text-green-500" />
      },
      {
        id: 'api',
        title: 'Configure API Keys',
        description: 'Connect your Bybit trading account',
        completed: hasApiKeys,
        icon: <Key className="w-5 h-5" />,
        action: () => {
          // Switch to Live Setup tab
          const event = new CustomEvent('switch-tab', { detail: 'setup' });
          window.dispatchEvent(event);
        },
        actionText: 'Setup API Keys'
      },
      {
        id: 'safety',
        title: 'Enable Production Mode',
        description: 'Complete safety gate and enable auto trading',
        completed: false,
        icon: <Shield className="w-5 h-5" />,
        action: () => {
          // Switch to Controls tab
          const event = new CustomEvent('switch-tab', { detail: 'controls' });
          window.dispatchEvent(event);
        },
        actionText: 'Setup Safety Gate'
      },
      {
        id: 'auto',
        title: 'Enable Auto Trading',
        description: 'Turn on automatic signal execution',
        completed: false,
        icon: <Zap className="w-5 h-5" />,
        action: () => {
          // Switch to Signals tab where the toggle is
          const event = new CustomEvent('switch-tab', { detail: 'signals' });
          window.dispatchEvent(event);
        },
        actionText: 'Enable Auto Trading'
      }
    ];

    setSteps(setupSteps);
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Auto Trading Setup</span>
          <Badge variant={completedSteps === totalSteps ? 'default' : 'secondary'}>
            {completedSteps}/{totalSteps} Complete
          </Badge>
        </CardTitle>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              step.completed ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
              index === completedSteps ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' :
              'bg-muted/30 border-border'
            }`}
          >
            <div className="flex-shrink-0">
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : index === completedSteps ? (
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1">
              <h4 className="font-medium">{step.title}</h4>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            
            {!step.completed && step.action && index === completedSteps && (
              <Button size="sm" variant="outline" onClick={step.action}>
                {step.actionText}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        ))}

        {completedSteps === totalSteps && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              🎉 Setup complete! Your auto trading system is ready to use.
            </AlertDescription>
          </Alert>
        )}

        {completedSteps < totalSteps && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Complete the highlighted step above to continue setup.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};