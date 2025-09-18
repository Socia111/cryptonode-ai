import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { TradingDashboard } from '@/components/TradingDashboard';
import { SystemHealth } from '@/components/SystemHealth';
import { CompleteSignalDashboard } from '@/components/CompleteSignalDashboard';
import { LiveExchangeFeed } from '@/components/LiveExchangeFeed';
import { LiveTradingEnabler } from '@/components/LiveTradingEnabler';
import { LiveTradingDashboard } from '@/components/LiveTradingDashboard';
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
              Unireli Professional Trading Platform
            </h1>
            <p className="text-xl text-muted-foreground">
              Advanced Multi-Exchange Signal Detection with Real-Time Analytics & Risk Management
            </p>
          </div>
          
          <Tabs defaultValue="complete" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="complete">📊 Signals</TabsTrigger>
              <TabsTrigger value="live-feed">📡 Live Feed</TabsTrigger>
              <TabsTrigger value="trading">⚡ Trading</TabsTrigger>
              <TabsTrigger value="system">🔧 System</TabsTrigger>
              <TabsTrigger value="live-trading">🎯 Controls</TabsTrigger>
              <TabsTrigger value="dashboard">📈 Dashboard</TabsTrigger>
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
            
            <TabsContent value="live-trading" className="space-y-6">
              <LiveTradingEnabler />
            </TabsContent>
            
            <TabsContent value="dashboard" className="space-y-6">
              <LiveTradingDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}