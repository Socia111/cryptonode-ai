import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedAutomatedTradingDashboard } from '@/components/EnhancedAutomatedTradingDashboard';
import { AutoTradingQuickStart } from '@/components/AutoTradingQuickStart';
import { useAutomatedTrading } from '@/hooks/useAutomatedTrading';
import MainLayout from '@/layouts/MainLayout';

export default function Automation() {
  const { status } = useAutomatedTrading();

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Automated Trading</h1>
            <p className="text-muted-foreground mt-2">
              Set up and manage your automated trading bots
            </p>
          </div>
        </div>

        <Tabs defaultValue={status?.isRunning ? "dashboard" : "quickstart"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quickstart" className="space-y-6">
            <div className="flex justify-center">
              <AutoTradingQuickStart />
            </div>
          </TabsContent>
          
          <TabsContent value="dashboard" className="space-y-6">
            <EnhancedAutomatedTradingDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}