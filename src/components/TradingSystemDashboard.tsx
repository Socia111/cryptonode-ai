import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemInitializer } from './SystemInitializer';
import { TradingTest } from './TradingTest';
import { TradingConnectionTest } from './TradingConnectionTest';
import { TradeExecutionTest } from './TradeExecutionTest';
import { AuthManager } from './AuthManager';
import { TradingCredentialsManager } from './TradingCredentialsManager';

export function TradingSystemDashboard() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Trading System Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and test your trading system components
        </p>
      </div>

      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="credentials">API Setup</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="connection">Connection Test</TabsTrigger>
          <TabsTrigger value="execution">Trade Test</TabsTrigger>
          <TabsTrigger value="comprehensive">Full Test Suite</TabsTrigger>
        </TabsList>
        
        <TabsContent value="auth" className="space-y-4">
          <AuthManager />
        </TabsContent>
        
        <TabsContent value="credentials" className="space-y-4">
          <TradingCredentialsManager />
        </TabsContent>
        
        <TabsContent value="status" className="space-y-4">
          <SystemInitializer />
        </TabsContent>
        
        <TabsContent value="connection" className="space-y-4">
          <TradingConnectionTest />
        </TabsContent>
        
        <TabsContent value="execution" className="space-y-4">
          <TradeExecutionTest />
        </TabsContent>
        
        <TabsContent value="comprehensive" className="space-y-4">
          <TradingTest />
        </TabsContent>
      </Tabs>
    </div>
  );
}