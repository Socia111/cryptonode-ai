
import React from 'react';
import { TradingDashboard } from '@/components/TradingDashboard';
import { SystemHealth } from '@/components/SystemHealth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AItradeX1 Trading System
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced algorithmic trading platform powered by AI
          </p>
        </div>

        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trading">Trading Dashboard</TabsTrigger>
            <TabsTrigger value="health">System Health</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trading" className="space-y-6">
            <TradingDashboard />
          </TabsContent>
          
          <TabsContent value="health" className="space-y-6">
            <SystemHealth />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
