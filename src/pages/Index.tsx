import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { LiveTradingDashboard } from '@/components/LiveTradingDashboard';
import { LaunchReadinessChecklist } from '@/components/LaunchReadinessChecklist';
import { SymbolSelector } from '@/components/SymbolSelector';
import { SignalMonitor } from '@/components/SignalMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FullMarketSignals } from '@/components/FullMarketSignals';
import { SimpleSystemStatus } from '@/components/SimpleSystemStatus';
import TestRunner from '@/components/TestRunner';
import { OneClickTrading } from '@/components/OneClickTrading';

export default function Index() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div>
              <h1 className="text-3xl font-bold">AItradeX1 Trading Platform</h1>
              <p className="text-muted-foreground mt-2">
                Advanced algorithmic trading with AI-powered signal generation
              </p>
            </div>
          </div>
          <div className="lg:col-span-1">
            <SimpleSystemStatus />
          </div>
        </div>

        <Tabs defaultValue="oneclick" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="oneclick">💰 One-Click Trade</TabsTrigger>
            <TabsTrigger value="dashboard">🚀 Live Trading</TabsTrigger>
            <TabsTrigger value="monitor">📊 Monitor</TabsTrigger>
            <TabsTrigger value="fullmarket">🌍 Full Market</TabsTrigger>
            <TabsTrigger value="symbols">⚙️ Symbols</TabsTrigger>
            <TabsTrigger value="tests">🧪 Tests</TabsTrigger>
            <TabsTrigger value="launch">✅ Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="oneclick" className="space-y-6">
            <OneClickTrading />
          </TabsContent>
          
          <TabsContent value="monitor" className="space-y-6">
            <SignalMonitor />
          </TabsContent>
          
          <TabsContent value="dashboard" className="space-y-6">
            <LiveTradingDashboard />
          </TabsContent>
          
          <TabsContent value="fullmarket" className="space-y-6">
            <FullMarketSignals />
          </TabsContent>
          
          <TabsContent value="symbols" className="space-y-6">
            <SymbolSelector />
          </TabsContent>
          
          <TabsContent value="tests" className="space-y-6">
            <TestRunner />
          </TabsContent>
          
          <TabsContent value="launch" className="space-y-6">
            <LaunchReadinessChecklist />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}