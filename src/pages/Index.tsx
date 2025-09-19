import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { LiveTradingDashboard } from '@/components/LiveTradingDashboard';
import { LaunchReadinessChecklist } from '@/components/LaunchReadinessChecklist';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Index() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AItradeX1 Trading Platform</h1>
            <p className="text-muted-foreground mt-2">
              Advanced algorithmic trading with AI-powered signal generation
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Trading Dashboard</TabsTrigger>
            <TabsTrigger value="launch">Launch Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <LiveTradingDashboard />
          </TabsContent>
          
          <TabsContent value="launch" className="space-y-6">
            <LaunchReadinessChecklist />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}