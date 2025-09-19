import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import SystemDiagnosticsReport from '@/components/SystemDiagnosticsReport';
import SystemTestPanel from '@/components/SystemTestPanel';
import { ErrorRecoveryPanel } from '@/components/ErrorRecoveryPanel';
import { SystemStatusSummary } from '@/components/SystemStatusSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SystemDiagnostics() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Comprehensive system health analysis and component testing
          </p>
        </div>
        
        <SystemStatusSummary />
        
        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="tests">Live Tests</TabsTrigger>
            <TabsTrigger value="recovery">Error Recovery</TabsTrigger>
          </TabsList>
          
          <TabsContent value="health" className="space-y-4">
            <SystemDiagnosticsReport />
          </TabsContent>
          
          <TabsContent value="tests" className="space-y-4">
            <SystemTestPanel />
          </TabsContent>
          
          <TabsContent value="recovery" className="space-y-4">
            <ErrorRecoveryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}