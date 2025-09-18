
import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { TradingTest } from '@/components/TradingTest';
import { SystemTestRunner } from '@/components/SystemTestRunner';
import { AuthenticationTest } from '@/components/AuthenticationTest';
import { TradingSystemTest } from '@/components/TradingSystemTest';
import { TradingCredentialsManager } from '@/components/TradingCredentialsManager';
import { ComprehensiveFixTest } from '@/components/ComprehensiveFixTest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="system-validation">System Test</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="trading">Trading Tests</TabsTrigger>
            <TabsTrigger value="system">Legacy Tests</TabsTrigger>
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
          
          <TabsContent value="system-validation" className="space-y-6">
            <ComprehensiveFixTest />
          </TabsContent>
          
          <TabsContent value="auth" className="space-y-6">
            <AuthenticationTest />
          </TabsContent>
          
          <TabsContent value="credentials" className="space-y-6">
            <TradingCredentialsManager />
          </TabsContent>
          
          <TabsContent value="trading" className="space-y-6">
            <TradingSystemTest />
          </TabsContent>
          
          <TabsContent value="system" className="space-y-6">
            <SystemTestRunner />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Index;
