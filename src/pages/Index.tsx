
import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { TradingTest } from '@/components/TradingTest';
import { SystemTestRunner } from '@/components/SystemTestRunner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Trading Dashboard</TabsTrigger>
            <TabsTrigger value="testing">System Testing</TabsTrigger>
            <TabsTrigger value="trading">Live Trading</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <TradingDashboard />
              </div>
              <div className="lg:w-96">
                <TradingTest />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="testing" className="space-y-6">
            <SystemTestRunner />
          </TabsContent>
          
          <TabsContent value="trading" className="space-y-6">
            <div className="grid gap-6">
              <TradingTest />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Index;
