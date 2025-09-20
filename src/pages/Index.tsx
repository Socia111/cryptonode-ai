
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Bot, 
  Zap, 
  Shield, 
  Activity,
  ArrowRight,
  Database,
  Cpu,
  Signal
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { TradingTest } from '@/components/TradingTest';

const Index = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AITRADEX1
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-powered cryptocurrency trading system with real-time signals, 
            automated execution, and comprehensive portfolio management
          </p>
          <div className="flex items-center justify-center space-x-4 mt-6">
            <Link to="/dashboard">
              <Button size="lg" className="space-x-2">
                <Activity className="h-5 w-5" />
                <span>Launch Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/signals">
              <Button variant="outline" size="lg">
                View Live Signals
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Signal className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Live Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Real-time AI-generated trading signals with confidence scoring
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Auto Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Automated trade execution with risk management and portfolio optimization
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Advanced market analysis with quantum computing and sentiment analysis
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Risk Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Comprehensive risk controls with position sizing and stop-loss management
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Scanner Engine</span>
                <Badge variant="default" className="animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Trading Engine</span>
                <Badge variant="default">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk Manager</span>
                <Badge variant="default">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Signals</span>
                <span className="font-semibold">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="font-semibold text-green-600">--%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Score</span>
                <span className="font-semibold">--</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/dashboard" className="block">
                <Button variant="outline" className="w-full">
                  System Dashboard
                </Button>
              </Link>
              <Link to="/trade" className="block">
                <Button variant="outline" className="w-full">
                  Manual Trading
                </Button>
              </Link>
              <Link to="/portfolio" className="block">
                <Button variant="outline" className="w-full">
                  Portfolio View
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Trading Components */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <TradingDashboard />
          </div>
          <div className="lg:w-96">
            <TradingTest />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
