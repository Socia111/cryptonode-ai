import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { TradingDashboard } from '@/components/TradingDashboard';
import { SystemHealth } from '@/components/SystemHealth';
import { CompleteSignalDashboard } from '@/components/CompleteSignalDashboard';
import { LiveExchangeFeed } from '@/components/LiveExchangeFeed';
import { useSignals } from '@/hooks/useSignals';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Index() {
  const { signals } = useSignals();
  
  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              AItradeX1 Complete Trading System
            </h1>
            <p className="text-xl text-muted-foreground">
              Advanced Multi-Layer Signal Detection with Golden Cross, HVP & ATR Risk Management
            </p>
          </div>
          
          <Tabs defaultValue="complete" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="complete">Complete Algorithm</TabsTrigger>
              <TabsTrigger value="live-feed">Live Exchange Feed</TabsTrigger>
              <TabsTrigger value="trading">Trading Dashboard</TabsTrigger>
              <TabsTrigger value="system">System Health</TabsTrigger>
            </TabsList>
            
            <TabsContent value="complete" className="space-y-6">
              <CompleteSignalDashboard signals={signals} />
            </TabsContent>
            
            <TabsContent value="live-feed" className="space-y-6">
              <LiveExchangeFeed />
            </TabsContent>
            
            <TabsContent value="trading" className="space-y-6">
              <TradingDashboard />
            </TabsContent>
            
            <TabsContent value="system" className="space-y-6">
              <SystemHealth />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}