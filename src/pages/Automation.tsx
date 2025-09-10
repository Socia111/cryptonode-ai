import { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, Activity, Zap } from 'lucide-react';

export default function Automation() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AI Trading Automation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect your exchange account and enable AI-powered automated trading
          </p>
        </div>

        {/* Connection Status */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Connection Status
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  No exchange account connected
                </div>
                <Button onClick={() => setIsConnected(true)} className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Connect Exchange Account
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">✓</div>
                  <div className="text-sm text-muted-foreground">Exchange Connected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Active Trades</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">$0.00</div>
                  <div className="text-sm text-muted-foreground">P&L Today</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Trading Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Auto Trading</span>
                  <Badge variant="secondary">Disabled</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Paper Mode</span>
                  <Badge variant="outline">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Risk Level</span>
                  <Badge variant="outline">Conservative</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Max Position Size</span>
                  <span className="text-sm">$100</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Real-time Trading</h3>
                <p className="text-sm text-muted-foreground">
                  Execute trades automatically based on AI signals
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Risk Management</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced stop-loss and position sizing controls
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Portfolio Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive performance tracking and reporting
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}