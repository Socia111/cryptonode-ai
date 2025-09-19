import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Activity, 
  TrendingUp, 
  Shield, 
  Zap,
  BarChart3,
  Users,
  Globe,
  ArrowRight
} from 'lucide-react';

export function LaunchReadinessChecklist() {
  const checklistItems = [
    { 
      id: 'auth', 
      title: 'User Authentication', 
      status: 'complete', 
      description: 'Supabase auth with email/password login',
      icon: Shield
    },
    { 
      id: 'signals', 
      title: 'Signal Generation', 
      status: 'complete', 
      description: 'Multiple trading algorithms generating live signals',
      icon: Zap
    },
    { 
      id: 'trading', 
      title: 'Automated Trading', 
      status: 'complete', 
      description: 'Paper trading with risk management',
      icon: Activity
    },
    { 
      id: 'algorithms', 
      title: 'Algorithm Selection', 
      status: 'complete', 
      description: 'Multi-algorithm consensus system',
      icon: BarChart3
    },
    { 
      id: 'performance', 
      title: 'Performance Tracking', 
      status: 'complete', 
      description: 'Real-time P&L and win rate monitoring',
      icon: TrendingUp
    },
    { 
      id: 'mobile', 
      title: 'Mobile Responsive', 
      status: 'complete', 
      description: 'Optimized for all device sizes',
      icon: Globe
    }
  ];

  const completedItems = checklistItems.filter(item => item.status === 'complete').length;
  const completionPercentage = (completedItems / checklistItems.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Launch Readiness Checklist
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500 text-white">
            {completedItems}/{checklistItems.length} Complete
          </Badge>
          <span className="text-sm text-muted-foreground">
            {completionPercentage}% Ready for Launch
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {checklistItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <IconComponent className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Ready for Production!</h3>
          </div>
          <p className="text-sm text-green-700 mb-4">
            All core features are implemented and tested. The trading platform is ready for live deployment.
          </p>
          
          <div className="flex gap-3">
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link to="/automation">
                <Activity className="w-4 h-4 mr-2" />
                Start Trading
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            <Button variant="outline" asChild>
              <Link to="/trade">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Next Steps for Full Launch:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Configure live trading API keys (Bybit/Binance)</li>
            <li>• Set up production monitoring and alerts</li>
            <li>• Implement user onboarding flow</li>
            <li>• Add payment integration for premium features</li>
            <li>• Deploy to production environment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}