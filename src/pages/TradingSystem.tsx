import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LiveTradingDashboard from '@/components/LiveTradingDashboard';
import SystemControlPanel from '@/components/SystemControlPanel';
import MainLayout from '@/layouts/MainLayout';
import { 
  BarChart3, 
  Settings, 
  Activity,
  Zap
} from 'lucide-react';

const TradingSystem = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            AItradeX1 Trading System
          </h1>
          <p className="text-lg text-muted-foreground">
            Advanced algorithmic trading with real-time signal generation and automated execution
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">System Status</p>
                  <p className="text-lg font-bold text-green-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Signal Engine</p>
                  <p className="text-lg font-bold">AItradeX1 v2.5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-lg font-bold">85.2%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Mode</p>
                  <p className="text-lg font-bold">Live Trading</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Trading Dashboard
            </TabsTrigger>
            <TabsTrigger value="control" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Control
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <LiveTradingDashboard />
          </TabsContent>

          <TabsContent value="control">
            <SystemControlPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TradingSystem;