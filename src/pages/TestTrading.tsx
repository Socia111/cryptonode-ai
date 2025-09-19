import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { EnhancedFakeTradeTest } from '@/components/EnhancedFakeTradeTest';
import { ProfessionalTradingDashboard } from '@/components/ProfessionalTradingDashboard';
import { FullyAutomatedDashboard } from '@/components/FullyAutomatedDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TestTrading = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">🤖 Fully Automated Trading System</h1>
          <p className="text-muted-foreground">Automated signal generation and trade execution</p>
        </div>
        
        <Tabs defaultValue="automated" className="space-y-4">
          <TabsList>
            <TabsTrigger value="automated">🚀 Fully Automated</TabsTrigger>
            <TabsTrigger value="testing">🧪 Testing</TabsTrigger>
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="automated">
            <FullyAutomatedDashboard />
          </TabsContent>

          <TabsContent value="testing">
            <EnhancedFakeTradeTest />
          </TabsContent>

          <TabsContent value="dashboard">
            <ProfessionalTradingDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TestTrading;