
import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { CleanTradingDashboard } from '../components/CleanTradingDashboard';
import { CleanSystemTest } from '../components/CleanSystemTest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Trading Dashboard</TabsTrigger>
            <TabsTrigger value="system-test">System Test</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <CleanTradingDashboard />
          </TabsContent>
          
          <TabsContent value="system-test" className="space-y-6">
            <CleanSystemTest />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Index;
