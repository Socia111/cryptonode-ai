import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { LiveTradingDashboard } from '@/components/LiveTradingDashboard';
import { LaunchReadinessChecklist } from '@/components/LaunchReadinessChecklist';
import { SymbolSelector } from '@/components/SymbolSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FullMarketSignals } from '@/components/FullMarketSignals';
import { SimpleSystemStatus } from '@/components/SimpleSystemStatus';

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

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Trading Dashboard</TabsTrigger>
            <TabsTrigger value="fullmarket">Full Market</TabsTrigger>
            <TabsTrigger value="symbols">Symbol Selection</TabsTrigger>
            <TabsTrigger value="launch">Launch Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <LiveTradingDashboard />
          </TabsContent>
          
          <TabsContent value="fullmarket" className="space-y-6">
            <FullMarketSignals />
          </TabsContent>
          
          <TabsContent value="symbols" className="space-y-6">
            <SymbolSelector />
          </TabsContent>
          
          <TabsContent value="launch" className="space-y-6">
            <LaunchReadinessChecklist />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}